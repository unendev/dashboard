# Deployment Testing and Verification Guide

## Overview
This guide provides comprehensive testing procedures to verify that Project Nexus is fully functional after deployment.

## 1. Pre-Testing Checklist

### [ ] Verify all services are running
```bash
# SSH to server
ssh root@47.121.31.221

# Check all services
systemctl status nginx
systemctl status docker

cd /opt/project-nexus/deployment/docker
docker-compose ps

# Expected output:
# NAME                      SERVICE   STATUS        PORTS
# project-nexus-app-1       app       Up 5 minutes  0.0.0.0:3000->3000/tcp
# project-nexus-db-1        db        Up 5 minutes  5432/tcp
```

### [ ] Verify network accessibility
```bash
# Check if ports are open
ss -tulpn | grep -E ':80|:443|:3000'

# Test external connectivity
curl -I https://google.com
```

## 2. Basic Health Checks

### [ ] Application health endpoint
```bash
# Test application health
curl -f https://yourdomain.com/api/health
# Expected: HTTP 200 OK with JSON response

# Alternative: Direct to container
curl -f http://localhost:3000/api/health
```

### [ ] Database health check
```bash
# Test database connection
cd /opt/project-nexus/deployment/docker
docker-compose exec db pg_isready -U project_nexus_user -d project_nexus
# Expected: accepting connections
```

### [ ] Nginx health check
```bash
# Test Nginx status
systemctl status nginx

# Test Nginx configuration
nginx -t
```

## 3. Functional Testing

### Core Feature Tests

#### [ ] User Authentication
```bash
# Test authentication endpoints
curl -X POST https://yourdomain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# Note: May need valid credentials

# Test session
curl -I https://yourdomain.com/api/auth/session \
  -H "Cookie: next-auth.session-token=test"
```

#### [ ] Timer System
```bash
# Test timer API endpoints
curl -X GET https://yourdomain.com/api/timer-tasks \
  -H "Content-Type: application/json"

# Create test timer (if authenticated)
curl -X POST https://yourdomain.com/api/timer-tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"title":"Test Timer","category":"testing"}'
```

#### [ ] Todo Management
```bash
# Test todo endpoints
curl -X GET https://yourdomain.com/api/todos \
  -H "Content-Type: application/json"
```

#### [ ] Treasure Gallery
```bash
# Test treasure endpoints
curl -X GET https://yourdomain.com/api/treasures \
  -H "Content-Type: application/json"
```

### [ ] Static Assets
```bash
# Test static file delivery
curl -I https://yourdomain.com/favicon.ico
# Expected: HTTP 200 with proper content-type

curl -I https://yourdomain.com/next.svg
curl -I https://yourdomain.com/vercel.svg
```

### [ ] API Documentation
```bash
# Test API documentation if available
curl -I https://yourdomain.com/api-docs
```

## 4. Performance Testing

### [ ] Response time testing
```bash
# Test homepage load time
time curl -o /dev/null -s -w "Total: %{time_total}s\n" https://yourdomain.com/

# Test API response time
time curl -o /dev/null -s -w "API: %{time_total}s\n" https://yourdomain.com/api/health
```

### [ ] Concurrent connections
```bash
# Simple load test with Apache Bench
if command -v ab &> /dev/null; then
  ab -n 100 -c 10 https://yourdomain.com/
fi

# Alternative with hey
if command -v hey &> /dev/null; then
  hey -n 100 -c 10 https://yourdomain.com/
fi
```

### [ ] Memory and CPU usage
```bash
# Monitor container resources
docker stats --no-stream

# Check Nginx worker processes
ps aux | grep nginx | grep -v grep

# Check system load
uptime
top -bn1 | head -20
```

## 5. Security Testing

### [ ] SSL/TLS configuration
```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A2 "Validity"

# Check for weak ciphers
nmap --script ssl-enum-ciphers -p 443 yourdomain.com
```

### [ ] Security headers
```bash
# Check security headers
curl -sI https://yourdomain.com | grep -i "security\|hsts\|csp\|x-frame\|x-content"

# Expected headers:
# Strict-Transport-Security
# X-Frame-Options
# X-Content-Type-Options
# X-XSS-Protection
# Content-Security-Policy
```

