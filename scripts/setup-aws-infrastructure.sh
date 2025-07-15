#!/bin/bash

# MOVIEGAME AWS Infrastructure Setup Script
# This script sets up the complete AWS infrastructure for MOVIEGAME deployment

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="moviegame"
ENVIRONMENT="production"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
KEY_NAME="${KEY_NAME:-moviegame-prod-key}"
DOMAIN_NAME="${DOMAIN_NAME:-yourdomain.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        log_warn "jq is not installed. Some features may not work properly."
    fi

    log_info "Prerequisites check passed"
}

# Create VPC and networking
create_vpc() {
    log_step "Creating VPC and networking components..."

    # Create VPC
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block 10.0.0.0/16 \
        --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_NAME-vpc},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'Vpc.VpcId' \
        --output text \
        --region $AWS_REGION)

    log_info "Created VPC: $VPC_ID"

    # Enable DNS hostnames
    aws ec2 modify-vpc-attribute \
        --vpc-id $VPC_ID \
        --enable-dns-hostnames \
        --region $AWS_REGION

    # Create Internet Gateway
    IGW_ID=$(aws ec2 create-internet-gateway \
        --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'InternetGateway.InternetGatewayId' \
        --output text \
        --region $AWS_REGION)

    log_info "Created Internet Gateway: $IGW_ID"

    # Attach Internet Gateway to VPC
    aws ec2 attach-internet-gateway \
        --internet-gateway-id $IGW_ID \
        --vpc-id $VPC_ID \
        --region $AWS_REGION

    # Create public subnet
    SUBNET_ID=$(aws ec2 create-subnet \
        --vpc-id $VPC_ID \
        --cidr-block 10.0.1.0/24 \
        --availability-zone ${AWS_REGION}a \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-subnet},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'Subnet.SubnetId' \
        --output text \
        --region $AWS_REGION)

    log_info "Created Subnet: $SUBNET_ID"

    # Enable auto-assign public IP
    aws ec2 modify-subnet-attribute \
        --subnet-id $SUBNET_ID \
        --map-public-ip-on-launch \
        --region $AWS_REGION

    # Create route table
    ROUTE_TABLE_ID=$(aws ec2 create-route-table \
        --vpc-id $VPC_ID \
        --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_NAME-public-rt},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'RouteTable.RouteTableId' \
        --output text \
        --region $AWS_REGION)

    log_info "Created Route Table: $ROUTE_TABLE_ID"

    # Create route to Internet Gateway
    aws ec2 create-route \
        --route-table-id $ROUTE_TABLE_ID \
        --destination-cidr-block 0.0.0.0/0 \
        --gateway-id $IGW_ID \
        --region $AWS_REGION

    # Associate route table with subnet
    aws ec2 associate-route-table \
        --route-table-id $ROUTE_TABLE_ID \
        --subnet-id $SUBNET_ID \
        --region $AWS_REGION

    # Store values for later use
    echo "VPC_ID=$VPC_ID" > aws-resources.env
    echo "SUBNET_ID=$SUBNET_ID" >> aws-resources.env
    echo "IGW_ID=$IGW_ID" >> aws-resources.env
    echo "ROUTE_TABLE_ID=$ROUTE_TABLE_ID" >> aws-resources.env

    log_info "VPC and networking setup completed"
}

# Create security groups
create_security_groups() {
    log_step "Creating security groups..."

    # Load VPC ID
    source aws-resources.env

    # Create security group for web servers
    SG_ID=$(aws ec2 create-security-group \
        --group-name $PROJECT_NAME-web-sg \
        --description "Security group for MOVIEGAME web servers" \
        --vpc-id $VPC_ID \
        --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$PROJECT_NAME-web-sg},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'GroupId' \
        --output text \
        --region $AWS_REGION)

    log_info "Created Security Group: $SG_ID"

    # Get your current IP for SSH access
    MY_IP=$(curl -s https://checkip.amazonaws.com)
    log_info "Your current IP: $MY_IP"

    # SSH access (restricted to your IP)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 22 \
        --cidr $MY_IP/32 \
        --region $AWS_REGION

    # HTTP access
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region $AWS_REGION

    # HTTPS access
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region $AWS_REGION

    # Backend API (internal only)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 5000 \
        --source-group $SG_ID \
        --region $AWS_REGION

    # Store security group ID
    echo "SG_ID=$SG_ID" >> aws-resources.env

    log_info "Security groups created successfully"
}

