# Environment Variables Configuration Guide

## Overview
This guide covers the configuration of environment variables for Project Nexus production deployment. Environment variables are critical for security and proper application functionality.

## 1. Environment Files Structure

### Production Environment Files:
```
/opt/project-nexus/
├── .env.production           # Application environment variables
└── deployment/docker/
    └── docker.env           # Docker Compose environment variables
```

## 2. Required Environment Variables

### Database Configuration (Essential)
```bash
# PostgreSQL Database Connection
DATABASE_URL="postgresql://username:password@db:5432/project_nexus?schema=public"

# Alternative connection string (for Prisma)
POSTGRES_PRISMA_URL="postgresql://username:password@db:5432/project_nexus?schema=public&pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://username:password@db:5432/project_nexus?schema=public"

# Docker Compose database variables (in docker.env)
POSTGRES_USER="project_nexus_user"
POSTGRES_PASSWORD="strong_password_here"  # CHANGE THIS
POSTGRES_DB="project_nexus"
```

### NextAuth Configuration (Essential)
```bash
# Production URL (change to your domain)
NEXTAUTH_URL="https://yourdomain.com"

# Secret for JWT encryption (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="generated_secret_here"

# Optional: Set to 'true' to enable debug logging
NEXTAUTH_DEBUG="false"
```

### Application Security
```bash
# Super admin key for administrative functions
SUPER_ADMIN_KEY="change_this_to_secure_random_string"

# Optional: Disable demo mode in production
NEXT_PUBLIC_DEMO_MODE="false"
```

## 3. Optional Service Integrations

### Google OAuth (Optional)
```bash
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Aliyun OSS Storage (Optional - for image uploads)
```bash
ALIYUN_OSS_ACCESS_KEY_ID="your-access-key-id"
ALIYUN_OSS_ACCESS_KEY_SECRET="your-access-key-secret"
ALIYUN_OSS_BUCKET="your-bucket-name"
ALIYUN_OSS_REGION="oss-cn-hangzhou"
ALIYUN_OSS_ENDPOINT="your-bucket.oss-cn-hangzhou.aliyuncs.com"
```

### DeepSeek AI API (Optional - for AI summaries)
```bash
DEEPSEEK_API_KEY="your-deepseek-api-key"
```

### Liveblocks (Optional - for real-time features)
```bash
LIVEBLOCKS_SECRET_KEY="your-liveblocks-secret-key"
```

## 4. Docker Compose Environment (docker.env)

Create `/opt/project-nexus/deployment/docker/docker.env`:

```bash
# PostgreSQL Database
POSTGRES_USER=project_nexus_user
POSTGRES_PASSWORD=strong_password_here  # CHANGE THIS
POSTGRES_DB=project_nexus

# Connection URLs
POSTGRES_PRISMA_URL=postgresql://project_nexus_user:strong_password_here@db:5432/project_nexus?schema=public&pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://project_nexus_user:strong_password_here@db:5432/project_nexus?schema=public

# Next.js Application
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generated_secret_here
SUPER_ADMIN_KEY=change_this_to_secure_random_string

# Optional Services (uncomment and fill as needed)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# DEEPSEEK_API_KEY=your-deepseek-api-key
```

## 5. Generation Scripts

### Generate Secure Secrets
```bash
#!/bin/bash
# generate-secrets.sh

echo "Generating secure environment variables..."

# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"

# Generate SUPER_ADMIN_KEY
SUPER_ADMIN_KEY=$(openssl rand -base64 32)
echo "SUPER_ADMIN_KEY=$SUPER_ADMIN_KEY"

# Generate database password
DB_PASSWORD=$(openssl rand -base64 16 | tr -d '/+=' | head -c 16)
echo "POSTGRES_PASSWORD=$DB_PASSWORD"

echo ""
echo "Copy these values to your docker.env file"
```

### Create Production Environment File
```bash
#!/bin/bash
# create-env-files.sh

cd /opt/project-nexus

# Create .env.production
cat > .env.production << EOF
# Production Environment Variables
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
SUPER_ADMIN_KEY=$(openssl rand -base64 32)
NEXT_PUBLIC_DEMO_MODE=false

