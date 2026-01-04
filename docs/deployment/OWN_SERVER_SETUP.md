# Own Server Setup Guide - Complete Self-Hosting Deployment

## Overview

This guide provides complete instructions for deploying the HRM SaaS platform on your own server infrastructure. This option provides maximum control, cost savings at scale, and complete data ownership.

**Estimated Time:** 2-4 hours  
**Monthly Cost:** $20-50 (depending on VPS specs)  
**Difficulty:** Intermediate to Advanced  
**Code Changes:** None required  

## 🏗️ Server Specifications

### Minimum Recommended Specifications

| Component | Minimum | Recommended | Production |
|-----------|---------|-------------|------------|
| **CPU** | 2 cores | 4 cores | 8+ cores |
| **Memory** | 4GB RAM | 8GB RAM | 16+ GB RAM |
| **Storage** | 40GB SSD | 80GB SSD | 160+ GB SSD |
| **Bandwidth** | 1TB | 2TB | Unlimited |
| **Network** | 1Gbps | 1Gbps | 10Gbps |

### VPS Provider Comparison

| Provider | 2GB/2CPU | 4GB/4CPU | 8GB/8CPU | Best For |
|----------|----------|----------|----------|----------|
| **DigitalOcean** | $12/month | $24/month | $48/month | Easy setup, great docs |
| **Vultr** | $10/month | $20/month | $40/month | Global locations |
| **Linode** | $12/month | $24/month | $48/month | Developer-friendly |
| **Hetzner** | €4.15/month | €8.34/month | €16.68/month | Best value (EU) |
| **AWS EC2** | $15/month | $30/month | $60/month | Enterprise features |

### Recommended VPS Options

#### Budget Option ($20/month)
```
DigitalOcean Droplet - Basic
CPU: 2 vCPUs
Memory: 4GB RAM  
Storage: 80GB SSD
Bandwidth: 2TB
Cost: $24/month
```

#### Recommended Option ($40/month)
```
DigitalOcean Droplet - Regular Performance
CPU: 4 vCPUs
Memory: 8GB RAM
Storage: 160GB SSD
Bandwidth: 4TB
Cost: $48/month
```

#### Production Option ($80/month)
```
DigitalOcean Droplet - CPU Optimized
CPU: 8 vCPUs
Memory: 16GB RAM
Storage: 320GB SSD
Bandwidth: 5TB
Cost: $96/month
```

## 🛠️ Step 1: VPS Provisioning

### 1.1 Choose VPS Provider

**Recommended: DigitalOcean**
- Easy setup and management
- Excellent documentation
- Global data centers
- Simple pricing

### 1.2 Create VPS Instance

1. **Create Account**
   ```
   URL: https://digitalocean.com
   Sign up with GitHub/Google
   ```

2. **Create Droplet**
   ```
   Choose: Ubuntu 22.04 LTS
   Plan: $24/month (4GB RAM, 2 vCPUs)
   Add: SSH keys for secure access
   ```

3. **Configure Firewall**
   ```
   Inbound Rules:
   - SSH (22): Your IP only
   - HTTP (80): Anywhere
   - HTTPS (443): Anywhere
   - Custom (5000): Anywhere (for backend API)
   ```

4. **Add Monitoring**
   ```
   Enable: Basic Monitoring
   Alerts: CPU > 80%, Memory > 85%, Disk > 90%
   ```

### 1.3 Initial Server Setup

```bash
# Connect to your VPS
ssh root@your-server-ip

# Update system packages
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git unzip nginx certbot python3-certbot-nginx

# Create non-root user
adduser hrm-saas
usermod -aG sudo hrm-saas

# Copy SSH key to new user
mkdir -p /home/hrm-saas/.ssh
cp /root/.ssh/authorized_keys /home/hrm-saas/.ssh/
chown -R hrm-saas:hrm-saas /home/hrm-saas/.ssh
chmod 700 /home/hrm-saas/.ssh
chmod 600 /home/hrm-saas/.ssh/authorized_keys

# Switch to new user
su - hrm-saas
```

