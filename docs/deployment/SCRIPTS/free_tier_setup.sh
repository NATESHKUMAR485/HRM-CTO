#!/bin/bash

# HRM SaaS Free Tier Automated Setup Script
# Purpose: Complete automated setup for Vercel + Render + Supabase deployment
# Usage: ./free_tier_setup.sh
# Estimated Time: 30 minutes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hrm-saas"
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
LOG_FILE="/tmp/hrm-saas-setup.log"

# Logging function
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

# Banner
echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║                  HRM SaaS Free Tier Setup                    ║
║                  Automated Deployment Script                  ║
╚══════════════════════════════════════════════════════════════╝
${NC}"

log "Starting HRM SaaS free tier deployment setup..."

# Prerequisites check
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Git is installed
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install Git first."
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ first."
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        error "Node.js version $NODE_VERSION is not supported. Please install Node.js 18 or higher."
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm first."
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -d "$FRONTEND_DIR" ] || [ ! -d "$BACKEND_DIR" ]; then
        error "Please run this script from the HRM SaaS project root directory."
    fi
    
    log "Prerequisites check completed successfully."
}

# Collect user inputs
collect_inputs() {
    log "Collecting deployment configuration..."
    
    echo -e "${YELLOW}Please provide the following information:${NC}"
    
    # GitHub repository
    read -p "GitHub repository URL (e.g., https://github.com/username/hrm-saas): " GITHUB_REPO
    if [ -z "$GITHUB_REPO" ]; then
        error "GitHub repository URL is required."
    fi
    
    # Domain configuration
    read -p "Custom domain (optional, press Enter to skip): " CUSTOM_DOMAIN
    read -p "Subdomain for multi-tenancy (e.g., 'vercel.app' for Vercel hosting): " BASE_DOMAIN
    
    # Supabase configuration (user will need to create manually)
    echo -e "${YELLOW}Note: You'll need to create a Supabase project manually first.${NC}"
    read -p "Supabase project URL (from dashboard): " SUPABASE_URL
    read -p "Supabase anon key (from dashboard): " SUPABASE_ANON_KEY
    read -p "Supabase service role key (from dashboard): " SUPABASE_SERVICE_KEY
    read -p "Supabase database password: " SUPABASE_PASSWORD
    
    # Email configuration
    read -p "Admin email for notifications: " ADMIN_EMAIL
    
    # Generate secure secrets
    log "Generating secure JWT secrets..."
    JWT_ACCESS_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    log "Configuration collected successfully."
}

# Database setup
setup_database() {
    log "Setting up Supabase database..."
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        warning "Supabase configuration not provided. Please set up manually after running this script."
        return
    fi
    
    # Create database schema SQL
    cat > /tmp/database_schema.sql << 'EOF'
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
    
    # Note: The user will need to run this SQL manually in Supabase
    info "Database schema created at /tmp/database_schema.sql"
    info "Please run this SQL in your Supabase SQL Editor to create the database structure."
    
    log "Database setup instructions provided."
}

# Backend configuration
setup_backend() {
    log "Configuring backend application..."
    
    cd "$BACKEND_DIR"
    
    # Install dependencies
    log "Installing backend dependencies..."
    npm install
    
    # Create environment file
    cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=5000
API_BASE_URL=https://${PROJECT_NAME}-backend.onrender.com

# Database Configuration
DB_HOST=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|/\.co$|.co|')
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=$SUPABASE_PASSWORD
DB_SSL=true

# JWT Configuration
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=https://${PROJECT_NAME}-frontend.vercel.app
ALLOWED_ORIGINS=https://${PROJECT_NAME}-frontend.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Multi-Tenant Configuration
BASE_DOMAIN=${BASE_DOMAIN:-vercel.app}
TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$

# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

# Admin Configuration
ADMIN_EMAIL=$ADMIN_EMAIL
EOF
    
    # Create .env.example for reference
    cp .env .env.example
    sed -i 's/=.*$/=/g' .env.example  # Remove values from example
    
    # Build application
    log "Building backend application..."
    npm run build
    
    cd ..
    log "Backend configuration completed."
}

# Frontend configuration
setup_frontend() {
    log "Configuring frontend application..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    log "Installing frontend dependencies..."
    npm install
    
    # Create environment file
    cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://${PROJECT_NAME}-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://${PROJECT_NAME}-frontend.vercel.app
NEXT_PUBLIC_BASE_DOMAIN=${BASE_DOMAIN:-vercel.app}
NEXT_PUBLIC_TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$

# Supabase Configuration (for client-side)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF
    
    # Create .env.local.example for reference
    cp .env.production .env.local.example
    sed -i 's/=.*$/=/g' .env.local.example  # Remove values from example
    
    cd ..
    log "Frontend configuration completed."
}

