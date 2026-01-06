# Server Configuration Checklist

## Server: 47.121.31.221
**SSH**: root@47.121.31.221  
**Password**: Abc131232111

## 1. Initial Server Assessment
### [ ] Connect to server and check current state
```bash
ssh root@47.121.31.221
# Enter password: Abc131232111
```

### [ ] Check system information
```bash
# System info
uname -a
cat /etc/os-release

# Disk space
df -h

# Memory
free -h

# CPU
lscpu
```

### [ ] Check current services
```bash
# Check running services
systemctl list-units --type=service

# Check listening ports
ss -tulpn
```

## 2. Install Required Software
### [ ] Update system packages
```bash
apt update && apt upgrade -y
```

### [ ] Install Docker
```bash
# Install Docker
apt install -y docker.io docker-compose

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Verify installation
docker --version
docker-compose --version
```

### [ ] Install Nginx (for reverse proxy)
```bash
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx
```

### [ ] Install additional utilities
```bash
apt install -y curl wget git htop nano ufw
```

## 3. Configure Firewall
### [ ] Set up UFW (Uncomplicated Firewall)
```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Docker internal communication (if needed)
ufw allow 3000/tcp

# Check status
ufw status verbose
```

## 4. Create Deployment Directory Structure
### [ ] Create project directory
```bash
mkdir -p /opt/project-nexus
cd /opt/project-nexus

# Create subdirectories
mkdir -p deployment/docker
mkdir -p data/postgres
mkdir -p logs
mkdir -p backups
```

### [ ] Set proper permissions
```bash
chmod 755 /opt/project-nexus
```

## 5. System Optimization
### [ ] Configure swap space (if needed)
```bash
# Check current swap
swapon --show

# If no swap, create 2GB swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### [ ] Configure system limits for Docker
```bash
# Increase file descriptor limits
echo "fs.file-max = 100000" >> /etc/sysctl.conf
echo "vm.max_map_count = 262144" >> /etc/sysctl.conf
sysctl -p
```

## 6. Docker Configuration
### [ ] Configure Docker daemon (optional optimizations)
```bash
# Create Docker daemon config
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

# Restart Docker
systemctl restart docker
```

### [ ] Create Docker network (if needed)
```bash
docker network create project-nexus-network
```

## 7. Nginx Preparation
### [ ] Create Nginx site configuration directory
```bash
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
```

### [ ] Remove default site
```bash
rm -f /etc/nginx/sites-enabled/default
```

## 8. SSL Certificate Preparation (Optional)
### [ ] Install Certbot for Let's Encrypt
```bash
# For Ubuntu/Debian
apt install -y certbot python3-certbot-nginx

# Check Certbot
certbot --version
```

## 9. Backup Existing Configuration
### [ ] Backup current configurations
```bash
# Backup Nginx config
cp -r /etc/nginx /etc/nginx.backup.$(date +%Y%m%d)

# Backup Docker config
cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d)
```

## 10. Verification Checklist
### [ ] Verify all services are running
```bash
# Docker
systemctl status docker

# Nginx
systemctl status nginx

# Firewall
ufw status
```

### [ ] Test network connectivity
```bash
# Test external connectivity
curl -I https://google.com

# Test internal ports
nc -zv localhost 80
nc -zv localhost 443
```

### [ ] Verify disk space and memory
```bash
df -h /
free -h
```

## Troubleshooting Notes

### Common Issues:
1. **Docker permission denied**: Add user to docker group
   ```bash
   usermod -aG docker $USER
   newgrp docker
   ```

2. **Port already in use**: Check what's using the port
   ```bash
   ss -tulpn | grep :80
   ```

3. **Firewall blocking**: Check UFW rules
   ```bash
   ufw status numbered
   ```

4. **Nginx not starting**: Check configuration
   ```bash
   nginx -t
   ```

### Next Steps:
After completing this checklist, proceed to:
1. Transfer project files to server
2. Configure environment variables
3. Deploy Docker containers
4. Set up Nginx reverse proxy
5. Configure SSL certificates

## Completion Criteria
- [ ] Docker and Docker Compose installed and running
- [ ] Nginx installed and running
- [ ] Firewall configured (ports 22, 80, 443 open)
- [ ] Deployment directory created (/opt/project-nexus)
- [ ] System optimized (swap, limits)
- [ ] All services verified and working