## 🗄️ Step 2: PostgreSQL Installation & Setup

### 2.1 Install PostgreSQL

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import repository signing key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package list
sudo apt update

# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.2 Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL shell:
CREATE DATABASE hrm_saas;
CREATE USER hrm_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE hrm_saas TO hrm_user;
ALTER USER hrm_user CREATEDB;

# Exit PostgreSQL shell
\q
```

### 2.3 Configure PostgreSQL Settings

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf

# Update these settings:
listen_addresses = 'localhost'
port = 5432
max_connections = 200
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# Edit authentication configuration
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add this line for local connections:
local   hrm_saas   hrm_user   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2.4 Create Database Schema

```bash
# Connect to your database
psql -U hrm_user -d hrm_saas -h localhost

# Run the schema creation script
\i /path/to/database/schema.sql

# Or manually create schema (see FREE_TIER_SETUP.md for full schema)
```

## ⚙️ Step 3: Node.js Environment Setup

### 3.1 Install Node.js

```bash
# Install Node.js 18.x via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

### 3.2 Install PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Set up PM2 startup script
pm2 startup systemd -u hrm-saas --hp /home/hrm-saas

# Install PM2 Log Rotation
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## 🚀 Step 4: Application Deployment

### 4.1 Clone Repository

```bash
# Create application directory
mkdir -p /home/hrm-saas/apps
cd /home/hrm-saas/apps

# Clone your repository
git clone https://github.com/yourusername/hrm-saas.git

# Set proper permissions
sudo chown -R hrm-saas:hrm-saas hrm-saas
```

### 4.2 Backend Setup

```bash
cd hrm-saas/backend

# Install dependencies
npm install --production

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Backend Environment Variables (.env):**
```bash
# Server Configuration
NODE_ENV=production
PORT=5000
API_BASE_URL=https://yourdomain.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hrm_saas
DB_USER=hrm_user
DB_PASSWORD=your-secure-password
DB_SSL=false

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Multi-Tenant Configuration
BASE_DOMAIN=yourdomain.com
TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
```

### 4.3 Frontend Build

```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
NEXT_PUBLIC_TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
EOF

# Build production version
npm run build

