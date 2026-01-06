# Monitoring and Maintenance Procedures

## Overview
This guide provides comprehensive monitoring and maintenance procedures for the Project Nexus production deployment.

## 1. Monitoring Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Monitoring Stack                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  System  │  │  Docker  │  │  Nginx   │  │  App    │ │
│  │  Metrics │  │  Metrics │  │  Logs    │  │  Logs   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│         │           │           │            │          │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Centralized Logging                   │  │
│  │            (Optional: ELK/EFK Stack)             │  │
│  └──────────────────────────────────────────────────┘  │
│         │                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Alerting System                       │  │
│  │            (Email, Slack, PagerDuty)             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 2. Daily Monitoring Tasks

### [ ] System Health Check
```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Daily Health Check - $(date) ==="

# 1. System metrics
echo "1. System Metrics:"
echo "   Load average: $(uptime | awk -F'load average:' '{print $2}')"
echo "   Memory usage: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "   Disk usage: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"

# 2. Service status
echo "2. Service Status:"
services=("nginx" "docker")
for service in "${services[@]}"; do
  if systemctl is-active --quiet "$service"; then
    echo "   ✓ $service: Running"
  else
    echo "   ✗ $service: Stopped"
  fi
done

# 3. Docker containers
echo "3. Docker Containers:"
cd /opt/project-nexus/deployment/docker
docker-compose ps --all

# 4. Application health
echo "4. Application Health:"
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "   ✓ Application: Healthy"
else
  echo "   ✗ Application: Unhealthy"
fi

# 5. SSL certificate
echo "5. SSL Certificate:"
DAYS_LEFT=$(echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates | grep -A1 "notAfter" | tail -1 | cut -d= -f2)
EXPIRY_DATE=$(date -d "$DAYS_LEFT" +%s)
CURRENT_DATE=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))
echo "   Expires in: $DAYS_UNTIL_EXPIRY days"

echo "=== Check Complete ==="
```

### [ ] Log Review
```bash
# Check for errors in logs
grep -i "error\|exception\|failed" /var/log/nginx/project-nexus/error.log | tail -10

# Check application logs
cd /opt/project-nexus/deployment/docker
docker-compose logs app --since="24h" | grep -i "error\|warn" | tail -20

# Check database logs
docker-compose logs db --since="24h" | grep -i "error\|fatal" | tail -10
```

## 3. Weekly Maintenance Tasks

### [ ] Database Maintenance
```bash
#!/bin/bash
# weekly-db-maintenance.sh

echo "=== Weekly Database Maintenance - $(date) ==="

cd /opt/project-nexus/deployment/docker

# 1. Vacuum database
echo "1. Running VACUUM ANALYZE..."
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "VACUUM ANALYZE;"

# 2. Check for table bloat
echo "2. Checking table bloat..."
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"

# 3. Check for long-running queries
echo "3. Checking for long-running queries..."
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "
SELECT pid, age(clock_timestamp(), query_start), usename, query 
FROM pg_stat_activity 
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%' 
ORDER BY age(clock_timestamp(), query_start) DESC 
LIMIT 5;
"

echo "=== Maintenance Complete ==="
```

### [ ] Log Rotation and Cleanup
```bash
# Rotate logs
logrotate -f /etc/logrotate.d/nginx-project-nexus

# Clean up old Docker logs
find /var/lib/docker/containers -name "*.log" -type f -mtime +7 -delete

# Clean up old backups
find /opt/backups -name "*.tar.gz" -type f -mtime +30 -delete
```

## 4. Monthly Maintenance Tasks

### [ ] Security Updates
```bash
# Update system packages
apt update
apt list --upgradable

# Update Docker images
cd /opt/project-nexus/deployment/docker
docker-compose pull

# Check for security vulnerabilities
if command -v trivy &> /dev/null; then
  trivy image project-nexus_app:latest
fi
```

