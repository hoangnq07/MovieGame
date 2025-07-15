#!/bin/bash

# MOVIEGAME Monitoring and Logging Setup Script
# This script sets up comprehensive monitoring, logging, and alerting for production

set -e

# Configuration
REMOTE_HOST="${REMOTE_HOST:-YOUR_ELASTIC_IP}"
REMOTE_USER="${REMOTE_USER:-ec2-user}"
KEY_FILE="${KEY_FILE:-moviegame-prod-key.pem}"
APP_DIR="${APP_DIR:-/opt/moviegame}"
EMAIL="${EMAIL:-admin@yourdomain.com}"

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

# Setup CloudWatch monitoring
setup_cloudwatch() {
    log_step "Setting up CloudWatch monitoring..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Download and install CloudWatch agent
        wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
        sudo rpm -U ./amazon-cloudwatch-agent.rpm

        # Create CloudWatch configuration
        sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc

        cat > /tmp/cloudwatch-config.json << 'EOF'
{
  \"agent\": {
    \"metrics_collection_interval\": 60,
    \"run_as_user\": \"cwagent\"
  },
  \"metrics\": {
    \"namespace\": \"MOVIEGAME/Production\",
    \"metrics_collected\": {
      \"cpu\": {
        \"measurement\": [
          \"cpu_usage_idle\",
          \"cpu_usage_iowait\",
          \"cpu_usage_user\",
          \"cpu_usage_system\"
        ],
        \"metrics_collection_interval\": 60,
        \"totalcpu\": false
      },
      \"disk\": {
        \"measurement\": [
          \"used_percent\"
        ],
        \"metrics_collection_interval\": 60,
        \"resources\": [
          \"*\"
        ]
      },
      \"diskio\": {
        \"measurement\": [
          \"io_time\"
        ],
        \"metrics_collection_interval\": 60,
        \"resources\": [
          \"*\"
        ]
      },
      \"mem\": {
        \"measurement\": [
          \"mem_used_percent\"
        ],
        \"metrics_collection_interval\": 60
      },
      \"netstat\": {
        \"measurement\": [
          \"tcp_established\",
          \"tcp_time_wait\"
        ],
        \"metrics_collection_interval\": 60
      },
      \"swap\": {
        \"measurement\": [
          \"swap_used_percent\"
        ],
        \"metrics_collection_interval\": 60
      }
    }
  },
  \"logs\": {
    \"logs_collected\": {
      \"files\": {
        \"collect_list\": [
          {
            \"file_path\": \"$APP_DIR/logs/nginx/access.log\",
            \"log_group_name\": \"moviegame-nginx-access\",
            \"log_stream_name\": \"{instance_id}\",
            \"timezone\": \"UTC\"
          },
          {
            \"file_path\": \"$APP_DIR/logs/nginx/error.log\",
            \"log_group_name\": \"moviegame-nginx-error\",
            \"log_stream_name\": \"{instance_id}\",
            \"timezone\": \"UTC\"
          },
          {
            \"file_path\": \"/var/log/docker\",
            \"log_group_name\": \"moviegame-docker\",
            \"log_stream_name\": \"{instance_id}\",
            \"timezone\": \"UTC\"
          },
          {
            \"file_path\": \"/var/log/messages\",
            \"log_group_name\": \"moviegame-system\",
            \"log_stream_name\": \"{instance_id}\",
            \"timezone\": \"UTC\"
          }
        ]
      }
    }
  }
}
EOF

        sudo mv /tmp/cloudwatch-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

        # Start CloudWatch agent
        sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
            -a fetch-config \
            -m ec2 \
            -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
            -s

        # Enable CloudWatch agent to start on boot
        sudo systemctl enable amazon-cloudwatch-agent

        echo 'CloudWatch agent setup completed'
    "

    log_info "CloudWatch monitoring setup completed"
}

# Setup log rotation
setup_log_rotation() {
    log_step "Setting up log rotation..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Create logrotate configuration for MOVIEGAME
        sudo cat > /etc/logrotate.d/moviegame << 'EOF'
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        # Restart nginx to reopen log files
        cd $APP_DIR && sudo docker-compose -f docker-compose.prod.yml exec frontend nginx -s reopen 2>/dev/null || true
    endscript
}

$APP_DIR/logs/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        cd $APP_DIR && sudo docker-compose -f docker-compose.prod.yml exec frontend nginx -s reopen 2>/dev/null || true
    endscript
}

/var/log/docker {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF

        # Test logrotate configuration
        sudo logrotate -d /etc/logrotate.d/moviegame

        echo 'Log rotation setup completed'
    "

    log_info "Log rotation setup completed"
}