# Copy built files to web directory
sudo mkdir -p /var/www/hrm-saas
sudo cp -r .next /var/www/hrm-saas/
sudo cp -r public /var/www/hrm-saas/
sudo cp package.json /var/www/hrm-saas/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/hrm-saas
```

## 🌐 Step 5: NGINX Configuration

### 5.1 Configure NGINX

```bash
# Create NGINX configuration
sudo nano /etc/nginx/sites-available/hrm-saas
```

**NGINX Configuration:**
```nginx
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com *.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # Frontend (Next.js)
    location / {
        root /var/www/hrm-saas;
        try_files $uri $uri/ /index.html;
        
        # Caching for static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
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
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
```

### 5.2 Enable NGINX Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/hrm-saas /etc/nginx/sites-enabled/

# Test NGINX configuration
sudo nginx -t

# If test passes, restart NGINX
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 Step 6: SSL Certificate Setup

### 6.1 Install SSL Certificate (Let's Encrypt)

```bash
# Stop NGINX temporarily
sudo systemctl stop nginx

# Obtain SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d *.yourdomain.com

# Start NGINX
sudo systemctl start nginx

# Set up automatic renewal
sudo crontab -e

# Add this line for automatic renewal
0 12 * * * /usr/bin/certbot renew --quiet
```

### 6.2 Verify SSL Configuration

```bash
# Test SSL certificate
curl -I https://yourdomain.com

# Check SSL certificate details
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Test SSL grade
# Visit: https://www.ssllabs.com/ssltest/
```

## 📱 Step 7: PM2 Process Management

### 7.1 Start Backend Application

```bash
cd /home/hrm-saas/apps/hrm-saas/backend

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check application status
pm2 status

# View logs
pm2 logs hrm-saas-backend
```

### 7.2 PM2 Configuration

Create `/home/hrm-saas/apps/hrm-saas/backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'hrm-saas-backend',
    script: './dist/server.js',
    cwd: '/home/hrm-saas/apps/hrm-saas/backend',
    
    // Instance management
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    
    // Auto restart
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    
    // Error handling
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Advanced settings
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    
    // Monitoring
    monitoring: false,
    
    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 7.3 Create Log Directory

```bash
# Create logs directory
mkdir -p /home/hrm-saas/apps/hrm-saas/backend/logs

# Set permissions
sudo chown -R hrm-saas:hrm-saas /home/hrm-saas/apps/hrm-saas/backend/logs
```

## 📊 Step 8: Backup Automation

### 8.1 Database Backup Script

Create `/home/hrm-saas/scripts/backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/hrm-saas/backups"
DB_NAME="hrm_saas"
DB_USER="hrm_user"
DB_HOST="localhost"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/hrm_saas_backup_$TIMESTAMP.sql"

# Create database backup
pg_dump -U $DB_USER -h $DB_HOST -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove old backups (older than retention period)
find $BACKUP_DIR -name "hrm_saas_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "$(date): Database backup completed - $BACKUP_FILE.gz"

# Optional: Upload to cloud storage (AWS S3, etc.)
# aws s3 cp $BACKUP_FILE.gz s3://your-backup-bucket/
```

### 8.2 File Backup Script

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/hrm-saas/backups"
WEB_DIR="/var/www/hrm-saas"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/web_files_backup_$TIMESTAMP.tar.gz"

# Create file backup
tar -czf $BACKUP_FILE -C /var/www hrm-saas

# Remove old backups
find $BACKUP_DIR -name "web_files_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date): File backup completed - $BACKUP_FILE"
```

### 8.3 Automated Backup Schedule

```bash
# Make scripts executable
chmod +x /home/hrm-saas/scripts/backup.sh
chmod +x /home/hrm-saas/scripts/file-backup.sh

# Add to crontab
crontab -e

# Add these lines:
# Database backup daily at 2 AM
0 2 * * * /home/hrm-saas/scripts/backup.sh >> /home/hrm-saas/logs/backup.log 2>&1

# File backup weekly on Sunday at 3 AM
0 3 * * 0 /home/hrm-saas/scripts/file-backup.sh >> /home/hrm-saas/logs/backup.log 2>&1

# Create logs directory
mkdir -p /home/hrm-saas/logs
```

## 📈 Step 9: Monitoring Setup

### 9.1 System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Install log monitoring
sudo apt install -y logwatch

# Configure logwatch
sudo nano /etc/logwatch/conf/logwatch.conf

# Set output to email
Output = mail
Print = Yes
Save = /tmp/logwatch
```

### 9.2 Application Monitoring

Create `/home/hrm-saas/scripts/health-check.sh`:

```bash
#!/bin/bash

# Configuration
API_URL="https://yourdomain.com/health"
LOG_FILE="/home/hrm-saas/logs/health-check.log"
ALERT_EMAIL="admin@yourdomain.com"

# Check API health
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ $response -eq 200 ]; then
    echo "$(date): API health check passed" >> $LOG_FILE
else
    echo "$(date): API health check failed (HTTP $response)" >> $LOG_FILE
    
    # Send alert email (if mailutils installed)
    # echo "API health check failed at $(date)" | mail -s "HRM SaaS Alert" $ALERT_EMAIL
    
    # Restart backend if needed
    cd /home/hrm-saas/apps/hrm-saas/backend
    pm2 restart hrm-saas-backend
fi

# Clean old log entries (keep last 1000 lines)
tail -n 1000 $LOG_FILE > $LOG_FILE.tmp
mv $LOG_FILE.tmp $LOG_FILE
```

### 9.3 Resource Monitoring

```bash
# Create resource monitoring script
sudo nano /home/hrm-saas/scripts/resource-monitor.sh

#!/bin/bash

# Configuration
LOG_FILE="/home/hrm-saas/logs/resource-monitor.log"
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90

# Get current usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)

# Log resource usage
echo "$(date): CPU=$CPU_USAGE% Memory=$MEMORY_USAGE% Disk=$DISK_USAGE%" >> $LOG_FILE

# Check thresholds and alert if exceeded
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    echo "$(date): WARNING - High CPU usage: $CPU_USAGE%" >> $LOG_FILE
fi

if [ $MEMORY_USAGE -gt $MEMORY_THRESHOLD ]; then
    echo "$(date): WARNING - High memory usage: $MEMORY_USAGE%" >> $LOG_FILE
fi

if [ $DISK_USAGE -gt $DISK_THRESHOLD ]; then
    echo "$(date): WARNING - High disk usage: $DISK_USAGE%" >> $LOG_FILE
fi

# Clean old entries
tail -n 1000 $LOG_FILE > $LOG_FILE.tmp
mv $LOG_FILE.tmp $LOG_FILE

# Make executable
chmod +x /home/hrm-saas/scripts/resource-monitor.sh

# Add to crontab (check every 5 minutes)
crontab -e

# Add this line:
*/5 * * * * /home/hrm-saas/scripts/resource-monitor.sh
```

## 🔧 Step 10: Initial Verification Tests

### 10.1 System Health Check

```bash
# Check all services are running
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Check ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :5432

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top -bn1 | grep "Cpu(s)"
```

### 10.2 Application Tests

```bash
# Test backend health
curl -f https://yourdomain.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}

# Test database connection
curl -X POST https://yourdomain.com/api/auth/test-db

# Test frontend
curl -f https://yourdomain.com

# Test multi-tenancy
curl -f https://test.yourdomain.com
```

### 10.3 Performance Tests

```bash
# Test response times
time curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com

# curl-format.txt content:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#           time_total:  %{time_total}\n

# Expected total time: < 200ms
```

## ⚡ Step 11: Performance Tuning

### 11.1 PostgreSQL Optimization

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf

# Add these optimizations:
shared_buffers = 2GB                    # 25% of total RAM
effective_cache_size = 6GB              # 75% of total RAM
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrent = 200
work_mem = 64MB
min_wal_size = 2GB
max_wal_size = 4GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 11.2 NGINX Optimization

```bash
# Edit NGINX configuration
sudo nano /etc/nginx/nginx.conf

# Add these optimizations:
worker_processes auto;
worker_connections 1024;
keepalive_timeout 65;
keepalive_requests 1000;
client_body_buffer_size 128k;
client_max_body_size 16m;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
output_buffers 1 32k;
postpone_output 1460;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 11.3 System Optimization

```bash
# Edit system limits
sudo nano /etc/security/limits.conf

# Add these lines:
* soft nofile 65535
* hard nofile 65535
* soft nproc 32768
* hard nproc 32768

# Edit sysctl settings
sudo nano /etc/sysctl.conf

# Add network optimizations:
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 65536 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr

# Apply settings
sudo sysctl -p
```

## 🛡️ Step 12: Security Hardening

### 12.1 Firewall Configuration

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp  # Only if needed externally

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 12.2 Fail2Ban Setup

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create configuration
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 your-office-ip

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

# Start Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 12.3 Security Updates

```bash
# Enable automatic security updates
sudo apt install -y unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Edit configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Enable security updates
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

# Automatic reboot
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

## 📊 Cost Breakdown

### Monthly Own Server Costs

| Component | Provider | Specification | Monthly Cost |
|-----------|----------|---------------|--------------|
| **VPS** | DigitalOcean | 4GB RAM, 2 vCPU, 80GB SSD | $24/month |
| **Domain** | Namecheap | yourdomain.com | $12/year ($1/month) |
| **SSL Certificate** | Let's Encrypt | Free | $0/month |
| **Backup Storage** | DigitalOcean Spaces | 100GB | $5/month |
| **Monitoring** | DigitalOcean Monitoring | Basic | $0/month |
| **Total Monthly** | | | **$30/month** |

### Cost Comparison

| Deployment Type | Monthly Cost | Annual Cost | Cost per Employee* |
|----------------|--------------|-------------|-------------------|
| **Free Tier** | $0 | $0 | $0 |
| **Pro Tier** | $67 | $804 | $67 |
| **Own Server** | $30 | $360 | $30 |

*Based on 1 company using the platform

### 6-Month Projection

| Month | Free Tier | Pro Tier | Own Server |
|-------|-----------|----------|------------|
| 1-6 | $0 | $4,824 | $180 |
| Savings vs Pro | | | $4,644 |

### 12-Month Projection

| Month | Free Tier | Pro Tier | Own Server |
|-------|-----------|----------|------------|
| 1-12 | $0 | $9,648 | $360 |
| Savings vs Pro | | | $9,288 |

## 🚀 Next Steps

### Immediate Post-Deployment

1. **Monitor Performance**
   - Set up alerting for response times
   - Monitor resource usage
   - Track user satisfaction

2. **Optimize Configuration**
   - Fine-tune PostgreSQL settings
   - Optimize NGINX configuration
   - Adjust PM2 settings

3. **Backup Verification**
   - Test backup restoration procedures
   - Verify backup retention policies
   - Test disaster recovery scenarios

### Long-term Maintenance

1. **Regular Updates**
   - Security patches
   - Application updates
   - Database maintenance

2. **Performance Monitoring**
   - Response time trends
   - Resource utilization
   - Capacity planning

3. **Scaling Preparation**
   - Horizontal scaling planning
   - Database optimization
   - Load balancing setup

### Scaling to Multiple Servers

When ready to scale beyond single server:

1. **Database Separation**
   - Dedicated database server
   - Read replicas for performance
   - Connection pooling

2. **Load Balancing**
   - Multiple application servers
   - NGINX load balancer
   - Session management

3. **High Availability**
   - Redundant servers
   - Database clustering
   - Automated failover

## ✅ Success Criteria

Your own server deployment is successful when:

- [ ] **All services running** (NGINX, PostgreSQL, PM2)
- [ ] **SSL certificates active** and renewable
- [ ] **Database schema created** and functional
- [ ] **Application accessible** via your domain
- [ ] **Backup system working** and tested
- [ ] **Monitoring active** and alerting
- [ ] **Security hardened** with firewall and Fail2Ban
- [ ] **Performance meeting** requirements (< 200ms response)
- [ ] **Multi-tenant routing** working correctly
- [ ] **Authentication system** fully functional

## 🆘 Troubleshooting

### Common Issues

**502 Bad Gateway:**
- Check PM2 status: `pm2 status`
- Check NGINX configuration: `sudo nginx -t`
- Review application logs: `pm2 logs`

**Database connection errors:**
- Verify PostgreSQL status: `sudo systemctl status postgresql`
- Check database credentials in .env
- Test connection: `psql -U hrm_user -d hrm_saas`

**SSL certificate issues:**
- Check certificate validity: `sudo certbot certificates`
- Renew manually: `sudo certbot renew`
- Verify NGINX SSL configuration

**Performance issues:**
- Monitor resource usage: `htop`, `iotop`
- Check database performance: `sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"`
- Review NGINX logs: `sudo tail -f /var/log/nginx/error.log`

### Getting Help

1. **Check logs first** (application, NGINX, PostgreSQL)
2. **Verify configuration** (environment variables, NGINX config)
3. **Test connectivity** (database, external services)
4. **Monitor resources** (CPU, memory, disk)
5. **Review security settings** (firewall, permissions)

---

**🎉 Congratulations!** Your HRM SaaS platform is now running on your own server with complete control and cost savings.