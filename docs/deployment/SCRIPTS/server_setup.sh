#!/bin/bash

# HRM SaaS Complete Own Server Setup Script
# Purpose: Complete automated setup for own server deployment
# Usage: ./server_setup.sh
# Estimated Time: 2-4 hours (depending on server specs)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hrm-saas"
APP_USER="hrm-saas"
APP_DIR="/home/$APP_USER"
WEB_DIR="/var/www/$PROJECT_NAME"
LOG_FILE="/tmp/hrm-saas-server-setup.log"
DB_NAME="hrm_saas"
DB_USER="hrm_user"
DB_PASSWORD=$(openssl rand -base64 16)

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

section() {
    echo -e "\n${PURPLE}=== $1 ===${NC}" | tee -a "$LOG_FILE"
}

# Banner
echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║              HRM SaaS Own Server Setup                       ║
║              Complete Automation Script                      ║
╚══════════════════════════════════════════════════════════════╝
${NC}"

log "Starting HRM SaaS own server deployment..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root or with sudo privileges"
fi

# Collect user inputs
collect_inputs() {
    section "Collecting Configuration"
    
    echo -e "${YELLOW}Please provide the following information:${NC}"
    
    # Domain configuration
    read -p "Your domain name (e.g., hrm.yourcompany.com): " DOMAIN_NAME
    if [ -z "$DOMAIN_NAME" ]; then
        error "Domain name is required."
    fi
    
    # Admin email
    read -p "Admin email for notifications: " ADMIN_EMAIL
    if [ -z "$ADMIN_EMAIL" ]; then
        ADMIN_EMAIL="admin@$DOMAIN_NAME"
        info "Using default admin email: $ADMIN_EMAIL"
    fi
    
    # Email service configuration
    read -p "SMTP server (or press Enter for none): " SMTP_HOST
    read -p "SMTP port (default: 587): " SMTP_PORT
    SMTP_PORT=${SMTP_PORT:-587}
    read -p "SMTP username (if using SMTP): " SMTP_USER
    read -p "SMTP password (if using SMTP): " SMTP_PASS
    
    # SSL configuration
    read -p "Email for SSL certificate (default: $ADMIN_EMAIL): " SSL_EMAIL
    SSL_EMAIL=${SSL_EMAIL:-$ADMIN_EMAIL}
    
    log "Configuration collected successfully."
}

# System preparation
prepare_system() {
    section "System Preparation"
    
    log "Updating system packages..."
    apt update && apt upgrade -y
    
    log "Installing essential packages..."
    apt install -y curl wget git unzip nginx certbot python3-certbot-nginx \
        software-properties-common apt-transport-https ca-certificates \
        gnupg lsb-release build-essential
    
    log "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    log "Installing PM2 globally..."
    npm install -g pm2
    
    log "Setting up PM2 startup..."
    pm2 startup systemd -u root --hp /root
    
    log "Installing PostgreSQL 15..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update
    apt install -y postgresql-15 postgresql-contrib-15
    
    log "Installing additional utilities..."
    apt install -y htop iotop nethogs fail2ban logwatch
    
    log "System preparation completed."
}

# Create application user
create_app_user() {
    section "Creating Application User"
    
    log "Creating application user: $APP_USER"
    
    # Create user if it doesn't exist
    if ! id "$APP_USER" &>/dev/null; then
        useradd -m -s /bin/bash $APP_USER
    fi
    
    # Add user to necessary groups
    usermod -aG www-data,sudo $APP_USER
    
    log "Application user created successfully."
}

# PostgreSQL setup
setup_postgresql() {
    section "PostgreSQL Database Setup"
    
    log "Starting PostgreSQL service..."
    systemctl start postgresql
    systemctl enable postgresql
    
    log "Creating database and user..."
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    log "Configuring PostgreSQL..."
    # Update PostgreSQL configuration
    cat > /etc/postgresql/15/main/postgresql.conf << EOF
# Connection Settings
listen_addresses = 'localhost'
port = 5432
max_connections = 200

# Memory Settings
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 16MB
maintenance_work_mem = 256MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Performance Settings
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
log_min_duration_statement = 1000
EOF
    
    # Update authentication configuration
    cat >> /etc/postgresql/15/main/pg_hba.conf << EOF

# HRM SaaS Application Access
local   $DB_NAME    $DB_USER                      md5
host    $DB_NAME    $DB_USER    127.0.0.1/32      md5
host    $DB_NAME    $DB_USER    ::1/128           md5
EOF
    
    log "Restarting PostgreSQL..."
    systemctl restart postgresql
    
    log "Creating database schema..."
    create_database_schema
    
    log "PostgreSQL setup completed."
}

