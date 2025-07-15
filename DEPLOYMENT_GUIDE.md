# MOVIEGAME Application - Docker & AWS EC2 Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Docker Setup](#docker-setup)
4. [Environment Configuration](#environment-configuration)
5. [AWS EC2 Setup](#aws-ec2-setup)
6. [Deployment Process](#deployment-process)
7. [Production Considerations](#production-considerations)
8. [Monitoring & Logging](#monitoring--logging)
9. [Troubleshooting](#troubleshooting)
10. [CI/CD Pipeline](#cicd-pipeline)

## Overview

This guide provides a comprehensive approach to containerizing and deploying the MOVIEGAME application to AWS EC2. The application consists of:

- **Frontend**: React application built with Vite, served by Nginx
- **Backend**: Node.js/Express API server
- **Database**: Firebase Firestore (cloud-hosted)
- **Authentication**: Firebase Auth
- **External APIs**: Weather API, Movie DB API, ZenQuotes API

## Prerequisites

### Local Development
- Docker Desktop installed
- Docker Compose v2.0+
- AWS CLI configured
- Git
- Node.js 18+ (for local development)

### AWS Account Requirements
- AWS Account with appropriate permissions
- EC2 instance creation permissions
- Security Group management permissions
- Elastic IP allocation permissions (recommended)

## Docker Setup

### 1. Production-Optimized Dockerfiles

The current Dockerfiles are good but need optimization for production. Here are the enhanced versions:

#### Enhanced Backend Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:18-alpine AS base

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user early
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Remove sensitive files
RUN rm -f firebase-key.json.example && \
    rm -rf .git .gitignore README.md

USER nodejs

EXPOSE 5000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
```

#### Enhanced Frontend Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Build app with production optimizations
RUN npm run build

# Production stage
FROM nginx:1.25-alpine AS production

# Install security updates
RUN apk update && apk upgrade

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized nginx config
COPY nginx.prod.conf /etc/nginx/nginx.conf

# Create nginx user
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Switch to non-root user
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: moviegame-backend-prod
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=5000
    env_file:
      - .env.production
    volumes:
      - ./logs:/app/logs
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile
    container_name: moviegame-frontend-prod
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      backend:
        condition: service_healthy
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  logs:
    driver: local
```

## Environment Configuration

### 1. Environment Variables Structure

Create the following environment files:

#### `.env.production` (Backend)
```bash
# Application
NODE_ENV=production
PORT=5000
APP_URL=https://yourdomain.com

# Firebase Configuration
FIREBASE_PROJECT_ID=moviegame-9a57e
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@moviegame-9a57e.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token

# External APIs
WEATHER_API_KEY=07bfe9963ac94aa686693859252002
MOVIE_DB_API_KEY=your_movie_db_api_key

# Security
JWT_SECRET=your_super_secure_jwt_secret_here
CORS_ORIGIN=https://yourdomain.com

# Database (if using PostgreSQL in addition to Firebase)
DATABASE_URL=postgresql://username:password@localhost:5432/moviegame

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

#### `.env.frontend.production` (Frontend build-time)
```bash
VITE_API_URL=https://yourdomain.com/api
VITE_FIREBASE_API_KEY=AIzaSyAqbuTEIvKsjodC4rvDTtfS6gdcY4vmk44
VITE_FIREBASE_AUTH_DOMAIN=moviegame-9a57e.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=moviegame-9a57e
VITE_FIREBASE_STORAGE_BUCKET=moviegame-9a57e.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=151527639810
VITE_FIREBASE_APP_ID=11:151527639810:web:8f20331c368bdb2911901b
```

### 2. Secrets Management

For production, use AWS Systems Manager Parameter Store or AWS Secrets Manager:

```bash
# Store secrets in AWS Parameter Store
aws ssm put-parameter \
    --name "/moviegame/prod/firebase-private-key" \
    --value "$(cat firebase-key.json | jq -r .private_key)" \
    --type "SecureString" \
    --description "Firebase private key for MOVIEGAME production"

aws ssm put-parameter \
    --name "/moviegame/prod/jwt-secret" \
    --value "your_super_secure_jwt_secret" \
    --type "SecureString" \
    --description "JWT secret for MOVIEGAME production"

## AWS EC2 Setup

### 1. EC2 Instance Selection

**Recommended Instance Types:**
- **Development/Testing**: t3.small (2 vCPU, 2 GB RAM) - $15-20/month
- **Production (Small)**: t3.medium (2 vCPU, 4 GB RAM) - $30-35/month
- **Production (Medium)**: t3.large (2 vCPU, 8 GB RAM) - $60-70/month
- **Production (High Traffic)**: c5.large (2 vCPU, 4 GB RAM, optimized) - $70-80/month

**Storage Requirements:**
- Root Volume: 20-30 GB GP3 SSD
- Additional Volume: 10-20 GB for logs and data (optional)

### 2. Launch EC2 Instance

```bash
# Create key pair
aws ec2 create-key-pair \
    --key-name moviegame-prod-key \
    --query 'KeyMaterial' \
    --output text > moviegame-prod-key.pem

chmod 400 moviegame-prod-key.pem

# Launch instance
aws ec2 run-instances \
    --image-id ami-0c02fb55956c7d316 \
    --count 1 \
    --instance-type t3.medium \
    --key-name moviegame-prod-key \
    --security-group-ids sg-xxxxxxxxx \
    --subnet-id subnet-xxxxxxxxx \
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
    --tag-specifications 'ResourceType=instance,Tags=[
        {Key=Name,Value=MOVIEGAME-Production},
        {Key=Environment,Value=Production},
        {Key=Application,Value=MOVIEGAME}
    ]'
```

### 3. Security Group Configuration

Create security group with proper rules:

```bash
# Create security group
aws ec2 create-security-group \
    --group-name moviegame-prod-sg \
    --description "Security group for MOVIEGAME production"

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
    --group-names moviegame-prod-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# SSH access (restrict to your IP)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr YOUR_IP_ADDRESS/32

# HTTP access
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# HTTPS access
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Backend API (internal only)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 5000 \
    --source-group $SG_ID
```

### 4. Elastic IP (Recommended)

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance
aws ec2 associate-address \
    --instance-id i-xxxxxxxxx \
    --allocation-id eipalloc-xxxxxxxxx
```

### 5. Initial Server Setup

Connect to your EC2 instance and run the setup:

```bash
# Connect to EC2
ssh -i "moviegame-prod-key.pem" ec2-user@YOUR_ELASTIC_IP

# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install additional tools
sudo yum install -y git htop wget curl unzip

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Node.js (for debugging if needed)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Create application directory
sudo mkdir -p /opt/moviegame
sudo chown ec2-user:ec2-user /opt/moviegame

# Create logs directory
mkdir -p /opt/moviegame/logs
mkdir -p /opt/moviegame/ssl

# Logout and login again for docker group
exit
```

## Deployment Process

### 1. Prepare Production Files

Create optimized nginx configuration for production:

```bash
# Create nginx.prod.conf
cat > frontend/nginx.prod.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    server {
        listen 80;
        server_name _;
        root /usr/share/nginx/html;
        index index.html;

        # Security
        server_tokens off;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Static files with caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }

        # API proxy with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://backend:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Login endpoint with stricter rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;

            proxy_pass http://backend:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # React Router (SPA)
        location / {
            try_files $uri $uri/ /index.html;

            # Cache control for HTML
            location ~* \.html$ {
                expires -1;
                add_header Cache-Control "no-cache, no-store, must-revalidate";
            }
        }
    }

    # HTTPS server (uncomment when SSL is configured)
    # server {
    #     listen 443 ssl http2;
    #     server_name yourdomain.com;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #
    #     # SSL configuration
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    #     ssl_prefer_server_ciphers off;
    #
    #     # Include the same location blocks as above
    # }
}
EOF

### 2. Deployment Scripts

Create deployment automation scripts:

#### `deploy.sh` - Main deployment script
```bash
#!/bin/bash

set -e

# Configuration
REMOTE_HOST="YOUR_ELASTIC_IP"
REMOTE_USER="ec2-user"
KEY_FILE="moviegame-prod-key.pem"
APP_DIR="/opt/moviegame"
BACKUP_DIR="/opt/moviegame/backups"

echo "🚀 Starting MOVIEGAME deployment..."

# Create backup
echo "📦 Creating backup..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
    sudo mkdir -p $BACKUP_DIR
    sudo docker-compose -f $APP_DIR/docker-compose.prod.yml down || true
    sudo tar -czf $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz -C $APP_DIR . || true
    sudo find $BACKUP_DIR -name 'backup-*.tar.gz' -mtime +7 -delete || true
"

# Upload application files
echo "📤 Uploading application files..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude '.env*' \
    -e "ssh -i $KEY_FILE" \
    ./ "$REMOTE_USER@$REMOTE_HOST:$APP_DIR/"

# Upload environment files
echo "🔐 Uploading environment configuration..."
scp -i "$KEY_FILE" .env.production "$REMOTE_USER@$REMOTE_HOST:$APP_DIR/"

# Build and deploy
echo "🔨 Building and deploying containers..."
ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
    cd $APP_DIR

    # Pull latest base images
    sudo docker-compose -f docker-compose.prod.yml pull || true

    # Build application images
    sudo docker-compose -f docker-compose.prod.yml build --no-cache

    # Start services
    sudo docker-compose -f docker-compose.prod.yml up -d

    # Wait for services to be healthy
    echo 'Waiting for services to be healthy...'
    sleep 30

    # Check service status
    sudo docker-compose -f docker-compose.prod.yml ps

    # Test application
    curl -f http://localhost/health || echo 'Health check failed'
    curl -f http://localhost/api/quotes/random-quote || echo 'API test failed'
"

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be available at: http://$REMOTE_HOST"
```

#### `setup-ssl.sh` - SSL certificate setup
```bash
#!/bin/bash

set -e

DOMAIN="yourdomain.com"
EMAIL="your-email@example.com"
REMOTE_HOST="YOUR_ELASTIC_IP"
REMOTE_USER="ec2-user"
KEY_FILE="moviegame-prod-key.pem"

echo "🔒 Setting up SSL certificate for $DOMAIN..."

ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
    # Install Certbot
    sudo yum install -y python3-pip
    sudo pip3 install certbot certbot-nginx

    # Stop nginx temporarily
    sudo docker-compose -f /opt/moviegame/docker-compose.prod.yml stop frontend

    # Get certificate
    sudo certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN

    # Copy certificates to app directory
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/moviegame/ssl/cert.pem
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/moviegame/ssl/key.pem
    sudo chown ec2-user:ec2-user /opt/moviegame/ssl/*.pem

    # Update nginx config to enable HTTPS
    sed -i 's/# server {/server {/g' /opt/moviegame/frontend/nginx.prod.conf
    sed -i 's/# }/}/g' /opt/moviegame/frontend/nginx.prod.conf
    sed -i 's/# ssl_/ssl_/g' /opt/moviegame/frontend/nginx.prod.conf
    sed -i 's/# listen/listen/g' /opt/moviegame/frontend/nginx.prod.conf
    sed -i 's/# Include/# Include/g' /opt/moviegame/frontend/nginx.prod.conf

    # Rebuild and restart
    cd /opt/moviegame
    sudo docker-compose -f docker-compose.prod.yml build frontend
    sudo docker-compose -f docker-compose.prod.yml up -d

    # Setup auto-renewal
    echo '0 12 * * * /usr/local/bin/certbot renew --quiet' | sudo crontab -
"

echo "✅ SSL certificate setup completed!"
```

### 3. Transfer Methods

#### Option A: Docker Hub (Recommended for CI/CD)
```bash
# Build and push to Docker Hub
docker build -t yourusername/moviegame-backend:latest ./backend
docker build -t yourusername/moviegame-frontend:latest ./frontend

docker push yourusername/moviegame-backend:latest
docker push yourusername/moviegame-frontend:latest

# On EC2, pull and run
docker pull yourusername/moviegame-backend:latest
docker pull yourusername/moviegame-frontend:latest
```

#### Option B: AWS ECR (Recommended for AWS-native)
```bash
# Create ECR repositories
aws ecr create-repository --repository-name moviegame/backend
aws ecr create-repository --repository-name moviegame/frontend

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build, tag and push
docker build -t moviegame/backend ./backend
docker tag moviegame/backend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/moviegame/backend:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/moviegame/backend:latest

docker build -t moviegame/frontend ./frontend
docker tag moviegame/frontend:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/moviegame/frontend:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/moviegame/frontend:latest
```

#### Option C: Direct Build on EC2 (Simple but slower)
```bash
# Upload source code and build on server
rsync -avz --exclude 'node_modules' ./ ec2-user@YOUR_IP:/opt/moviegame/
ssh ec2-user@YOUR_IP "cd /opt/moviegame && sudo docker-compose -f docker-compose.prod.yml build"

## Production Considerations

### 1. Database Configuration

Since you're using Firebase Firestore, ensure proper configuration:

#### Backend Health Check Endpoint
Add to your `backend/server.js`:

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Firebase connection check
app.get('/health/firebase', async (req, res) => {
  try {
    // Test Firebase connection
    const testDoc = await db.collection('health').doc('test').get();
    res.status(200).json({ firebase: 'connected' });
  } catch (error) {
    res.status(500).json({ firebase: 'disconnected', error: error.message });
  }
});
```

### 2. Environment-Specific Configuration

#### Production Environment Variables
```bash
# Create .env.production with production values
NODE_ENV=production
PORT=5000
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com

# Firebase Admin SDK
FIREBASE_PROJECT_ID=moviegame-9a57e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@moviegame-9a57e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# External APIs with production keys
WEATHER_API_KEY=your_production_weather_api_key
MOVIE_DB_API_KEY=your_production_movie_db_api_key

# Security
JWT_SECRET=your_super_secure_production_jwt_secret
SESSION_SECRET=your_super_secure_session_secret
```

### 3. Logging Configuration

#### Enhanced Logging Setup
Create `backend/logger.js`:

```javascript
import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'moviegame-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'combined.log')
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 4. Auto-Restart Policies

#### Systemd Service (Alternative to Docker restart policies)
Create `/etc/systemd/system/moviegame.service`:

```ini
[Unit]
Description=MOVIEGAME Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/moviegame
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable moviegame.service
sudo systemctl start moviegame.service
```

### 5. Backup Strategies

#### Automated Backup Script
Create `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/moviegame/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup application data
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='backups' \
    /opt/moviegame/

# Backup Docker volumes
docker run --rm \
    -v moviegame_logs:/data \
    -v "$BACKUP_DIR:/backup" \
    alpine tar -czf "/backup/volumes_backup_$DATE.tar.gz" /data

# Export Firebase data (if needed)
# Note: Firebase Firestore has automatic backups, but you can export specific collections
# firebase firestore:export gs://your-backup-bucket/firestore-backup-$DATE

# Clean old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR/app_backup_$DATE.tar.gz" s3://your-backup-bucket/moviegame/

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /opt/moviegame/backup.sh >> /var/log/moviegame-backup.log 2>&1
```

## Monitoring & Logging

### 1. Application Monitoring

#### Docker Stats Monitoring
Create `monitor.sh`:

```bash
#!/bin/bash

# Monitor Docker containers
echo "=== Container Status ==="
docker-compose -f /opt/moviegame/docker-compose.prod.yml ps

echo -e "\n=== Container Stats ==="
docker stats --no-stream

echo -e "\n=== Disk Usage ==="
df -h

echo -e "\n=== Memory Usage ==="
free -h

echo -e "\n=== Application Health ==="
curl -s http://localhost/health | jq '.' || echo "Health check failed"
curl -s http://localhost/api/quotes/random-quote | jq '.' || echo "API test failed"

echo -e "\n=== Recent Logs ==="
docker-compose -f /opt/moviegame/docker-compose.prod.yml logs --tail=10
```

#### CloudWatch Integration (Optional)
Install CloudWatch agent:

```bash
# Download and install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Create CloudWatch config
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "metrics": {
    "namespace": "MOVIEGAME/Production",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/moviegame/logs/nginx/access.log",
            "log_group_name": "moviegame-nginx-access",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/opt/moviegame/logs/nginx/error.log",
            "log_group_name": "moviegame-nginx-error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

### 2. Log Management

#### Centralized Logging with ELK Stack (Optional)
For advanced logging, you can set up ELK stack:

```yaml
# Add to docker-compose.prod.yml
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - app-network

  logstash:
    image: docker.elastic.co/logstash/logstash:8.8.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
      - ./logs:/logs
    networks:
      - app-network
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - app-network
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## Troubleshooting

### 1. Common Issues and Solutions

#### Container Won't Start
```bash
# Check container logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache backend
docker-compose -f docker-compose.prod.yml up -d backend
```

#### Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Check Docker system usage
docker system df
docker system prune -f

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Network Connectivity Issues
```bash
# Test internal network
docker network ls
docker network inspect moviegame_app-network

# Test container connectivity
docker exec moviegame-frontend-prod ping backend
docker exec moviegame-backend-prod curl http://localhost:5000/health

# Check port bindings
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /opt/moviegame/ssl/cert.pem -text -noout

# Test SSL configuration
curl -I https://yourdomain.com
openssl s_client -connect yourdomain.com:443

# Renew certificate manually
sudo certbot renew --force-renewal
```

#### Firebase Connection Issues
```bash
# Test Firebase connectivity
docker exec moviegame-backend-prod curl http://localhost:5000/health/firebase

# Check Firebase credentials
docker exec moviegame-backend-prod env | grep FIREBASE

# Validate Firebase key format
echo $FIREBASE_PRIVATE_KEY | openssl rsa -check -noout
```

### 2. Performance Optimization

#### Database Optimization
```javascript
// Add connection pooling and caching
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes cache

// Cache frequently accessed data
app.get('/api/movies/popular', async (req, res) => {
  const cacheKey = 'popular_movies';
  const cached = cache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  // Fetch from API/database
  const movies = await fetchPopularMovies();
  cache.set(cacheKey, movies);
  res.json(movies);
});
```

#### Frontend Optimization
```javascript
// Add service worker for caching
// In frontend/public/sw.js
const CACHE_NAME = 'moviegame-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
```

### 3. Security Hardening

#### Additional Security Measures
```bash
# Install fail2ban for SSH protection
sudo yum install -y epel-release
sudo yum install -y fail2ban

# Configure fail2ban
sudo cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/secure
maxretry = 3
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Setup automatic security updates
sudo yum install -y yum-cron
sudo systemctl enable yum-cron
sudo systemctl start yum-cron

# Configure firewall
sudo yum install -y firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld

sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

## CI/CD Pipeline

### 1. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS EC2

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY_BACKEND: moviegame/backend
  ECR_REPOSITORY_FRONTEND: moviegame/frontend

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: |
          backend/package-lock.json
          frontend/package-lock.json

    - name: Install backend dependencies
      run: cd backend && npm ci

    - name: Install frontend dependencies
      run: cd frontend && npm ci

    - name: Run backend tests
      run: cd backend && npm test

    - name: Run frontend tests
      run: cd frontend && npm test

    - name: Build frontend
      run: cd frontend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build and push backend image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG ./backend
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG
        docker tag $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:latest
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_BACKEND:latest

    - name: Build and push frontend image
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG ./frontend
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG
        docker tag $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:latest
        docker push $ECR_REGISTRY/$ECR_REPOSITORY_FRONTEND:latest

    - name: Deploy to EC2
      env:
        PRIVATE_KEY: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
        HOST: ${{ secrets.EC2_HOST }}
        USER: ec2-user
      run: |
        echo "$PRIVATE_KEY" > private_key.pem
        chmod 600 private_key.pem

        ssh -i private_key.pem -o StrictHostKeyChecking=no $USER@$HOST '
          cd /opt/moviegame

          # Pull latest images
          aws ecr get-login-password --region us-east-1 | sudo docker login --username AWS --password-stdin ${{ steps.login-ecr.outputs.registry }}
          sudo docker-compose -f docker-compose.prod.yml pull

          # Deploy with zero downtime
          sudo docker-compose -f docker-compose.prod.yml up -d

          # Health check
          sleep 30
          curl -f http://localhost/health || exit 1
        '
```

### 2. Required GitHub Secrets

Add these secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `EC2_SSH_PRIVATE_KEY` (content of your .pem file)
- `EC2_HOST` (your EC2 public IP or domain)

### 3. Alternative: Simple Deployment Script

For simpler deployments without ECR:

```yaml
name: Simple Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.EC2_HOST }}
        username: ec2-user
        key: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
        script: |
          cd /opt/moviegame
          git pull origin main
          sudo docker-compose -f docker-compose.prod.yml build
          sudo docker-compose -f docker-compose.prod.yml up -d
          sleep 30
          curl -f http://localhost/health
```

## Quick Start Checklist

### Pre-deployment
- [ ] AWS account setup and CLI configured
- [ ] Domain name registered (optional but recommended)
- [ ] Firebase project configured
- [ ] Environment variables prepared
- [ ] SSL certificate plan (Let's Encrypt or purchased)

### Deployment Steps
1. [ ] Launch EC2 instance with security groups
2. [ ] Install Docker and Docker Compose
3. [ ] Upload application code and configuration
4. [ ] Set up environment variables and secrets
5. [ ] Build and start containers
6. [ ] Configure SSL certificate
7. [ ] Set up monitoring and backups
8. [ ] Test application functionality
9. [ ] Configure CI/CD pipeline (optional)

### Post-deployment
- [ ] Monitor application performance
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Test disaster recovery procedures
- [ ] Document operational procedures

---

## Support and Maintenance

### Regular Maintenance Tasks
- **Weekly**: Check application logs and performance metrics
- **Monthly**: Update Docker images and system packages
- **Quarterly**: Review and test backup/restore procedures
- **Annually**: Review security configurations and certificates

### Emergency Contacts
- AWS Support: [AWS Support Center](https://console.aws.amazon.com/support/)
- Firebase Support: [Firebase Support](https://firebase.google.com/support/)

For additional help, refer to the official documentation:
- [Docker Documentation](https://docs.docker.com/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Firebase Documentation](https://firebase.google.com/docs/)

---

*This guide provides a production-ready deployment strategy. Always test in a staging environment before deploying to production.*
```
```
```
```