# Git setup
setup_git() {
    log "Setting up Git repository..."
    
    # Initialize git if not already done
    if [ ! -d ".git" ]; then
        git init
    fi
    
    # Add all files
    git add .
    
    # Create initial commit
    git commit -m "Initial setup for HRM SaaS deployment

- Backend configured with environment variables
- Frontend configured with production settings
- Database schema ready for Supabase
- Automated deployment setup complete"
    
    # Add remote if not already added
    if ! git remote get-url origin &> /dev/null; then
        git remote add origin "$GITHUB_REPO"
    fi
    
    log "Git repository configured."
}

# Create deployment instructions
create_deployment_instructions() {
    log "Creating deployment instructions..."
    
    cat > DEPLOYMENT_INSTRUCTIONS.md << EOF
# HRM SaaS Deployment Instructions

## Prerequisites Completed ✅
- Backend configured with environment variables
- Frontend configured with production settings
- Database schema created
- Git repository initialized

## Manual Steps Required

### 1. Supabase Database Setup
1. Go to https://supabase.com/dashboard
2. Create a new project
3. Go to SQL Editor and run the schema from \`/tmp/database_schema.sql\`
4. Note your project URL and API keys from Settings > API

### 2. Backend Deployment (Render)
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: \`hrm-saas-backend\`
   - Branch: \`main\`
   - Root Directory: \`backend\`
   - Runtime: \`Node\`
   - Build Command: \`npm install\`
   - Start Command: \`npm start\`
5. Add environment variables from \`backend/.env\`
6. Deploy and note your service URL

### 3. Frontend Deployment (Vercel)
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - Framework: \`Next.js\`
   - Root Directory: \`frontend\`
   - Build Command: \`npm run build\`
   - Output Directory: \`.next\`
5. Add environment variables from \`frontend/.env.production\`
6. Deploy and note your service URL

### 4. Test Deployment
1. Visit your Vercel URL
2. Try registering a new tenant
3. Test user login
4. Verify multi-tenant routing

### 5. Custom Domain (Optional)
If you have a custom domain:
1. Add domain in Vercel dashboard
2. Update DNS records as instructed
3. Update environment variables with your custom domain

## Verification Checklist
- [ ] Database schema created in Supabase
- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] User registration working
- [ ] User login working
- [ ] Multi-tenant routing working
- [ ] SSL certificates active

## Support
If you encounter issues:
1. Check service logs in each platform
2. Verify environment variables
3. Test API endpoints directly
4. Check Supabase database connectivity

## Next Steps
- Monitor performance and usage
- Set up monitoring and alerts
- Plan for Pro tier upgrade when needed
- Consider own server migration for cost savings

Deployment setup completed! 🎉
EOF
    
    log "Deployment instructions created."
}

# Create monitoring setup
setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Create health check script
    mkdir -p scripts
    cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Basic health check script
API_URL="${NEXT_PUBLIC_API_URL:-https://hrm-saas-backend.onrender.com}"
FRONTEND_URL="${NEXT_PUBLIC_APP_URL:-https://hrm-saas-frontend.vercel.app}"

echo "Checking HRM SaaS platform health..."

# Check backend
if curl -f "$API_URL/health" > /dev/null 2>&1; then
    echo "✅ Backend API: Healthy"
else
    echo "❌ Backend API: Unhealthy"
fi

# Check frontend
if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Unhealthy"
fi

echo "Health check completed."
EOF
    
    chmod +x scripts/health-check.sh
    
    log "Basic monitoring setup completed."
}

# Main execution
main() {
    log "Starting HRM SaaS free tier setup process..."
    
    check_prerequisites
    collect_inputs
    setup_database
    setup_backend
    setup_frontend
    setup_git
    create_deployment_instructions
    setup_monitoring
    
    log "Setup completed successfully! 🎉"
    echo -e "${GREEN}
╔══════════════════════════════════════════════════════════════╗
║                    Setup Complete!                           ║
╠══════════════════════════════════════════════════════════════╣
║ Next Steps:                                                 ║
║ 1. Create Supabase project and run database schema          ║
║ 2. Deploy backend to Render                                 ║
║ 3. Deploy frontend to Vercel                                ║
║ 4. Test the deployment                                      ║
║                                                              ║
║ Check DEPLOYMENT_INSTRUCTIONS.md for detailed steps        ║
║ Run ./scripts/health-check.sh to verify deployment          ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    info "Setup log saved to: $LOG_FILE"
}

# Run main function
main "$@"