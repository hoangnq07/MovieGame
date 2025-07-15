#!/bin/bash

# MOVIEGAME AWS Secrets Manager Setup Script
# This script helps you securely store and retrieve secrets for production deployment

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
SECRET_NAME="moviegame/production"
PARAMETER_PREFIX="/moviegame/prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if AWS CLI is installed and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi

    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi

    log_info "AWS CLI is properly configured"
}

# Create secrets in AWS Secrets Manager
create_secrets_manager() {
    log_info "Creating secrets in AWS Secrets Manager..."

    # Check if secret already exists
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" &> /dev/null; then
        log_warn "Secret $SECRET_NAME already exists. Updating..."
        
        # Update existing secret
        aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --region "$AWS_REGION" \
            --secret-string file://secrets.json
    else
        # Create new secret
        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --region "$AWS_REGION" \
            --description "MOVIEGAME Production Secrets" \
            --secret-string file://secrets.json
    fi

    log_info "Secrets stored in AWS Secrets Manager: $SECRET_NAME"
}

# Create parameters in AWS Systems Manager Parameter Store
create_parameter_store() {
    log_info "Creating parameters in AWS Systems Manager Parameter Store..."

    # Read secrets from JSON file
    if [ ! -f "secrets.json" ]; then
        log_error "secrets.json file not found. Please create it first."
        exit 1
    fi

    # Extract and store individual parameters
    while IFS= read -r line; do
        if [[ $line =~ \"([^\"]+)\":[[:space:]]*\"([^\"]+)\" ]]; then
            key="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            
            # Skip empty values
            if [ -z "$value" ]; then
                continue
            fi

            parameter_name="$PARAMETER_PREFIX/$key"
            
            log_info "Storing parameter: $parameter_name"
            
            aws ssm put-parameter \
                --name "$parameter_name" \
                --value "$value" \
                --type "SecureString" \
                --description "MOVIEGAME production parameter: $key" \
                --overwrite \
                --region "$AWS_REGION" > /dev/null
        fi
    done < secrets.json

    log_info "Parameters stored in AWS Systems Manager Parameter Store"
}

# Generate secrets.json template
generate_secrets_template() {
    log_info "Generating secrets.json template..."

    cat > secrets.json << 'EOF'
{
  "JWT_SECRET": "REPLACE_WITH_STRONG_JWT_SECRET",
  "SESSION_SECRET": "REPLACE_WITH_STRONG_SESSION_SECRET",
  "FIREBASE_PRIVATE_KEY": "REPLACE_WITH_FIREBASE_PRIVATE_KEY",
  "FIREBASE_PRIVATE_KEY_ID": "REPLACE_WITH_FIREBASE_PRIVATE_KEY_ID",
  "FIREBASE_CLIENT_EMAIL": "REPLACE_WITH_FIREBASE_CLIENT_EMAIL",
  "FIREBASE_CLIENT_ID": "REPLACE_WITH_FIREBASE_CLIENT_ID",
  "WEATHER_API_KEY": "REPLACE_WITH_WEATHER_API_KEY",
  "MOVIE_DB_API_KEY": "REPLACE_WITH_MOVIE_DB_API_KEY",
  "DATABASE_PASSWORD": "REPLACE_WITH_DATABASE_PASSWORD",
  "REDIS_PASSWORD": "REPLACE_WITH_REDIS_PASSWORD",
  "SMTP_PASS": "REPLACE_WITH_SMTP_PASSWORD",
  "AWS_ACCESS_KEY_ID": "REPLACE_WITH_AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY": "REPLACE_WITH_AWS_SECRET_ACCESS_KEY",
  "SENTRY_DSN": "REPLACE_WITH_SENTRY_DSN",
  "NEW_RELIC_LICENSE_KEY": "REPLACE_WITH_NEW_RELIC_LICENSE_KEY"
}
EOF

    log_warn "Please edit secrets.json and replace all placeholder values with actual secrets"
    log_warn "Then run this script again with the 'store' command"
}

# Retrieve secrets from AWS and create .env file
retrieve_secrets() {
    log_info "Retrieving secrets from AWS..."

    # Create .env.production file
    cat > .env.production << 'EOF'
# MOVIEGAME Production Environment - Generated from AWS Secrets
NODE_ENV=production
PORT=5000
APP_URL=https://yourdomain.com
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
EOF

    # Retrieve from Parameter Store
    log_info "Retrieving parameters from Parameter Store..."
    
    parameters=$(aws ssm get-parameters-by-path \
        --path "$PARAMETER_PREFIX" \
        --recursive \
        --with-decryption \
        --region "$AWS_REGION" \
        --query 'Parameters[*].[Name,Value]' \
        --output text)

    while IFS=$'\t' read -r name value; do
        # Extract parameter name without prefix
        param_name=$(echo "$name" | sed "s|$PARAMETER_PREFIX/||")
        echo "$param_name=$value" >> .env.production
    done <<< "$parameters"

    log_info ".env.production file created successfully"
}

# Generate strong secrets
generate_strong_secrets() {
    log_info "Generating strong secrets..."

    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    log_info "Generated JWT_SECRET: $JWT_SECRET"
    log_info "Generated SESSION_SECRET: $SESSION_SECRET"
    
    # Update secrets.json if it exists
    if [ -f "secrets.json" ]; then
        # Use jq to update the JSON file
        if command -v jq &> /dev/null; then
            jq --arg jwt "$JWT_SECRET" --arg session "$SESSION_SECRET" \
               '.JWT_SECRET = $jwt | .SESSION_SECRET = $session' \
               secrets.json > secrets.json.tmp && mv secrets.json.tmp secrets.json
            log_info "Updated secrets.json with generated secrets"
        else
            log_warn "jq not found. Please manually update secrets.json with the generated secrets above"
        fi
    fi
}

# Main script logic
case "${1:-help}" in
    "template")
        generate_secrets_template
        ;;
    "generate")
        generate_strong_secrets
        ;;
    "store")
        check_aws_cli
        if [ ! -f "secrets.json" ]; then
            log_error "secrets.json not found. Run '$0 template' first."
            exit 1
        fi
        create_parameter_store
        create_secrets_manager
        ;;
    "retrieve")
        check_aws_cli
        retrieve_secrets
        ;;
    "help"|*)
        echo "MOVIEGAME Secrets Management Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  template  - Generate secrets.json template"
        echo "  generate  - Generate strong JWT and session secrets"
        echo "  store     - Store secrets in AWS (Secrets Manager + Parameter Store)"
        echo "  retrieve  - Retrieve secrets from AWS and create .env.production"
        echo "  help      - Show this help message"
        echo ""
        echo "Workflow:"
        echo "  1. Run '$0 template' to create secrets.json template"
        echo "  2. Edit secrets.json with your actual secret values"
        echo "  3. Run '$0 generate' to generate strong secrets"
        echo "  4. Run '$0 store' to upload secrets to AWS"
        echo "  5. On your EC2 instance, run '$0 retrieve' to download secrets"
        ;;
esac
