# Project Nexus Deployment Plan

## Overview
Deploy Project Nexus (全栈生产力管理平台) to server `47.121.31.221` using Docker Compose.

## Server Information
- **IP Address**: 47.121.31.221
- **SSH Access**: root@47.121.31.221
- **Password**: Abc131232111
- **Deployment Method**: Docker Compose

## Prerequisites
1. Server with Docker and Docker Compose installed
2. Open ports: 80 (HTTP), 443 (HTTPS), 3000 (App - internal)
3. Domain name (optional but recommended for production)

## Architecture
```
┌─────────────────────────────────────────────────┐
│                 Production Server                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Nginx     │  │   App       │  │   DB    │ │
│  │  Reverse    │◄─┤  Next.js    │◄─┤PostgreSQL│ │
│  │   Proxy     │  │  (Node.js)  │  │         │ │
│  │  Ports 80/443│  │  Port 3000 │  │ Port 5432│ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────┘
```

## Deployment Steps

### 1. Server Preparation
- [ ] Verify Docker and Docker Compose installation
- [ ] Install Nginx (for reverse proxy and SSL)
- [ ] Configure firewall (ufw/firewalld)
- [ ] Set up swap space if needed
- [ ] Create deployment directory structure

### 2. Project Setup on Server
- [ ] Clone or transfer project files to server
- [ ] Create production environment variables
- [ ] Configure Docker Compose for production
- [ ] Set up database volume persistence

### 3. Environment Configuration
**Required Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Production URL (e.g., https://yourdomain.com)
- `NEXTAUTH_SECRET`: Secure random string (generate with `openssl rand -base64 32`)
- `SUPER_ADMIN_KEY`: Secure admin key for production

**Optional Environment Variables:**
- `ALIYUN_OSS_*`: For image uploads
- `GOOGLE_CLIENT_ID/SECRET`: For Google OAuth
- `DEEPSEEK_API_KEY`: For AI summaries
- Other service integrations

### 4. Docker Deployment
```bash
# Build and start containers
cd deployment/docker
docker-compose up --build -d

# Run database migrations
docker-compose exec app npm run db:migrate

# Verify containers are running
docker-compose ps
```

### 5. Reverse Proxy & SSL Setup
- [ ] Configure Nginx as reverse proxy to port 3000
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure HTTP to HTTPS redirect
- [ ] Set up proper headers and security

### 6. Initial Data Setup
- [ ] Verify database connection
- [ ] Create initial admin user if needed
- [ ] Test basic functionality

### 7. Monitoring & Maintenance
- [ ] Set up log rotation
- [ ] Configure backup strategy for database
- [ ] Set up monitoring (optional)
- [ ] Create update/rollback procedures

## Security Considerations
1. **Change default passwords**: Database password, admin key
2. **Use HTTPS**: Always use SSL in production
3. **Regular updates**: Keep Docker images and system updated
4. **Backup strategy**: Regular database backups
5. **Access control**: Limit SSH access, use key-based authentication

## Troubleshooting
- **Container won't start**: Check logs with `docker-compose logs app`
- **Database connection issues**: Verify `DATABASE_URL` and network connectivity
- **App not accessible**: Check Nginx configuration and firewall rules
- **Migration failures**: Check Prisma schema compatibility

## Rollback Procedure
1. Stop current containers: `docker-compose down`
2. Restore previous version from backup
3. Start previous version: `docker-compose up -d`
4. Verify functionality

## Maintenance Tasks
- **Daily**: Check application logs for errors
- **Weekly**: Backup database
- **Monthly**: Update Docker images and dependencies
- **As needed**: Monitor disk space and performance

## Success Criteria
- [ ] Application accessible via HTTPS
- [ ] All core features working (timer, tasks, treasure gallery)
- [ ] Database persists across container restarts
- [ ] SSL certificate valid and auto-renewing
- [ ] Backups configured and tested

## Notes
- The project already has Docker Compose configuration in `deployment/docker/`
- Database uses volume persistence (`postgres_data`)
- Consider using `.env.production` for environment variables
- For high availability, consider database replication and load balancing

## Next Steps
1. SSH into server to assess current state
2. Install missing dependencies (Docker, Docker Compose, Nginx)
3. Begin step-by-step deployment following this plan