# Create key pair
create_key_pair() {
    log_step "Creating EC2 key pair..."

    # Check if key pair already exists
    if aws ec2 describe-key-pairs --key-names $KEY_NAME --region $AWS_REGION &> /dev/null; then
        log_warn "Key pair $KEY_NAME already exists"
        return
    fi

    # Create key pair
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --tag-specifications "ResourceType=key-pair,Tags=[{Key=Name,Value=$KEY_NAME},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'KeyMaterial' \
        --output text \
        --region $AWS_REGION > $KEY_NAME.pem

    # Set proper permissions
    chmod 400 $KEY_NAME.pem

    log_info "Created key pair: $KEY_NAME.pem"
    log_warn "Keep this key file safe! You'll need it to access your EC2 instance."
}

# Launch EC2 instance
launch_ec2_instance() {
    log_step "Launching EC2 instance..."

    # Load resource IDs
    source aws-resources.env

    # Get latest Amazon Linux 2 AMI
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text \
        --region $AWS_REGION)

    log_info "Using AMI: $AMI_ID"

    # Create user data script
    cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install additional tools
yum install -y git htop wget curl unzip

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# Create application directory
mkdir -p /opt/moviegame
chown ec2-user:ec2-user /opt/moviegame

# Create logs directory
mkdir -p /opt/moviegame/logs
chown ec2-user:ec2-user /opt/moviegame/logs

# Install Node.js (for debugging)
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Setup log rotation
cat > /etc/logrotate.d/moviegame << 'LOGROTATE'
/opt/moviegame/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
}
LOGROTATE

echo "EC2 setup completed" > /var/log/user-data.log
EOF

    # Launch instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SG_ID \
        --subnet-id $SUBNET_ID \
        --user-data file://user-data.sh \
        --block-device-mappings '[
            {
                "DeviceName": "/dev/xvda",
                "Ebs": {
                    "VolumeSize": 30,
                    "VolumeType": "gp3",
                    "DeleteOnTermination": true,
                    "Encrypted": true
                }
            }
        ]' \
        --tag-specifications "ResourceType=instance,Tags=[
            {Key=Name,Value=$PROJECT_NAME-$ENVIRONMENT},
            {Key=Environment,Value=$ENVIRONMENT},
            {Key=Application,Value=$PROJECT_NAME}
        ]" \
        --query 'Instances[0].InstanceId' \
        --output text \
        --region $AWS_REGION)

    log_info "Launched EC2 instance: $INSTANCE_ID"

    # Store instance ID
    echo "INSTANCE_ID=$INSTANCE_ID" >> aws-resources.env

    # Wait for instance to be running
    log_info "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $AWS_REGION

    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text \
        --region $AWS_REGION)

    echo "PUBLIC_IP=$PUBLIC_IP" >> aws-resources.env

    log_info "Instance is running. Public IP: $PUBLIC_IP"

    # Clean up user data script
    rm -f user-data.sh
}

# Allocate and associate Elastic IP
setup_elastic_ip() {
    log_step "Setting up Elastic IP..."

    # Load instance ID
    source aws-resources.env

    # Allocate Elastic IP
    ALLOCATION_ID=$(aws ec2 allocate-address \
        --domain vpc \
        --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$PROJECT_NAME-eip},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'AllocationId' \
        --output text \
        --region $AWS_REGION)

    log_info "Allocated Elastic IP: $ALLOCATION_ID"

    # Associate with instance
    aws ec2 associate-address \
        --instance-id $INSTANCE_ID \
        --allocation-id $ALLOCATION_ID \
        --region $AWS_REGION

    # Get Elastic IP address
    ELASTIC_IP=$(aws ec2 describe-addresses \
        --allocation-ids $ALLOCATION_ID \
        --query 'Addresses[0].PublicIp' \
        --output text \
        --region $AWS_REGION)

    echo "ELASTIC_IP=$ELASTIC_IP" >> aws-resources.env
    echo "ALLOCATION_ID=$ALLOCATION_ID" >> aws-resources.env

    log_info "Elastic IP associated: $ELASTIC_IP"
}

