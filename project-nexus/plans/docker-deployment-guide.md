# Docker Container Deployment Guide

## Overview
This guide covers building and deploying Project Nexus using Docker Compose on the production server.

## 1. Pre-Deployment Checklist

### [ ] Verify environment is ready
```bash
# SSH to server
ssh root@47.121.31.221

# Check current directory
cd /opt/project-nexus
pwd

# Verify essential files exist
ls -la
ls -la deployment/docker/
```

### [ ] Check Docker and Docker Compose
```bash
# Verify Docker is running
docker --version
docker-compose --version
systemctl status docker

# Check available disk space
df -h /opt
```

### [ ] Review environment configuration
```bash
# Check docker.env file (don't show secrets in output)
head -n 5 deployment/docker/docker.env
echo "Environment file exists: $(wc -l deployment/docker/docker.env) lines"
```

## 2. Docker Compose Configuration

### Production docker-compose.yml
Ensure `/opt/project-nexus/deployment/docker/docker-compose.yml` exists:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    restart: always
    env_file:
      - docker.env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: ../..
      dockerfile: Dockerfile
      args:
        - POSTGRES_PRISMA_URL=${POSTGRES_PRISMA_URL}
        - POSTGRES_URL_NON_POOLING=${POSTGRES_URL_NON_POOLING}
    restart: always
    env_file:
      - docker.env
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ../../logs:/app/logs

volumes:
  postgres_data:
```

## 3. Building Docker Images

### [ ] Build application image
```bash
cd /opt/project-nexus/deployment/docker

# Build with cache (first time)
docker-compose build --no-cache app

# Or incremental build (subsequent deployments)
docker-compose build app

# Monitor build process
docker-compose build --progress=plain app
```

### [ ] Verify built images
```bash
# List Docker images
docker images | grep project-nexus

# Check image details
docker inspect project-nexus_app
```

## 4. Starting Containers

### [ ] Start all services
```bash
# Start in detached mode (background)
docker-compose up -d

# Watch logs during startup
docker-compose logs -f
```

### [ ] Verify containers are running
```bash
# Check container status
docker-compose ps

# Check individual containers
docker-compose ps app
docker-compose ps db

# Check container health
docker-compose exec db pg_isready -U project_nexus_user
```

## 5. Deployment Script

Create a deployment script for repeatable deployments:

```bash
#!/bin/bash
# deploy.sh - Project Nexus Deployment Script

set -e  # Exit on error

echo "=== Project Nexus Deployment ==="
echo "Timestamp: $(date)"
echo ""

cd /opt/project-nexus/deployment/docker

echo "1. Pulling latest changes (if using git)..."
# git pull origin main  # Uncomment if using git

echo "2. Building Docker images..."
docker-compose build app

echo "3. Stopping existing containers..."
docker-compose down

echo "4. Starting new containers..."
docker-compose up -d

echo "5. Waiting for services to be healthy..."
sleep 10

echo "6. Checking container status..."
docker-compose ps

echo "7. Viewing application logs..."
docker-compose logs app --tail=20

echo ""
echo "=== Deployment Complete ==="
echo "Application should be available at: http://localhost:3000"
echo "Check logs with: docker-compose logs -f app"
```

Make it executable:
```bash
chmod +x /opt/project-nexus/deploy.sh
```

## 6. Health Checks

### [ ] Application health check
```bash
# Check if application is responding
curl -f http://localhost:3000/api/health || echo "Health check failed"

# Check from within container
docker-compose exec app curl -f http://localhost:3000/api/health
```

### [ ] Database health check
```bash
# Check database connectivity from app container
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection failed:', err))
  .finally(() => prisma.$disconnect());
"
```

### [ ] Container resource monitoring
```bash
# Check container resource usage
docker stats --no-stream

# Check container logs for errors
docker-compose logs app --tail=50 | grep -i error
```

## 7. Troubleshooting Deployment Issues

### Common Issues and Solutions:

#### Issue 1: Build fails due to missing dependencies
```bash
# Clean build cache and rebuild
docker-compose build --no-cache app

# Check Dockerfile for errors
cd /opt/project-nexus
docker build -t project-nexus-test -f Dockerfile .
```

#### Issue 2: Container exits immediately
```bash
# Check exit code
docker-compose ps -a

# View logs of stopped container
docker-compose logs app

