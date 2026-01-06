# Nginx Reverse Proxy and SSL Configuration Guide

## Overview
This guide covers setting up Nginx as a reverse proxy for Project Nexus and configuring SSL certificates for secure HTTPS access.

## 1. Prerequisites

### [ ] Verify Nginx is installed
```bash
nginx -v
systemctl status nginx
```

### [ ] Check current Nginx configuration
```bash
# Test current configuration
nginx -t

# List enabled sites
ls -la /etc/nginx/sites-enabled/
```

### [ ] Verify Docker container is running
```bash
cd /opt/project-nexus/deployment/docker
docker-compose ps app

# Application should be accessible on port 3000
curl -I http://localhost:3000
```

## 2. Nginx Configuration

### Basic Reverse Proxy Configuration
Create `/etc/nginx/sites-available/project-nexus`:

```nginx
# Project Nexus - HTTP (redirects to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://$server_name$request_uri;
}

# Project Nexus - HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificate paths (will be filled by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Root location
    root /var/www/html;
    
    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_cache static_cache;
        proxy_cache_valid 200 302 60m;
        proxy_cache_valid 404 1m;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API endpoints - no caching
    location ~ ^/api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### [ ] Enable the site configuration
```bash
# Create symbolic link to sites-enabled
ln -s /etc/nginx/sites-available/project-nexus /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

## 3. SSL Certificate Setup

### Option A: Let's Encrypt with Certbot (Recommended)
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow interactive prompts:
# 1. Enter email for renewal notifications
# 2. Accept Terms of Service
# 3. Choose whether to redirect HTTP to HTTPS (choose 2 for redirect)
```

### Option B: Manual Certificate Installation
```bash
# Create directory for SSL certificates
mkdir -p /etc/nginx/ssl/yourdomain.com

# Copy your certificate files
cp your-certificate.crt /etc/nginx/ssl/yourdomain.com/
cp your-private-key.key /etc/nginx/ssl/yourdomain.com/

# Update Nginx configuration with correct paths
sed -i 's|ssl_certificate .*|ssl_certificate /etc/nginx/ssl/yourdomain.com/your-certificate.crt;|' /etc/nginx/sites-available/project-nexus
sed -i 's|ssl_certificate_key .*|ssl_certificate_key /etc/nginx/ssl/yourdomain.com/your-private-key.key;|' /etc/nginx/sites-available/project-nexus
```

### [ ] Test SSL configuration
```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check SSL Labs rating (external)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

## 4. Nginx Optimization

### [ ] Configure caching
Create `/etc/nginx/nginx.conf` optimizations:

```nginx
# Add to http block in /etc/nginx/nginx.conf
http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;
    
    # Cache settings
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=static_cache:10m inactive=60m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
    
    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### [ ] Configure logging
```bash
# Create log directory
mkdir -p /var/log/nginx/project-nexus

# Update Nginx configuration to use separate logs
cat >> /etc/nginx/sites-available/project-nexus << 'EOF'

    # Access and error logs
    access_log /var/log/nginx/project-nexus/access.log;
    error_log /var/log/nginx/project-nexus/error.log;
EOF
```

## 5. Firewall Configuration

### [ ] Update firewall rules
```bash
# Allow HTTPS
ufw allow 443/tcp

# Check firewall status
ufw status verbose

# Expected output:
# 443/tcp (HTTPS)           ALLOW       Anywhere
# 443/tcp (HTTPS (v6))      ALLOW       Anywhere (v6)
```

## 6. Verification Steps

### [ ] Test Nginx configuration
```bash
# Syntax check
nginx -t

# Test reverse proxy
curl -I https://yourdomain.com

# Test HTTP to HTTPS redirect
curl -I http://yourdomain.com
# Should return 301 redirect to HTTPS
```

### [ ] Test SSL certificate
```bash
# Check certificate validity
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Check certificate chain
echo | openssl s_client -connect yourdomain.com:443 -showcerts 2>/dev/null | openssl x509 -inform pem -noout -text | grep -A2 "Issuer:"
```

### [ ] Test application through proxy
```bash
# Test API endpoints
curl -k https://yourdomain.com/api/health

