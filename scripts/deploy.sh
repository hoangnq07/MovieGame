#!/bin/bash

# MOVIEGAME Production Deployment Script
# This script automates the deployment process to AWS EC2

set -e

# Configuration - Update these values for your deployment
REMOTE_HOST="${REMOTE_HOST:-YOUR_ELASTIC_IP}"
REMOTE_USER="${REMOTE_USER:-ec2-user}"
KEY_FILE="${KEY_FILE:-moviegame-prod-key.pem}"
APP_DIR="${APP_DIR:-/opt/moviegame}"
BACKUP_DIR="${BACKUP_DIR:-/opt/moviegame/backups}"
DOMAIN="${DOMAIN:-yourdomain.com}"

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

    # Check if key file exists
    if [ ! -f "$KEY_FILE" ]; then
        log_error "SSH key file $KEY_FILE not found"
        exit 1
    fi

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_error ".env.production file not found. Please create it first."
        log_info "You can use scripts/setup-secrets.sh to manage secrets"
        exit 1
    fi

    # Check if docker-compose.prod.yml exists
    if [ ! -f "docker-compose.prod.yml" ]; then
        log_error "docker-compose.prod.yml not found"
        exit 1
    fi

    # Test SSH connection
    if ! ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o BatchMode=yes "$REMOTE_USER@$REMOTE_HOST" exit 2>/dev/null; then
        log_error "Cannot connect to $REMOTE_HOST via SSH"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

# Create backup
create_backup() {
    log_step "Creating backup..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Create backup directory
        sudo mkdir -p $BACKUP_DIR

        # Stop services gracefully
        if [ -f $APP_DIR/docker-compose.prod.yml ]; then
            cd $APP_DIR
            sudo docker-compose -f docker-compose.prod.yml down --timeout 30 || true
        fi

        # Create application backup
        if [ -d $APP_DIR ]; then
            sudo tar -czf $BACKUP_DIR/app-backup-\$(date +%Y%m%d-%H%M%S).tar.gz \
                --exclude='node_modules' \
                --exclude='logs' \
                --exclude='backups' \
                --exclude='.git' \
                -C $APP_DIR . 2>/dev/null || true
        fi

        # Create Docker volumes backup
        sudo docker run --rm \
            -v moviegame_logs:/data:ro \
            -v $BACKUP_DIR:/backup \
            alpine tar -czf /backup/volumes-backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C /data . 2>/dev/null || true

        # Clean old backups (keep last 7 days)
        sudo find $BACKUP_DIR -name '*-backup-*.tar.gz' -mtime +7 -delete 2>/dev/null || true

        echo 'Backup completed'
    "

    log_info "Backup created successfully"
}