# Create database schema
create_database_schema() {
    sudo -u postgres psql -d $DB_NAME << 'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE NOT NULL,
    subscription VARCHAR(50) DEFAULT 'free',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_settings table
CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    branding JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'employee',
    status VARCHAR(20) DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100),
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create refresh_tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('super_admin', 'Platform super administrator', '["*"]'),
('tenant_admin', 'Tenant administrator', '["tenant:manage", "users:manage", "settings:manage"]'),
('hr_manager', 'HR manager', '["employees:manage", "reports:view"]'),
('employee', 'Basic employee access', '["profile:view", "profile:update"]');
EOF
}

# Application deployment
deploy_application() {
    section "Application Deployment"
    
    log "Creating application directories..."
    mkdir -p $APP_DIR/{apps,scripts,logs,backups,config}
    
    # Clone repository (if provided)
    if [ ! -z "$GITHUB_REPO" ]; then
        log "Cloning repository from $GITHUB_REPO..."
        cd $APP_DIR/apps
        git clone $GITHUB_REPO $PROJECT_NAME
        cd $PROJECT_NAME
    else
        log "No repository provided. Please upload your code to $APP_DIR/apps/$PROJECT_NAME"
        warning "Please upload your HRM SaaS application code to $APP_DIR/apps/$PROJECT_NAME"
        read -p "Press Enter when code is uploaded..."
    fi
    
    # Set proper ownership
    chown -R $APP_USER:$APP_USER $APP_DIR
    
    # Setup backend
    if [ -d "$APP_DIR/apps/$PROJECT_NAME/$BACKEND_DIR" ]; then
        log "Setting up backend application..."
        setup_backend
    fi
    
    # Setup frontend
    if [ -d "$APP_DIR/apps/$PROJECT_NAME/$FRONTEND_DIR" ]; then
        log "Setting up frontend application..."
        setup_frontend
    fi
    
    log "Application deployment completed."
}

# Backend setup
setup_backend() {
    cd $APP_DIR/apps/$PROJECT_NAME/backend
    
    # Install dependencies
    log "Installing backend dependencies..."
    sudo -u $APP_USER npm install --production
    
    # Generate JWT secrets
    JWT_ACCESS_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    # Create environment file
    sudo -u $APP_USER cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=5000
API_BASE_URL=https://$DOMAIN_NAME

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false

# JWT Configuration
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=https://$DOMAIN_NAME
ALLOWED_ORIGINS=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Multi-Tenant Configuration
BASE_DOMAIN=$DOMAIN_NAME
TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$

# Email Configuration
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM_EMAIL=noreply@$DOMAIN_NAME

# Admin Configuration
ADMIN_EMAIL=$ADMIN_EMAIL
EOF
    
    # Create .env.example
    sudo -u $APP_USER cp .env .env.example
    sudo -u $APP_USER sed -i 's/=.*$/=/g' .env.example
    
    # Build application
    log "Building backend application..."
    sudo -u $APP_USER npm run build
    
    # Create PM2 configuration
    sudo -u $APP_USER cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'hrm-saas-backend',
    script: './dist/server.js',
    cwd: '$APP_DIR/apps/$PROJECT_NAME/backend',
    
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
    error_file: '$APP_DIR/logs/err.log',
    out_file: '$APP_DIR/logs/out.log',
    log_file: '$APP_DIR/logs/combined.log',
    time: true,
    
    // Advanced settings
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    
    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
    
    # Create logs directory
    mkdir -p $APP_DIR/logs
    chown -R $APP_USER:$APP_USER $APP_DIR/logs
    
    cd $APP_DIR/apps/$PROJECT_NAME
}

# Frontend setup
setup_frontend() {
    cd $APP_DIR/apps/$PROJECT_NAME/frontend
    
    # Install dependencies
    log "Installing frontend dependencies..."
    sudo -u $APP_USER npm install
    
    # Create environment file
    sudo -u $APP_USER cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_APP_URL=https://$DOMAIN_NAME
NEXT_PUBLIC_BASE_DOMAIN=$DOMAIN_NAME
NEXT_PUBLIC_TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
EOF
    
    # Create .env.local.example
    sudo -u $APP_USER cp .env.production .env.local.example
    sudo -u $APP_USER sed -i 's/=.*$/=/g' .env.local.example
    
    # Build production version
    log "Building frontend application..."
    sudo -u $APP_USER npm run build
    
    # Copy to web directory
    log "Copying frontend to web directory..."
    mkdir -p $WEB_DIR
    sudo -u $APP_USER cp -r .next $WEB_DIR/
    sudo -u $APP_USER cp -r public $WEB_DIR/
    sudo -u $APP_USER cp package.json $WEB_DIR/
    
    chown -R www-data:www-data $WEB_DIR
    
    cd $APP_DIR/apps/$PROJECT_NAME
}