# Setup backup automation
setup_backup_automation() {
    log_step "Setting up automated backups..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Create backup script
        cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR=\"$APP_DIR/backups\"
DATE=\$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p \"\$BACKUP_DIR\"

# Backup application data
tar -czf \"\$BACKUP_DIR/app_backup_\$DATE.tar.gz\" \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='backups' \
    --exclude='.git' \
    -C $APP_DIR .

# Backup Docker volumes
sudo docker run --rm \
    -v moviegame_logs:/data:ro \
    -v \"\$BACKUP_DIR:/backup\" \
    alpine tar -czf \"/backup/volumes_backup_\$DATE.tar.gz\" -C /data . 2>/dev/null || true

# Clean old backups
find \"\$BACKUP_DIR\" -name \"*_backup_*.tar.gz\" -mtime +\$RETENTION_DAYS -delete

# Log backup completion
echo \"\$(date): Backup completed - \$DATE\" >> $APP_DIR/logs/backup.log

# Optional: Upload to S3
# aws s3 cp \"\$BACKUP_DIR/app_backup_\$DATE.tar.gz\" s3://your-backup-bucket/moviegame/

echo \"Backup completed: \$DATE\"
EOF

        chmod +x $APP_DIR/backup.sh

        # Add to crontab for daily backups at 2 AM
        (crontab -l 2>/dev/null; echo '0 2 * * * $APP_DIR/backup.sh >> $APP_DIR/logs/backup.log 2>&1') | crontab -

        echo 'Backup automation setup completed'
    "

    log_info "Backup automation setup completed"
}

