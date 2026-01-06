# File Transfer and SSH Setup Guide

## SSH Connection Details
- **Server**: 47.121.31.221
- **Username**: root
- **Password**: Abc131232111
- **Port**: 22 (default)

## 1. Initial SSH Connection Test
### [ ] Test basic SSH connectivity
```bash
# Test SSH connection
ssh root@47.121.31.221
# Enter password when prompted: Abc131232111

# If connection successful, you should see server prompt
exit
```

### [ ] Troubleshoot SSH connection issues
```bash
# Check if SSH service is running on server (if you can't connect)
# From local machine, check if port 22 is open
nc -zv 47.121.31.221 22

# If connection refused, server may not have SSH running
# Contact server administrator
```

## 2. SSH Key Authentication (Recommended)
### [ ] Generate SSH key pair (on local machine)
```bash
# Generate RSA key pair
ssh-keygen -t rsa -b 4096 -C "project-nexus-deployment"

# Location: ~/.ssh/id_rsa_project_nexus
# Passphrase: (optional but recommended)
```

### [ ] Copy public key to server
```bash
# Method 1: Using ssh-copy-id
ssh-copy-id -i ~/.ssh/id_rsa_project_nexus.pub root@47.121.31.221

# Method 2: Manual copy
cat ~/.ssh/id_rsa_project_nexus.pub | ssh root@47.121.31.221 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### [ ] Test key-based authentication
```bash
ssh -i ~/.ssh/id_rsa_project_nexus root@47.121.31.221
# Should connect without password prompt
```

### [ ] Configure SSH config for easier access
```bash
# Edit ~/.ssh/config on local machine
cat >> ~/.ssh/config << EOF
Host project-nexus-server
    HostName 47.121.31.221
    User root
    IdentityFile ~/.ssh/id_rsa_project_nexus
    Port 22
EOF

# Now connect with alias
ssh project-nexus-server
```

## 3. File Transfer Methods

### Option A: SCP (Simple Copy)
```bash
# Copy entire project directory to server
scp -r . root@47.121.31.221:/opt/project-nexus/

# Copy specific directories
scp -r deployment/ root@47.121.31.221:/opt/project-nexus/
scp -r app/ root@47.121.31.221:/opt/project-nexus/
scp -r lib/ root@47.121.31.221:/opt/project-nexus/

# Copy configuration files
scp package.json root@47.121.31.221:/opt/project-nexus/
scp docker-compose.yml root@47.121.31.221:/opt/project-nexus/deployment/docker/
scp Dockerfile root@47.121.31.221:/opt/project-nexus/
```

### Option B: Rsync (Recommended for incremental updates)
```bash
# Sync entire project (exclude node_modules, .next, etc.)
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  ./ root@47.121.31.221:/opt/project-nexus/

# Dry run first (see what will be transferred)
rsync -avz --dry-run --exclude='node_modules' --exclude='.next' \
  ./ root@47.121.31.221:/opt/project-nexus/
```

### Option C: Git Clone (if server has git access)
```bash
# SSH to server and clone directly
ssh root@47.121.31.221
cd /opt/project-nexus
git clone <repository-url> .
# Note: Need to handle sensitive files (.env) separately
```

## 4. Required Files Checklist
### Essential Project Files:
- [ ] `package.json` - Dependencies and scripts
- [ ] `package-lock.json` or `pnpm-lock.yaml` - Lock file
- [ ] `Dockerfile` - Container build instructions
- [ ] `docker-compose.yml` - Multi-container orchestration
- [ ] `next.config.ts` - Next.js configuration
- [ ] `tailwind.config.ts` - Tailwind CSS configuration
- [ ] `tsconfig.json` - TypeScript configuration

### Source Code:
- [ ] `app/` - Next.js app directory
- [ ] `lib/` - Utility libraries
- [ ] `prisma/` - Database schema and migrations
- [ ] `public/` - Static assets
- [ ] `config/` - Configuration files

### Deployment Configuration:
- [ ] `deployment/docker/` - Docker deployment files
- [ ] `deployment/docker/docker.env` - Environment variables template
- [ ] Any existing deployment scripts

## 5. File Transfer Script
Create a transfer script for convenience:

```bash
#!/bin/bash
# transfer-project.sh
SERVER="root@47.121.31.221"
DEST="/opt/project-nexus"

echo "Transferring Project Nexus to $SERVER:$DEST"

# Create directory structure on server
ssh $SERVER "mkdir -p $DEST/deployment/docker"

# Transfer essential files
scp package.json package-lock.json $SERVER:$DEST/
scp Dockerfile $SERVER:$DEST/
scp docker-compose.yml $SERVER:$DEST/deployment/docker/
scp -r deployment/docker/docker.env $SERVER:$DEST/deployment/docker/

# Transfer source code (excluding large directories)
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='.git' \
  --exclude='*.log' --exclude='*.tmp' \
  ./ $SERVER:$DEST/

echo "Transfer complete!"
```

## 6. Verification Steps
### [ ] Verify files on server
```bash
ssh root@47.121.31.221 "ls -la /opt/project-nexus/"

# Check key directories
ssh root@47.121.31.221 "ls -la /opt/project-nexus/app/"
ssh root@47.121.31.221 "ls -la /opt/project-nexus/deployment/docker/"
```

### [ ] Verify file permissions
```bash
ssh root@47.121.31.221 "find /opt/project-nexus -type f -name '*.sh' -exec chmod +x {} \;"
```

### [ ] Check disk space after transfer
```bash
ssh root@47.121.31.221 "df -h /opt"
```

## 7. Security Considerations
### [ ] Remove sensitive files from transfer
```bash
# Do NOT transfer these files:
# - .env (contains secrets)
# - .env.local
# - Any file with API keys or passwords
```

### [ ] Set proper permissions on server
```bash
ssh root@47.121.31.221 "chmod 600 /opt/project-nexus/deployment/docker/docker.env"
ssh root@47.121.31.221 "chown -R root:root /opt/project-nexus"
```

### [ ] Clean up transfer artifacts
```bash
# Remove any temporary files
ssh root@47.121.31.221 "find /opt/project-nexus -name '*.tmp' -delete"
```

## 8. Troubleshooting
### Common Issues:
1. **Permission denied during SCP**: Check SSH key authentication
2. **Connection timeout**: Check firewall and network connectivity
3. **Disk space full**: Clean up old files before transfer
4. **File corruption**: Use checksums to verify
   ```bash
   # Generate checksum locally
   md5sum important-file.txt
   
   # Verify on server
   ssh root@47.121.31.221 "md5sum /opt/project-nexus/important-file.txt"
   ```

### Transfer Speed Optimization:
```bash
# Use compression
scp -C -r ./ root@47.121.31.221:/opt/project-nexus/

# Use parallel transfers (for multiple files)
# Or use tar piped through ssh
tar czf - . | ssh root@47.121.31.221 "cd /opt/project-nexus && tar xzf -"
```

## Next Steps
After successful file transfer:
1. Configure environment variables on server
2. Build Docker images
3. Start containers
4. Run database migrations
5. Configure Nginx reverse proxy