# Create ECR repositories
create_ecr_repositories() {
    log_step "Creating ECR repositories..."

    # Create backend repository
    aws ecr create-repository \
        --repository-name $PROJECT_NAME/backend \
        --image-tag-mutability MUTABLE \
        --region $AWS_REGION \
        --tags Key=Environment,Value=$ENVIRONMENT Key=Application,Value=$PROJECT_NAME || true

    # Create frontend repository
    aws ecr create-repository \
        --repository-name $PROJECT_NAME/frontend \
        --image-tag-mutability MUTABLE \
        --region $AWS_REGION \
        --tags Key=Environment,Value=$ENVIRONMENT Key=Application,Value=$PROJECT_NAME || true

    # Get repository URIs
    BACKEND_REPO_URI=$(aws ecr describe-repositories \
        --repository-names $PROJECT_NAME/backend \
        --query 'repositories[0].repositoryUri' \
        --output text \
        --region $AWS_REGION)

    FRONTEND_REPO_URI=$(aws ecr describe-repositories \
        --repository-names $PROJECT_NAME/frontend \
        --query 'repositories[0].repositoryUri' \
        --output text \
        --region $AWS_REGION)

    echo "BACKEND_REPO_URI=$BACKEND_REPO_URI" >> aws-resources.env
    echo "FRONTEND_REPO_URI=$FRONTEND_REPO_URI" >> aws-resources.env

    log_info "ECR repositories created"
}

# Show deployment summary
show_summary() {
    log_step "Infrastructure Setup Summary"

    source aws-resources.env

    echo ""
    echo "🎉 AWS Infrastructure setup completed!"
    echo ""
    echo "Resources Created:"
    echo "  🌐 VPC: $VPC_ID"
    echo "  🔒 Security Group: $SG_ID"
    echo "  🖥️  EC2 Instance: $INSTANCE_ID"
    echo "  🌍 Elastic IP: $ELASTIC_IP"
    echo "  🔑 Key Pair: $KEY_NAME.pem"
    echo "  📦 ECR Backend: $BACKEND_REPO_URI"
    echo "  📦 ECR Frontend: $FRONTEND_REPO_URI"
    echo ""
    echo "Next Steps:"
    echo "  1. Wait 2-3 minutes for EC2 instance to complete initialization"
    echo "  2. Test SSH connection: ssh -i $KEY_NAME.pem ec2-user@$ELASTIC_IP"
    echo "  3. Update your deployment script with REMOTE_HOST=$ELASTIC_IP"
    echo "  4. Run deployment: REMOTE_HOST=$ELASTIC_IP ./scripts/deploy.sh"
    echo ""
    echo "DNS Configuration (if using custom domain):"
    echo "  Create an A record pointing $DOMAIN_NAME to $ELASTIC_IP"
    echo ""
}

# Main function
main() {
    echo "🚀 Setting up AWS infrastructure for MOVIEGAME..."
    echo ""

    check_prerequisites
    create_vpc
    create_security_groups
    create_key_pair
    launch_ec2_instance
    setup_elastic_ip
    create_ecr_repositories
    show_summary
}

# Script usage
usage() {
    echo "MOVIEGAME AWS Infrastructure Setup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Environment Variables:"
    echo "  AWS_REGION      AWS region (default: us-east-1)"
    echo "  INSTANCE_TYPE   EC2 instance type (default: t3.medium)"
    echo "  KEY_NAME        EC2 key pair name (default: moviegame-prod-key)"
    echo "  DOMAIN_NAME     Your domain name (default: yourdomain.com)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Use defaults"
    echo "  AWS_REGION=us-west-2 $0              # Use different region"
    echo "  INSTANCE_TYPE=t3.large $0            # Use larger instance"
}

# Handle command line arguments
case "${1:-setup}" in
    "--help"|"help")
        usage
        ;;
    *)
        main "$@"
        ;;
esac