# Setup health monitoring
setup_health_monitoring() {
    log_step "Setting up health monitoring..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Create health check script
        cat > $APP_DIR/health-check.sh << 'EOF'
#!/bin/bash

APP_URL=\"http://localhost\"
API_URL=\"http://localhost/api/quotes/random-quote\"
LOG_FILE=\"$APP_DIR/logs/health-check.log\"
EMAIL=\"$EMAIL\"

# Function to log with timestamp
log_message() {
    echo \"\$(date '+%Y-%m-%d %H:%M:%S'): \$1\" >> \"\$LOG_FILE\"
}

# Function to send alert (requires mail command)
send_alert() {
    local subject=\"\$1\"
    local message=\"\$2\"
    
    # Log the alert
    log_message \"ALERT: \$subject - \$message\"
    
    # Send email if mail command is available
    if command -v mail &> /dev/null; then
        echo \"\$message\" | mail -s \"MOVIEGAME Alert: \$subject\" \"\$EMAIL\"
    fi
    
    # You can add other notification methods here (Slack, Discord, etc.)
}

# Check application health
check_health() {
    if curl -f -s \"\$APP_URL/health\" > /dev/null; then
        log_message \"Health check: OK\"
        return 0
    else
        send_alert \"Health Check Failed\" \"Application health check endpoint is not responding\"
        return 1
    fi
}

# Check API functionality
check_api() {
    if curl -f -s \"\$API_URL\" > /dev/null; then
        log_message \"API check: OK\"
        return 0
    else
        send_alert \"API Check Failed\" \"API endpoint is not responding\"
        return 1
    fi
}

# Check Docker containers
check_containers() {
    cd $APP_DIR
    if sudo docker-compose -f docker-compose.prod.yml ps | grep -q \"Up\"; then
        log_message \"Container check: OK\"
        return 0
    else
        send_alert \"Container Check Failed\" \"One or more Docker containers are not running\"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    DISK_USAGE=\$(df / | awk 'NR==2 {print \$5}' | sed 's/%//')
    if [ \"\$DISK_USAGE\" -gt 80 ]; then
        send_alert \"High Disk Usage\" \"Disk usage is at \${DISK_USAGE}%\"
        return 1
    else
        log_message \"Disk usage: \${DISK_USAGE}% - OK\"
        return 0
    fi
}

# Check memory usage
check_memory() {
    MEMORY_USAGE=\$(free | awk 'NR==2{printf \"%.0f\", \$3*100/\$2}')
    if [ \"\$MEMORY_USAGE\" -gt 90 ]; then
        send_alert \"High Memory Usage\" \"Memory usage is at \${MEMORY_USAGE}%\"
        return 1
    else
        log_message \"Memory usage: \${MEMORY_USAGE}% - OK\"
        return 0
    fi
}

# Run all checks
log_message \"Starting health checks\"
check_health
check_api
check_containers
check_disk_space
check_memory
log_message \"Health checks completed\"
EOF

        chmod +x $APP_DIR/health-check.sh

        # Add to crontab for checks every 5 minutes
        (crontab -l 2>/dev/null; echo '*/5 * * * * $APP_DIR/health-check.sh') | crontab -

        echo 'Health monitoring setup completed'
    "

    log_info "Health monitoring setup completed"
}

# Setup system monitoring dashboard
setup_monitoring_dashboard() {
    log_step "Setting up monitoring dashboard..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Create monitoring dashboard script
        cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash

clear
echo \"=== MOVIEGAME Production Monitoring Dashboard ===\"
echo \"Last updated: \$(date)\"
echo \"\"

# System Information
echo \"=== System Information ===\"
echo \"Hostname: \$(hostname)\"
echo \"Uptime: \$(uptime | awk '{print \$3, \$4}' | sed 's/,//')\"
echo \"Load Average: \$(uptime | awk -F'load average:' '{print \$2}')\"
echo \"\"

# Memory Usage
echo \"=== Memory Usage ===\"
free -h
echo \"\"

# Disk Usage
echo \"=== Disk Usage ===\"
df -h | grep -E '^/dev/'
echo \"\"

# Docker Container Status
echo \"=== Docker Container Status ===\"
cd $APP_DIR
sudo docker-compose -f docker-compose.prod.yml ps
echo \"\"

# Docker Stats
echo \"=== Docker Resource Usage ===\"
sudo docker stats --no-stream --format \"table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}\"
echo \"\"

# Application Health
echo \"=== Application Health ===\"
if curl -f -s http://localhost/health > /dev/null; then
    echo \"✅ Application: Healthy\"
else
    echo \"❌ Application: Unhealthy\"
fi

if curl -f -s http://localhost/api/quotes/random-quote > /dev/null; then
    echo \"✅ API: Responding\"
else
    echo \"❌ API: Not responding\"
fi
echo \"\"

# Recent Logs
echo \"=== Recent Application Logs (last 10 lines) ===\"
sudo docker-compose -f docker-compose.prod.yml logs --tail=10
echo \"\"

# Network Connections
echo \"=== Active Network Connections ===\"
netstat -tuln | grep -E ':(80|443|5000)'
echo \"\"

echo \"=== End of Dashboard ===\"
EOF

        chmod +x $APP_DIR/monitor.sh

        echo 'Monitoring dashboard setup completed'
    "

    log_info "Monitoring dashboard setup completed"
}

# Install additional monitoring tools
install_monitoring_tools() {
    log_step "Installing additional monitoring tools..."

    ssh -i "$KEY_FILE" "$REMOTE_USER@$REMOTE_HOST" "
        # Install htop for better process monitoring
        sudo yum install -y htop

        # Install iotop for I/O monitoring
        sudo yum install -y iotop

        # Install netstat for network monitoring
        sudo yum install -y net-tools

        # Install mail command for alerts
        sudo yum install -y mailx

        # Install jq for JSON processing
        sudo yum install -y jq

        echo 'Additional monitoring tools installed'
    "

    log_info "Additional monitoring tools installed"
}

# Show monitoring summary
show_summary() {
    log_step "Monitoring Setup Summary"

    echo ""
    echo "🎉 Monitoring and logging setup completed!"
    echo ""
    echo "Monitoring Features Configured:"
    echo "  📊 CloudWatch metrics and logs"
    echo "  🔄 Automated log rotation"
    echo "  💾 Daily automated backups"
    echo "  ❤️  Health checks every 5 minutes"
    echo "  📈 System monitoring dashboard"
    echo ""
    echo "Useful Commands:"
    echo "  📊 View dashboard: ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST '$APP_DIR/monitor.sh'"
    echo "  🔍 Check health: ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST '$APP_DIR/health-check.sh'"
    echo "  💾 Manual backup: ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST '$APP_DIR/backup.sh'"
    echo "  📋 View logs: ssh -i $KEY_FILE $REMOTE_USER@$REMOTE_HOST 'cd $APP_DIR && sudo docker-compose -f docker-compose.prod.yml logs -f'"
    echo ""
    echo "CloudWatch Log Groups:"
    echo "  - moviegame-nginx-access"
    echo "  - moviegame-nginx-error"
    echo "  - moviegame-docker"
    echo "  - moviegame-system"
    echo ""
    echo "Automated Tasks:"
    echo "  - Health checks: Every 5 minutes"
    echo "  - Backups: Daily at 2:00 AM"
    echo "  - Log rotation: Daily"
    echo ""
}

# Main function
main() {
    echo "🔧 Setting up monitoring and logging for MOVIEGAME..."
    echo ""

    setup_cloudwatch
    setup_log_rotation
    setup_backup_automation
    setup_health_monitoring
    setup_monitoring_dashboard
    install_monitoring_tools
    show_summary
}

# Script usage
usage() {
    echo "MOVIEGAME Monitoring Setup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Environment Variables:"
    echo "  REMOTE_HOST    EC2 instance IP (default: YOUR_ELASTIC_IP)"
    echo "  REMOTE_USER    SSH username (default: ec2-user)"
    echo "  KEY_FILE       SSH private key file (default: moviegame-prod-key.pem)"
    echo "  APP_DIR        Application directory (default: /opt/moviegame)"
    echo "  EMAIL          Email for alerts (default: admin@yourdomain.com)"
    echo ""
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