# NGINX configuration
setup_nginx() {
    section "NGINX Configuration"
    
    log "Configuring NGINX..."
    
    # Create NGINX configuration
    cat > /etc/nginx/sites-available/$PROJECT_NAME << EOF
# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN_NAME *.$DOMAIN_NAME;
    
    # Redirect all HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME *.$DOMAIN_NAME;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
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
        root $WEB_DIR;
        try_files \$uri \$uri/ /index.html;
        
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
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
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    
    # Restart NGINX
    systemctl restart nginx
    systemctl enable nginx
    
    log "NGINX configuration completed."
}

# SSL certificate setup
setup_ssl() {
    section "SSL Certificate Setup"
    
    log "Setting up SSL certificate..."
    
    # Stop NGINX temporarily
    systemctl stop nginx
    
    # Obtain SSL certificate
    certbot certonly --standalone -d $DOMAIN_NAME -d *.$DOMAIN_NAME --email $SSL_EMAIL --agree-tos --non-interactive
    
    # Start NGINX
    systemctl start nginx
    
    # Set up automatic renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log "SSL certificate setup completed."
}

# Security hardening
setup_security() {
    section "Security Hardening"
    
    log "Configuring firewall..."
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    log "Configuring Fail2Ban..."
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8

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
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log "Configuring automatic security updates..."
    apt install -y unattended-upgrades
    dpkg-reconfigure -plow unattended-upgrades
    
    log "Security hardening completed."
}

# Backup system setup
setup_backup() {
    section "Backup System Setup"
    
    log "Creating backup scripts..."
    
    # Database backup script
    cat > $APP_DIR/scripts/backup.sh << EOF
#!/bin/bash

# HRM SaaS Database Backup Script
set -e

BACKUP_DIR="$APP_DIR/backups"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_HOST="localhost"
RETENTION_DAYS=30

mkdir -p \$BACKUP_DIR

TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="\$BACKUP_DIR/hrm_saas_backup_\$TIMESTAMP.sql"
BACKUP_FILE_GZ="\$BACKUP_FILE.gz"

echo "\$(date): Starting database backup"

pg_dump -U \$DB_USER -h \$DB_HOST -d \$DB_NAME > \$BACKUP_FILE
gzip \$BACKUP_FILE

find \$BACKUP_DIR -name "hrm_saas_backup_*.sql.gz" -mtime +\$RETENTION_DAYS -delete

echo "\$(date): Backup completed - \$BACKUP_FILE_GZ"
EOF
    
    # File backup script
    cat > $APP_DIR/scripts/file-backup.sh << EOF
#!/bin/bash

# HRM SaaS File Backup Script
set -e

BACKUP_DIR="$APP_DIR/backups"
WEB_DIR="$WEB_DIR"
APP_DIR_BACKUP="$APP_DIR/apps/$PROJECT_NAME"
RETENTION_DAYS=365

mkdir -p \$BACKUP_DIR

TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="\$BACKUP_DIR/hrm_saas_files_backup_\$TIMESTAMP.tar.gz"

echo "\$(date): Starting file backup"

tar -czf \$BACKUP_FILE \\
    -C /var/www $PROJECT_NAME \\
    -C $APP_DIR apps \\
    --exclude='*.log' \\
    --exclude='node_modules' \\
    --exclude='.git'

find \$BACKUP_DIR -name "hrm_saas_files_backup_*.tar.gz" -mtime +\$RETENTION_DAYS -delete

echo "\$(date): File backup completed - \$BACKUP_FILE"
EOF
    
    # Make scripts executable
    chmod +x $APP_DIR/scripts/*.sh
    
    # Set up cron jobs
    cat > /tmp/hrm-saas-cron << EOF
# HRM SaaS Backup Jobs
# Database backup daily at 2:00 AM
0 2 * * * $APP_USER $APP_DIR/scripts/backup.sh >> $APP_DIR/logs/backup.log 2>&1

# File backup weekly on Sunday at 3:00 AM
0 3 * * 0 $APP_USER $APP_DIR/scripts/file-backup.sh >> $APP_DIR/logs/backup.log 2>&1

# Health checks every 5 minutes
*/5 * * * * $APP_DIR/scripts/health-check.sh >> $APP_DIR/logs/health.log 2>&1
EOF
    
    crontab -u $APP_USER /tmp/hrm-saas-cron
    rm /tmp/hrm-saas-cron
    
    log "Backup system setup completed."
}