# Run container interactively to debug
docker-compose run --rm app sh
```

#### Issue 3: Database connection refused
```bash
# Check if database is running
docker-compose ps db

# Check database logs
docker-compose logs db

# Test database connection from host
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "SELECT 1;"
```

#### Issue 4: Port already in use
```bash
# Check what's using port 3000
ss -tulpn | grep :3000

# Stop conflicting service or change port in docker-compose.yml
```

## 8. Rolling Updates

### Zero-downtime deployment strategy:
```bash
#!/bin/bash
# rolling-update.sh

cd /opt/project-nexus/deployment/docker

# 1. Build new image with different tag
docker-compose build --no-cache app
NEW_IMAGE=$(docker images | grep project-nexus_app | head -1 | awk '{print $3}')

# 2. Create new container without stopping old
docker-compose up -d --no-deps --scale app=2 app

# 3. Wait for new container to be healthy
sleep 10
docker-compose exec -T app curl -f http://localhost:3000/api/health

# 4. Stop old container
docker-compose stop app
docker-compose rm -f app

# 5. Scale back to 1
docker-compose up -d --no-deps --scale app=1 app
```

## 9. Backup and Rollback

### [ ] Backup current deployment
```bash
#!/bin/bash
# backup-deployment.sh

BACKUP_DIR="/opt/backups/project-nexus-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

cd /opt/project-nexus/deployment/docker

echo "Backing up Docker Compose configuration..."
cp docker-compose.yml docker.env $BACKUP_DIR/

echo "Backing up database..."
docker-compose exec db pg_dump -U project_nexus_user project_nexus > $BACKUP_DIR/database-backup.sql

echo "Backing up application data..."
docker-compose cp app:/app/.next/static $BACKUP_DIR/static-backup/

echo "Creating backup archive..."
tar czf $BACKUP_DIR.tar.gz $BACKUP_DIR

echo "Backup complete: $BACKUP_DIR.tar.gz"
```

### [ ] Rollback procedure
```bash
#!/bin/bash
# rollback.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.tar.gz>"
  exit 1
fi

cd /opt/project-nexus/deployment/docker

echo "Stopping current deployment..."
docker-compose down

echo "Restoring from backup..."
tar xzf $BACKUP_FILE -C /tmp/backup-restore

echo "Restoring configuration..."
cp /tmp/backup-restore/*/docker-compose.yml .
cp /tmp/backup-restore/*/docker.env .

echo "Starting previous version..."
docker-compose up -d

echo "Restoring database..."
docker-compose exec -T db psql -U project_nexus_user -d project_nexus < /tmp/backup-restore/*/database-backup.sql

echo "Rollback complete"
```

## 10. Monitoring and Maintenance

### [ ] Set up log rotation
```bash
# Configure Docker log rotation
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

systemctl restart docker
```

### [ ] Regular maintenance tasks
```bash
# Clean up old Docker images
docker image prune -a --filter "until=24h"

# Clean up stopped containers
docker container prune

# Clean up volumes (be careful with data volumes)
docker volume prune
```

### [ ] Performance monitoring
```bash
# Monitor container performance
docker stats

# Check application response time
time curl -o /dev/null -s -w "%{http_code}\n" http://localhost:3000

# Monitor database performance
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "SELECT now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"
```

## 11. Success Verification

### [ ] Complete deployment verification checklist
```bash
#!/bin/bash
# verify-deployment.sh

echo "=== Deployment Verification ==="

# 1. Containers running
echo "1. Checking containers..."
docker-compose ps | grep -q "Up" || echo "Containers not running"

# 2. Application responding
echo "2. Checking application health..."
curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✓ Application responding" || echo "✗ Application not responding"

# 3. Database connected
echo "3. Checking database..."
docker-compose exec db pg_isready -U project_nexus_user -d project_nexus && echo "✓ Database connected" || echo "✗ Database not connected"

# 4. Logs error-free
echo "4. Checking for errors in logs..."
ERROR_COUNT=$(docker-compose logs app --tail=100 | grep -i error | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
  echo "✓ No errors in recent logs"
else
  echo "✗ Found $ERROR_COUNT errors in logs"
fi

echo "=== Verification Complete ==="
```

## Next Steps
After successful Docker deployment:
1. Run database migrations
2. Configure Nginx reverse proxy
3. Set up SSL certificates
4. Test full application functionality