# Test static assets
curl -I https://yourdomain.com/favicon.ico
```

## 7. Troubleshooting

### Common Issues:

#### Issue 1: 502 Bad Gateway
```bash
# Check if Docker container is running
docker-compose ps app

# Check container logs
docker-compose logs app

# Test direct connection to app
curl http://localhost:3000

# Check Nginx error logs
tail -f /var/log/nginx/project-nexus/error.log
```

#### Issue 2: SSL certificate errors
```bash
# Check certificate permissions
ls -la /etc/letsencrypt/live/yourdomain.com/

# Renew certificate if expired
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal
```

#### Issue 3: Nginx won't start
```bash
# Check syntax
nginx -t

# Check for port conflicts
ss -tulpn | grep :443
ss -tulpn | grep :80

# Check error log
tail -f /var/log/nginx/error.log
```

## 8. Maintenance Scripts

### [ ] SSL certificate auto-renewal
```bash
# Create renewal script
cat > /etc/cron.weekly/renew-ssl-certificates << 'EOF'
#!/bin/bash
certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

chmod +x /etc/cron.weekly/renew-ssl-certificates

# Test renewal
certbot renew --dry-run
```

### [ ] Nginx log rotation
Create `/etc/logrotate.d/nginx-project-nexus`:
```bash
/var/log/nginx/project-nexus/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
```

## 9. Performance Monitoring

### [ ] Monitor Nginx performance
```bash
# Real-time monitoring
ngxtop

# Or with access log analysis
goaccess /var/log/nginx/project-nexus/access.log --log-format=COMBINED

# Check active connections
netstat -an | grep :443 | wc -l
```

### [ ] Set up monitoring alerts
```bash
# Simple monitoring script
cat > /usr/local/bin/monitor-nginx.sh << 'EOF'
#!/bin/bash
# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is not running!" | mail -s "Nginx Alert" admin@yourdomain.com
    systemctl restart nginx
fi

# Check SSL certificate expiry
DAYS_LEFT=$(echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates | grep -A1 "notAfter" | tail -1 | cut -d= -f2)
EXPIRY_DATE=$(date -d "$DAYS_LEFT" +%s)
CURRENT_DATE=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 7 ]; then
    echo "SSL certificate expires in $DAYS_UNTIL_EXPIRY days" | mail -s "SSL Expiry Alert" admin@yourdomain.com
fi
EOF

chmod +x /usr/local/bin/monitor-nginx.sh
```

## 10. Security Hardening

### [ ] Additional security headers
Add to Nginx configuration:
```nginx
# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### [ ] Rate limiting
```nginx
# Rate limiting configuration
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3000;
}

location /api/auth/ {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://localhost:3000;
}
```

## 11. Success Verification Checklist

### [ ] Complete Nginx and SSL verification
```bash
#!/bin/bash
# verify-nginx-ssl.sh

echo "=== Nginx and SSL Verification ==="

# 1. Nginx running
echo "1. Nginx status:"
systemctl is-active nginx && echo "✓ Nginx is running" || echo "✗ Nginx not running"

# 2. SSL certificate
echo "2. SSL certificate:"
if echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -checkend 86400; then
    echo "✓ SSL certificate valid for at least 1 day"
else
    echo "✗ SSL certificate expired or expiring soon"
fi

# 3. HTTP to HTTPS redirect
echo "3. HTTP to HTTPS redirect:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://yourdomain.com)
if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "✓ HTTP redirects to HTTPS"
else
    echo "✗ HTTP does not redirect (status: $HTTP_STATUS)"
fi

# 4. HTTPS access
echo "4. HTTPS access:"
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com)
if [ "$HTTPS_STATUS" = "200" ]; then
    echo "✓ HTTPS accessible"
else
    echo "✗ HTTPS not accessible (status: $HTTPS_STATUS)"
fi

# 5. Security headers
echo "5. Security headers:"
HEADERS=$(curl -sI https://yourdomain.com)
if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo "✓ HSTS header present"
else
    echo "✗ HSTS header missing"
fi

echo "=== Verification Complete ==="
```

## Next Steps
After successful Nginx and SSL configuration:
1. Test full application functionality through HTTPS
2. Set up monitoring and alerting
3. Configure backups
4. Document the deployment