# Monitoring setup
setup_monitoring() {
    section "Monitoring Setup"
    
    log "Creating monitoring scripts..."
    
    # Health check script
    cat > $APP_DIR/scripts/health-check.sh << EOF
#!/bin/bash

# HRM SaaS Health Check Script
API_URL="https://$DOMAIN_NAME/health"
LOG_FILE="$APP_DIR/logs/health-check.log"

response=\$(curl -s -o /dev/null -w "%{http_code}" \$API_URL)

if [ \$response -eq 200 ]; then
    echo "\$(date): Application healthy" >> \$LOG_FILE
else
    echo "\$(date): Application unhealthy (HTTP \$response)" >> \$LOG_FILE
    # Restart backend if needed
    pm2 restart hrm-saas-backend
fi

# Clean old log entries
tail -n 1000 \$LOG_FILE > \$LOG_FILE.tmp
mv \$LOG_FILE.tmp \$LOG_FILE
EOF
    
    # Resource monitoring script
    cat > $APP_DIR/scripts/resource-monitor.sh << EOF
#!/bin/bash

# Resource Monitoring Script
LOG_FILE="$APP_DIR/logs/resource-monitor.log"

cpu_usage=\$(top -bn1 | grep "Cpu(s)" | awk '{print \$2}' | cut -d'%' -f1 | sed 's/us,//')
memory_usage=\$(free | grep Mem | awk '{printf("%.0f", \$3/\$2 * 100.0)}')
disk_usage=\$(df -h / | awk 'NR==2{print \$5}' | cut -d'%' -f1)

echo "\$(date): CPU=\${cpu_usage}% Memory=\${memory_usage}% Disk=\${disk_usage}%" >> \$LOG_FILE

# Alert on high usage
if (( \$(echo "\$cpu_usage > 80" | bc -l) )); then
    echo "\$(date): WARNING - High CPU usage: \${cpu_usage}%" >> \$LOG_FILE
fi

if [ \$memory_usage -gt 85 ]; then
    echo "\$(date): WARNING - High memory usage: \${memory_usage}%" >> \$LOG_FILE
fi

if [ \$disk_usage -gt 90 ]; then
    echo "\$(date): WARNING - High disk usage: \${disk_usage}%" >> \$LOG_FILE
fi

# Clean old entries
tail -n 1000 \$LOG_FILE > \$LOG_FILE.tmp
mv \$LOG_FILE.tmp \$LOG_FILE
EOF
    
    chmod +x $APP_DIR/scripts/*.sh
    
    # Set up resource monitoring cron job
    (crontab -l 2>/dev/null; echo "*/15 * * * * $APP_USER $APP_DIR/scripts/resource-monitor.sh") | crontab -u $APP_USER -
    
    log "Monitoring setup completed."
}

# Start services
start_services() {
    section "Starting Services"
    
    log "Starting PostgreSQL..."
    systemctl start postgresql
    systemctl enable postgresql
    
    log "Starting NGINX..."
    systemctl start nginx
    systemctl enable nginx
    
    log "Starting application..."
    cd $APP_DIR/apps/$PROJECT_NAME/backend
    sudo -u $APP_USER pm2 start ecosystem.config.js
    sudo -u $APP_USER pm2 save
    
    cd $APP_DIR/apps/$PROJECT_NAME
    
    log "All services started successfully."
}

# Final verification
verify_installation() {
    section "Installation Verification"
    
    log "Running final verification checks..."
    
    # Check services
    if systemctl is-active --quiet postgresql; then
        log "✅ PostgreSQL: Running"
    else
        error "❌ PostgreSQL: Not running"
    fi
    
    if systemctl is-active --quiet nginx; then
        log "✅ NGINX: Running"
    else
        error "❌ NGINX: Not running"
    fi
    
    if pm2 list | grep -q "hrm-saas-backend.*online"; then
        log "✅ Backend Application: Running"
    else
        error "❌ Backend Application: Not running"
    fi
    
    # Test application
    log "Testing application endpoints..."
    
    if curl -f "https://$DOMAIN_NAME/health" > /dev/null 2>&1; then
        log "✅ Health endpoint: Accessible"
    else
        warning "❌ Health endpoint: Not accessible"
    fi
    
    if curl -f "https://$DOMAIN_NAME" > /dev/null 2>&1; then
        log "✅ Frontend: Accessible"
    else
        warning "❌ Frontend: Not accessible"
    fi
    
    # Database test
    if sudo -u postgres psql -d $DB_NAME -c "SELECT COUNT(*) FROM tenants;" > /dev/null 2>&1; then
        log "✅ Database: Accessible"
    else
        warning "❌ Database: Not accessible"
    fi
    
    log "Verification completed."
}