### [ ] Performance Review
```bash
# Generate performance report
cat > /opt/project-nexus/performance-report-$(date +%Y%m).md << EOF
# Monthly Performance Report - $(date +%B %Y)

## System Metrics
- Average load: $(uptime | awk -F'load average:' '{print $2}')
- Memory usage trend: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')
- Disk usage: $(df -h / | awk 'NR==2 {print $5}')

## Application Metrics
- Uptime: $(systemctl status nginx | grep "Active:" | awk '{print $6,$7}')
- Total requests: $(tail -1000 /var/log/nginx/project-nexus/access.log | wc -l)
- Error rate: $(grep -c " 5[0-9][0-9] " /var/log/nginx/project-nexus/access.log 2>/dev/null || echo "0")

## Database Metrics
$(cd /opt/project-nexus/deployment/docker && docker-compose exec db psql -U project_nexus_user -d project_nexus -c "
SELECT 
  schemaname || '.' || tablename as table,
  n_live_tup as rows,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;
" | tail -n +3)

## Recommendations
1. Continue current maintenance schedule
2. Consider scaling if traffic increases by 50%
3. Review backup retention policy
EOF
```

## 5. Alerting Configuration

### [ ] Basic Email Alerts
```bash
#!/bin/bash
# alert-monitor.sh

# Check critical services
CRITICAL_SERVICES=("nginx" "docker")
ALERT_EMAIL="admin@yourdomain.com"

for service in "${CRITICAL_SERVICES[@]}"; do
  if ! systemctl is-active --quiet "$service"; then
    echo "Service $service is down on $(hostname) at $(date)" | mail -s "ALERT: $service down" "$ALERT_EMAIL"
  fi
done

# Check disk space
DISK_USAGE=$(df / --output=pcent | tail -1 | tr -d '% ')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "Disk usage is at ${DISK_USAGE}% on $(hostname)" | mail -s "ALERT: High disk usage" "$ALERT_EMAIL"
fi

# Check SSL certificate
DAYS_LEFT=$(echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates | grep -A1 "notAfter" | tail -1 | cut -d= -f2)
EXPIRY_DATE=$(date -d "$DAYS_LEFT" +%s)
CURRENT_DATE=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))

if [ "$DAYS_UNTIL_EXPIRY" -lt 7 ]; then
  echo "SSL certificate expires in $DAYS_UNTIL_EXPIRY days on $(hostname)" | mail -s "ALERT: SSL certificate expiring" "$ALERT_EMAIL"
fi
```

### [ ] Cron Schedule for Monitoring
```bash
# Add to crontab
crontab -l > /tmp/cron.tmp
cat >> /tmp/cron.tmp << EOF
# Daily health check at 6 AM
0 6 * * * /opt/project-nexus/daily-health-check.sh >> /var/log/project-nexus/health-check.log 2>&1

# Alert monitoring every 5 minutes
*/5 * * * * /opt/project-nexus/alert-monitor.sh >> /var/log/project-nexus/alerts.log 2>&1

# Weekly database maintenance on Sunday at 2 AM
0 2 * * 0 /opt/project-nexus/weekly-db-maintenance.sh >> /var/log/project-nexus/db-maintenance.log 2>&1

# Monthly performance report on 1st of month at 3 AM
0 3 1 * * /opt/project-nexus/generate-performance-report.sh >> /var/log/project-nexus/performance.log 2>&1

# SSL certificate auto-renewal check daily at 4 AM
0 4 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
crontab /tmp/cron.tmp
rm /tmp/cron.tmp
```

## 6. Backup Procedures

### [ ] Database Backup Script
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/opt/backups/database"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db-backup-$DATE.dump"

mkdir -p "$BACKUP_DIR"

echo "Starting database backup at $(date)"

cd /opt/project-nexus/deployment/docker

# Create backup
docker-compose exec db pg_dump -U project_nexus_user \
  --format=custom \
  --file=/tmp/db-backup.dump \
  project_nexus