# Upload application files
upload_files() {
    log_step "Uploading application files..."

    # Create remote directory
    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "sudo mkdir -p $APP_DIR && sudo chown $REMOTE_USER:$REMOTE_USER $APP_DIR"

    # Upload application files
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '*.log' \
        --exclude 'logs/' \
        --exclude 'backups/' \
        --exclude '.env*' \
        --exclude 'secrets.json' \
        --exclude '*.pem' \
        --exclude '.DS_Store' \
        --exclude 'Thumbs.db' \
        -e "ssh -i $KEY_FILE" \
        ./ "$REMOTE_USER@$REMOTE_HOST:$APP_DIR/"

    # Upload environment file separately for security
    scp -i "$KEY_FILE" .env.production "$REMOTE_USER@$REMOTE_HOST:$APP_DIR/"

    # Set proper permissions
    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        chmod 600 $APP_DIR/.env.production
        chmod +x $APP_DIR/scripts/*.sh 2>/dev/null || true
    "

    log_info "Files uploaded successfully"
}

# Build and deploy containers
deploy_containers() {
    log_step "Building and deploying containers..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        cd $APP_DIR

        # Pull latest base images
        sudo docker-compose -f docker-compose.prod.yml pull 2>/dev/null || true

        # Build application images
        log_info 'Building Docker images...'
        sudo docker-compose -f docker-compose.prod.yml build --no-cache

        # Start services
        log_info 'Starting services...'
        sudo docker-compose -f docker-compose.prod.yml up -d

        # Wait for services to be healthy
        log_info 'Waiting for services to be healthy...'
        sleep 30

        # Check service status
        sudo docker-compose -f docker-compose.prod.yml ps
    "

    log_info "Containers deployed successfully"
}

# Health checks
run_health_checks() {
    log_step "Running health checks..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        cd $APP_DIR

        # Wait a bit more for services to fully start
        sleep 15

        # Check container health
        echo 'Container Status:'
        sudo docker-compose -f docker-compose.prod.yml ps

        # Test application endpoints
        echo 'Testing application health...'
        
        # Health check endpoint
        if curl -f -s http://localhost/health > /dev/null; then
            echo '✅ Health check endpoint: OK'
        else
            echo '❌ Health check endpoint: FAILED'
            exit 1
        fi

        # API test
        if curl -f -s http://localhost/api/quotes/random-quote > /dev/null; then
            echo '✅ API endpoint: OK'
        else
            echo '❌ API endpoint: FAILED'
            exit 1
        fi

        # Check logs for errors
        echo 'Recent logs:'
        sudo docker-compose -f docker-compose.prod.yml logs --tail=20

        echo 'Health checks completed successfully'
    "

    log_info "Health checks passed"
}

# Setup SSL certificate
setup_ssl() {
    if [ "$1" = "--ssl" ]; then
        log_step "Setting up SSL certificate..."

        ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
            # Install Certbot if not already installed
            if ! command -v certbot &> /dev/null; then
                sudo yum install -y python3-pip
                sudo pip3 install certbot
            fi

            # Stop frontend temporarily
            cd $APP_DIR
            sudo docker-compose -f docker-compose.prod.yml stop frontend

            # Get certificate
            sudo certbot certonly --standalone \
                --email admin@$DOMAIN \
                --agree-tos \
                --no-eff-email \
                -d $DOMAIN \
                --non-interactive || true

            # Copy certificates
            if [ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ]; then
                sudo mkdir -p $APP_DIR/ssl
                sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/ssl/cert.pem
                sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/ssl/key.pem
                sudo chown $REMOTE_USER:$REMOTE_USER $APP_DIR/ssl/*.pem
                echo 'SSL certificates installed'
            else
                echo 'SSL certificate installation failed'
            fi

            # Restart services
            sudo docker-compose -f docker-compose.prod.yml up -d
        "

        log_info "SSL setup completed"
    fi
}

# Cleanup old Docker resources
cleanup_docker() {
    log_step "Cleaning up Docker resources..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Remove unused images
        sudo docker image prune -f

        # Remove unused volumes
        sudo docker volume prune -f

        # Remove unused networks
        sudo docker network prune -f

        # Show disk usage
        echo 'Docker disk usage:'
        sudo docker system df
    "

    log_info "Docker cleanup completed"
}

# Show deployment summary
show_summary() {
    log_step "Deployment Summary"

    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "Application Details:"
    echo "  🌐 URL: http://$REMOTE_HOST"
    if [ "$1" = "--ssl" ]; then
        echo "  🔒 HTTPS: https://$DOMAIN"
    fi
    echo "  🖥️  Server: $REMOTE_USER@$REMOTE_HOST"
    echo "  📁 Directory: $APP_DIR"
    echo ""
    echo "Useful Commands:"
    echo "  📊 Check status: ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST 'cd $APP_DIR && sudo docker-compose -f docker-compose.prod.yml ps'"
    echo "  📋 View logs: ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST 'cd $APP_DIR && sudo docker-compose -f docker-compose.prod.yml logs -f'"
    echo "  🔄 Restart: ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST 'cd $APP_DIR && sudo docker-compose -f docker-compose.prod.yml restart'"
    echo ""
}

# Main deployment function
main() {
    echo "🚀 Starting MOVIEGAME deployment to $REMOTE_HOST..."
    echo ""

    check_prerequisites
    create_backup
    upload_files
    deploy_containers
    run_health_checks
    setup_ssl "$@"
    cleanup_docker
    show_summary "$@"
}

# Script usage
usage() {
    echo "MOVIEGAME Deployment Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --ssl     Setup SSL certificate with Let's Encrypt"
    echo "  --help    Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  REMOTE_HOST    EC2 instance IP or domain (default: YOUR_ELASTIC_IP)"
    echo "  REMOTE_USER    SSH username (default: ec2-user)"
    echo "  KEY_FILE       SSH private key file (default: moviegame-prod-key.pem)"
    echo "  APP_DIR        Application directory on server (default: /opt/moviegame)"
    echo "  DOMAIN         Domain name for SSL (default: yourdomain.com)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy without SSL"
    echo "  $0 --ssl             # Deploy with SSL setup"
    echo "  REMOTE_HOST=1.2.3.4 $0 --ssl  # Deploy to specific IP with SSL"
}

# Handle command line arguments
case "${1:-deploy}" in
    "--help"|"help")
        usage
        ;;
    *)
        main "$@"
        ;;
esac