# Create summary
create_summary() {
    section "Installation Summary"
    
    cat > $APP_DIR/INSTALLATION_SUMMARY.md << EOF
# HRM SaaS Own Server Installation Summary

## Installation Details
- **Domain**: $DOMAIN_NAME
- **Installation Date**: $(date)
- **Database**: $DB_NAME
- **Application User**: $APP_USER
- **Admin Email**: $ADMIN_EMAIL

## Service Information
- **Frontend**: https://$DOMAIN_NAME
- **Backend API**: https://$DOMAIN_NAME/api
- **Health Check**: https://$DOMAIN_NAME/health

## Database Information
- **Host**: localhost
- **Port**: 5432
- **Database**: $DB_NAME
- **Username**: $DB_USER
- **Password**: [Stored in $APP_DIR/apps/$PROJECT_NAME/backend/.env]

## Important Files
- **Application Directory**: $APP_DIR/apps/$PROJECT_NAME
- **Web Directory**: $WEB_DIR
- **Logs**: $APP_DIR/logs
- **Backups**: $APP_DIR/backups
- **Configuration**: $APP_DIR/config

## Management Commands

### Application Management
\`\`\`bash
# Check application status
pm2 status

# Restart application
pm2 restart hrm-saas-backend

# View logs
pm2 logs hrm-saas-backend

# Monitor resources
pm2 monit
\`\`\`

### Database Management
\`\`\`bash
# Connect to database
psql -U $DB_USER -d $DB_NAME

# Create backup
$APP_DIR/scripts/backup.sh

# Restore backup
gunzip -c backup_file.sql.gz | psql -U $DB_USER -d $DB_NAME
\`\`\`

### NGINX Management
\`\`\`bash
# Test configuration
nginx -t

# Reload configuration
nginx -s reload

# Restart NGINX
systemctl restart nginx
\`\`\`

### System Monitoring
\`\`\`bash
# Check service status
systemctl status postgresql nginx

# View application logs
tail -f $APP_DIR/logs/combined.log

# Check system resources
htop
df -h
free -h
\`\`\`

## SSL Certificate
- **Provider**: Let's Encrypt
- **Auto-renewal**: Configured via cron
- **Renewal command**: certbot renew

## Backup Schedule
- **Database**: Daily at 2:00 AM
- **Files**: Weekly on Sunday at 3:00 AM
- **Retention**: 30 days (database), 365 days (files)

## Security Features
- **Firewall**: UFW configured
- **Fail2Ban**: Active
- **SSL**: Let's Encrypt certificate
- **Automatic Updates**: Enabled

## Next Steps
1. Configure your domain's DNS to point to this server
2. Test user registration and login
3. Set up monitoring alerts
4. Configure email settings
5. Plan regular maintenance

## Support
- **Documentation**: docs/deployment/
- **Logs**: $APP_DIR/logs/
- **Backups**: $APP_DIR/backups/

Installation completed successfully! 🎉
EOF
    
    log "Installation summary created at $APP_DIR/INSTALLATION_SUMMARY.md"
}

# Main execution
main() {
    log "Starting HRM SaaS own server setup process..."
    
    collect_inputs
    prepare_system
    create_app_user
    setup_postgresql
    deploy_application
    setup_nginx
    setup_ssl
    setup_security
    setup_backup
    setup_monitoring
    start_services
    verify_installation
    create_summary
    
    log "Setup completed successfully! 🎉"
    echo -e "${GREEN}
╔══════════════════════════════════════════════════════════════╗
║                 Server Setup Complete!                       ║
╠══════════════════════════════════════════════════════════════╣
║ Your HRM SaaS platform is now running on your server.        ║
║                                                              ║
║ Access your application at: https://$DOMAIN_NAME            ║
║                                                              ║
║ Important Information:                                       ║
║ • Domain DNS must point to this server IP                   ║
║ • SSL certificate is automatically configured               ║
║ • Backups run automatically                                 ║
║ • Monitoring is active                                      ║
║                                                              ║
║ Check $APP_DIR/INSTALLATION_SUMMARY.md for details        ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    info "Setup log saved to: $LOG_FILE"
    info "Configuration summary saved to: $APP_DIR/INSTALLATION_SUMMARY.md"
}

# Run main function
main "$@"