### [ ] Common vulnerabilities
```bash
# Check for directory listing
curl -I https://yourdomain.com/.env
curl -I https://yourdomain.com/.git/
curl -I https://yourdomain.com/phpinfo.php

# Test for common paths (should return 404)
curl -I https://yourdomain.com/admin
curl -I https://yourdomain.com/backup
curl -I https://yourdomain.com/wp-admin
```

## 6. Integration Testing

### [ ] Database integration
```bash
# Test database read/write
cd /opt/project-nexus/deployment/docker
docker-compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Test connection
    await prisma.\$connect();
    console.log('✓ Database connection successful');
    
    // Test read
    const userCount = await prisma.user.count();
    console.log(\`✓ User count: \${userCount}\`);
    
    // Test write (if possible)
    // const testUser = await prisma.user.create({ data: { email: 'test@test.com', name: 'Test' } });
    // console.log(\`✓ Test user created: \${testUser.id}\`);
    
  } catch (error) {
    console.error('✗ Database test failed:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}
test();
"
```

### [ ] File upload testing (if OSS configured)
```bash
# Test file upload endpoint
if [ -f test-upload.jpg ]; then
  curl -X POST https://yourdomain.com/api/upload \
    -F "file=@test-upload.jpg" \
    -H "Authorization: Bearer token"
fi
```

### [ ] External API integrations
```bash
# Test DeepSeek AI integration (if configured)
curl -X POST https://yourdomain.com/api/ai-summary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"text":"Test summary request"}'
```

## 7. User Interface Testing

### [ ] Browser accessibility
```bash
# Test with curl for basic HTML
curl -s https://yourdomain.com/ | grep -o "<title>[^<]*</title>"

# Expected: <title>Project Nexus</title> or similar
```

### [ ] JavaScript loading
```bash
# Check if JS bundles are loading
curl -s https://yourdomain.com/ | grep -o "src=\"[^\"]*\.js\""

# Check for Next.js runtime
curl -I https://yourdomain.com/_next/static/
```

### [ ] CSS loading
```bash
# Check if CSS is loading
curl -s https://yourdomain.com/ | grep -o "href=\"[^\"]*\.css\""
```

## 8. Error Handling Testing

### [ ] Test 404 pages
```bash
# Test non-existent page
curl -I https://yourdomain.com/nonexistent-page
# Expected: HTTP 404

# Test with API
curl -I https://yourdomain.com/api/nonexistent-endpoint
```

### [ ] Test 500 error handling
```bash
# Try to trigger server error (if possible)
curl -X POST https://yourdomain.com/api/test-error \
  -H "Content-Type: application/json" \
  -d '{"trigger":"error"}'
# Should return proper error response, not crash
```

### [ ] Test rate limiting
```bash
# Test rate limiting (if configured)
for i in {1..11}; do
  curl -I https://yourdomain.com/api/auth/login 2>/dev/null | grep "429\|Rate limit"
done
# After 10 requests, should get 429
```

## 9. Monitoring and Logging Verification

### [ ] Check application logs
```bash
# View recent application logs
cd /opt/project-nexus/deployment/docker
docker-compose logs app --tail=50

# Check for errors
docker-compose logs app | grep -i "error\|exception\|failed" | tail -20
```

### [ ] Check Nginx logs
```bash
# View access logs
tail -f /var/log/nginx/project-nexus/access.log

# View error logs
tail -f /var/log/nginx/project-nexus/error.log
```

### [ ] Check database logs
```bash
# View PostgreSQL logs
docker-compose logs db --tail=20
```

## 10. Comprehensive Test Script

Create a complete test script:

```bash
#!/bin/bash
# test-deployment.sh

set -e

echo "=== Project Nexus Deployment Test ==="
echo "Timestamp: $(date)"
echo "Domain: yourdomain.com"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test functions
test_service() {
  local service=$1
  local command=$2
  echo -n "Testing $service... "
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗${NC}"
    return 1
  fi
}

test_endpoint() {
  local url=$1
  local expected=$2
  echo -n "Testing $url... "
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "$expected" ]; then
    echo -e "${GREEN}✓ ($status)${NC}"
    return 0
  else
    echo -e "${RED}✗ (got $status, expected $expected)${NC}"
    return 1
  fi
}

echo "1. Service Status Tests"
echo "----------------------"
test_service "Docker" "systemctl is-active docker"
test_service "Nginx" "systemctl is-active nginx"
test_service "PostgreSQL" "cd /opt/project-nexus/deployment/docker && docker-compose exec db pg_isready -U project_nexus_user"
test_service "Application" "cd /opt/project-nexus/deployment/docker && docker-compose ps app | grep -q Up"

echo ""
echo "2. Network Tests"
echo "----------------"
test_endpoint "http://yourdomain.com" "301"  # Should redirect to HTTPS
test_endpoint "https://yourdomain.com" "200"
test_endpoint "https://yourdomain.com/api/health" "200"
test_endpoint "https://yourdomain.com/favicon.ico" "200"
test_endpoint "https://yourdomain.com/nonexistent" "404"

echo ""
echo "3. SSL/TLS Tests"
echo "----------------"
echo -n "Testing SSL certificate... "
if echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -checkend 86400 > /dev/null; then
  echo -e "${GREEN}✓ Valid${NC}"
else
  echo -e "${RED}✗ Invalid or expiring soon${NC}"
fi

echo ""
echo "4. Performance Tests"
echo "-------------------"
echo -n "Homepage response time... "
time curl -o /dev/null -s -w "%{time_total}s" https://yourdomain.com/
echo " seconds"

echo ""
echo "5. Security Tests"
echo "----------------"
echo -n "Checking HSTS header... "
if curl -sI https://yourdomain.com | grep -q "Strict-Transport-Security"; then
  echo -e "${GREEN}✓ Present${NC}"
else
  echo -e "${YELLOW}⚠ Missing${NC}"
fi

echo ""
echo "6. Log Checks"
echo "-------------"
echo -n "Checking for recent errors... "
ERROR_COUNT=$(cd /opt/project-nexus/deployment/docker && docker-compose logs app --tail=100 2>/dev/null | grep -i "error\|exception" | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ No errors${NC}"
else
  echo -e "${YELLOW}⚠ $ERROR_COUNT errors found${NC}"
fi

echo ""
echo "=== Test Summary ==="
echo "All critical tests completed."
echo "For detailed results, check individual test outputs."
echo ""
echo "Next steps:"
echo "1. Manual browser testing"
echo "2. User acceptance testing"
echo "3. Load testing (if needed)"
echo "4. Documentation update"
```

Make it executable:
```bash
chmod +x /opt/project-nexus/test-deployment.sh
```

## 11. Manual Testing Checklist

### Browser Testing:
- [ ] Open https://yourdomain.com in Chrome/Firefox/Safari
- [ ] Verify page loads without errors
- [ ] Check console for JavaScript errors (F12 → Console)
- [ ] Test responsive design on mobile/tablet
- [ ] Test all navigation links
- [ ] Test form submissions
- [ ] Test file uploads (if applicable)
- [ ] Test real-time features (if applicable)

### User Flow Testing:
- [ ] User registration/login
- [ ] Timer creation and management
- [ ] Todo list operations
- [ ] Treasure gallery browsing
- [ ] Data visualization pages
- [ ] Settings/configuration

### Edge Cases:
- [ ] Slow network simulation
- [ ] Offline mode (if supported)
- [ ] Browser back/forward navigation
- [ ] Form validation errors
- [ ] Concurrent user actions

## 12. Post-Testing Actions

### [ ] Document test results
```bash
# Create test report
cat > /opt/project-nexus/test-report-$(date +%Y%m%d).md << EOF
# Deployment Test Report
- Date: $(date)
- Domain: yourdomain.com
- Server: 47.121.31.221

## Test Results
$(/opt/project-nexus/test-deployment.sh 2>&1 | sed 's/\x1b\[[0-9;]*m//g')

## Issues Found
1. None

## Recommendations
1. All systems operational
2. Proceed to production use
EOF
```

### [ ] Update monitoring
```bash
# Add to monitoring system if available
# Example: Update status page, send notification, etc.
echo "Deployment testing completed successfully at $(date)" >> /var/log/project-nexus/deployment.log
```

### [ ] Schedule regular testing
```bash
# Add to cron for daily health checks
echo "0 6 * * * /opt/project-nexus/test-deployment.sh >> /var/log/project-nexus/daily-check.log 2>&1" | crontab -
```

## Next Steps
After successful testing:
1. Update documentation with deployment details
2. Set up ongoing monitoring
3. Create backup procedures
4. Train users on the new deployment
5. Plan for future updates and maintenance