# Copy from container
docker cp $(docker-compose ps -q db):/tmp/db-backup.dump "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Keep only last 7 daily backups
find "$BACKUP_DIR" -name "*.dump.gz" -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
echo "Size: $(du -h "$BACKUP_FILE.gz" | cut -f1)"
```

### [ ] Application Backup Script
```bash
#!/bin/bash
# backup-application.sh

BACKUP_DIR="/opt/backups/application"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/app-backup-$DATE.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Starting application backup at $(date)"

# Backup configuration
tar czf "$BACKUP_FILE" \
  /opt/project-nexus/deployment/docker/docker-compose.yml \
  /opt/project-nexus/deployment/docker/docker.env \
  /opt/project-nexus/Dockerfile \
  /etc/nginx/sites-available/project-nexus

# Keep only last 30 daily backups
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
```

## 7. Disaster Recovery Procedures

### [ ] Recovery Checklist
1. **Service Failure**
   ```bash
   # Restart all services
   systemctl restart docker
   systemctl restart nginx
   cd /opt/project-nexus/deployment/docker && docker-compose up -d
   ```

2. **Database Corruption**
   ```bash
   # Stop application
   cd /opt/project-nexus/deployment/docker && docker-compose stop app
   
   # Restore from latest backup
   LATEST_BACKUP=$(ls -t /opt/backups/database/*.dump.gz | head -1)
   gunzip -c "$LATEST_BACKUP" | docker-compose exec -T db pg_restore -U project_nexus_user --clean --if-exists --dbname=project_nexus
   
   # Restart application
   docker-compose start app
   ```

3. **SSL Certificate Expiry**
   ```bash
   # Renew certificate
   certbot renew --force-renewal
   systemctl reload nginx
   ```

4. **Disk Full**
   ```bash
   # Clean up old files
   docker system prune -a -f
   journalctl --vacuum-time=7d
   rm -f /var/log/nginx/*.log.*
   ```

### [ ] Recovery Script
```bash
#!/bin/bash
# disaster-recovery.sh

echo "=== Disaster Recovery Procedure ==="
echo "Timestamp: $(date)"
echo ""

case "$1" in
  "service")
    echo "Recovering from service failure..."
    systemctl restart docker nginx
    cd /opt/project-nexus/deployment/docker && docker-compose up -d
    ;;
    
  "database")
    echo "Recovering from database corruption..."
    cd /opt/project-nexus/deployment/docker
    docker-compose stop app
    
    LATEST_BACKUP=$(ls -t /opt/backups/database/*.dump.gz | head -1)
    if [ -f "$LATEST_BACKUP" ]; then
      echo "Restoring from: $LATEST_BACKUP"
      gunzip -c "$LATEST_BACKUP" | docker-compose exec -T db pg_restore -U project_nexus_user --clean --if-exists --dbname=project_nexus
    else
      echo "No backup found. Recreating database..."
      docker-compose exec db psql -U project_nexus_user -d project_nexus -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
      docker-compose exec app npx prisma migrate deploy
    fi
    
    docker-compose start app
    ;;
    
  "ssl")
    echo "Renewing SSL certificate..."
    certbot renew --force-renewal
    systemctl reload nginx
    ;;
    
  "disk")
    echo "Cleaning up disk space..."
    docker system prune -a -f
    journalctl --vacuum-time=7d
    find /var/log -name "*.log.*" -type f -mtime +7 -delete
    ;;
    
  *)
    echo "Usage: $0 {service|database|ssl|disk}"
    exit 1
    ;;
esac

echo "Recovery procedure completed."
```

## 8. Performance Optimization

### [ ] Nginx Optimization
```nginx
# /etc/nginx/nginx.conf optimizations
events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    # Buffer optimizations
    client_body_buffer_size 10K;
    client_header_buffer_size 1k;
    client_max_body_size 100M;
    large_client_header_buffers 4 8k;
    
    # Timeout optimizations
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 65;
    send_timeout 10;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_comp_level 5;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rss+xml
        application/vnd.geo+json
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/bmp
        image