# Database (will be overridden by docker-compose)
DATABASE_URL=postgresql://project_nexus_user:password@localhost:5432/project_nexus?schema=public

# Optional services (uncomment and configure as needed)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# DEEPSEEK_API_KEY=your-deepseek-api-key
# ALIYUN_OSS_ACCESS_KEY_ID=your-access-key-id
# ALIYUN_OSS_ACCESS_KEY_SECRET=your-access-key-secret
# ALIYUN_OSS_BUCKET=your-bucket-name
# ALIYUN_OSS_REGION=oss-cn-hangzhou
# ALIYUN_OSS_ENDPOINT=your-bucket.oss-cn-hangzhou.aliyuncs.com
EOF

echo "Created .env.production"
```

## 6. Security Best Practices

### [ ] Never commit secrets to version control
```bash
# Add to .gitignore
echo ".env*" >> .gitignore
echo "docker.env" >> .gitignore
```

### [ ] Set proper file permissions
```bash
# Restrict access to environment files
chmod 600 /opt/project-nexus/.env.production
chmod 600 /opt/project-nexus/deployment/docker/docker.env

# Set ownership
chown root:root /opt/project-nexus/.env.production
chown root:root /opt/project-nexus/deployment/docker/docker.env
```

### [ ] Use different secrets for different environments
- Development, Staging, and Production should have different secrets
- Never reuse passwords across environments

### [ ] Regular secret rotation
- Plan to rotate secrets periodically (every 90 days)
- Update database passwords and application secrets

## 7. Validation Checklist

### [ ] Verify all required variables are set
```bash
# Check for missing required variables
REQUIRED_VARS=("NEXTAUTH_URL" "NEXTAUTH_SECRET" "SUPER_ADMIN_KEY" "POSTGRES_PASSWORD")

for var in "${REQUIRED_VARS[@]}"; do
  if grep -q "^$var=" /opt/project-nexus/deployment/docker/docker.env; then
    echo "✓ $var is set"
  else
    echo "✗ $var is missing"
  fi
done
```

### [ ] Test database connection
```bash
# From within Docker container
docker-compose exec db psql -U project_nexus_user -d project_nexus -c "SELECT 1;"
```

### [ ] Validate NextAuth configuration
```bash
# Check if NEXTAUTH_URL is accessible
curl -I $(grep NEXTAUTH_URL /opt/project-nexus/deployment/docker/docker.env | cut -d= -f2)
```

## 8. Troubleshooting

### Common Issues:
1. **Database connection refused**: Check PostgreSQL is running and credentials are correct
2. **NEXTAUTH_URL mismatch**: Ensure URL matches exactly what users access
3. **Missing environment variables**: Application may fail silently

### Debugging:
```bash
# Check environment variables in running container
docker-compose exec app printenv | grep -E "(NEXTAUTH|DATABASE|POSTGRES)"

# View application logs for environment-related errors
docker-compose logs app | grep -i "env\|config\|secret"
```

## 9. Backup and Recovery

### [ ] Backup environment configuration
```bash
# Create backup of environment files
BACKUP_DIR="/opt/project-nexus/backups/env-$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
cp /opt/project-nexus/.env.production $BACKUP_DIR/
cp /opt/project-nexus/deployment/docker/docker.env $BACKUP_DIR/

# Encrypt backup if containing sensitive data
tar czf - $BACKUP_DIR | openssl enc -aes-256-cbc -salt -out /opt/backups/env-backup-$(date +%Y%m%d).tar.gz.enc
```

### [ ] Restore from backup
```bash
# Decrypt and restore
openssl enc -aes-256-cbc -d -in /opt/backups/env-backup-20250101.tar.gz.enc | tar xzf - -C /tmp
cp /tmp/backup/* /opt/project-nexus/deployment/docker/
```

## Next Steps
After configuring environment variables:
1. Build Docker containers with the new environment
2. Run database migrations
3. Test application functionality
4. Monitor logs for any configuration errors