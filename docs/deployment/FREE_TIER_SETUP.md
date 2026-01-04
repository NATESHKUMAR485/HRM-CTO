# Free Tier Setup Guide - Vercel + Render + Supabase

## Overview

This guide will walk you through setting up the HRM SaaS platform on the free tier using **Vercel** (frontend), **Render** (backend), and **Supabase** (database). This deployment is perfect for development, testing, or small-scale production use.

**Estimated Time:** 30 minutes  
**Cost:** $0/month  
**Difficulty:** Beginner-friendly  

## ✅ Prerequisites Checklist

Before starting, ensure you have:

- [ ] GitHub account (for code repository)
- [ ] Vercel account (free tier available)
- [ ] Render account (free tier available)
- [ ] Supabase account (free tier available)
- [ ] Domain name (optional, for custom domain)
- [ ] Code editor with Git integration

## 🏗️ Step 1: GitHub Repository Setup

### 1.1 Fork/Clone the Repository

```bash
# If you haven't already, clone the repository
git clone <your-repository-url>
cd hrm-saas

# Create your own repository
# Option 1: Fork on GitHub (recommended)
# Option 2: Create new repository and push code
```

### 1.2 Verify Project Structure

Ensure your project has this structure:
```
hrm-saas/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── next.config.ts
│   └── vercel.json
├── backend/
│   ├── src/
│   ├── package.json
│   └── .env.example
└── docs/deployment/
```

### 1.3 Push to GitHub

```bash
git add .
git commit -m "Initial setup for deployment"
git push origin main
```

## 🗄️ Step 2: Supabase Database Setup

### 2.1 Create New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Organization**: Your organization
   - **Name**: `hrm-saas-yourcompany`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. **Wait 2-3 minutes** for project initialization

### 2.2 Database Configuration

Once project is ready:

1. Go to **Settings** → **API**
2. Note down these values for later:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret)

### 2.3 Database Schema Setup

1. Go to **SQL Editor** in Supabase dashboard
2. Run the following SQL to create the database schema:

```sql
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

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified for now)
CREATE POLICY "Users can view own tenant data" ON users
    FOR SELECT USING (
        tenant_id = (
            SELECT tenant_id FROM users WHERE id = auth.uid()
        )
    );
```

3. Click "Run" to execute the schema
4. Verify tables are created in **Table Editor**

### 2.4 Database Backup Setup

1. Go to **Settings** → **Database**
2. **Backup Schedule**: Daily at 2:00 AM (free tier limitation)
3. **Backup Retention**: 7 days
4. **Point-in-time Recovery**: Available (free tier)

## 🚀 Step 3: Render Backend Deployment

### 3.1 Create Backend Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `hrm-saas-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`

### 3.2 Build and Deploy Settings

Configure these settings:

**Build and Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Environment:**
- **Node Version**: `18.x`

**Auto-Deploy**: `Yes`

### 3.3 Environment Variables

Add these environment variables in Render:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=your-supabase-host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
DB_SSL=true

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production-32-chars-min
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-32-chars-min
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.vercel.app
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Multi-Tenant Configuration
BASE_DOMAIN=vercel.app
TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3.4 Deploy Backend

1. Click "Create Web Service"
2. **Wait 5-10 minutes** for deployment
3. Monitor logs in real-time
4. Note your backend URL: `https://hrm-saas-backend.onrender.com`

### 3.5 Test Backend API

Test the deployment:

```bash
# Health check
curl https://hrm-saas-backend.onrender.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 🌐 Step 4: Vercel Frontend Deployment

### 4.1 Create Frontend Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Name**: `hrm-saas-frontend`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 4.2 Environment Variables

Add these environment variables in Vercel:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://hrm-saas-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://hrm-saas-frontend.vercel.app

# Multi-Tenant Configuration
NEXT_PUBLIC_BASE_DOMAIN=vercel.app
NEXT_PUBLIC_TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$

# Supabase Configuration (for client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4.3 Deploy Frontend

1. Click "Deploy"
2. **Wait 3-5 minutes** for deployment
3. Note your frontend URL: `https://hrm-saas-frontend.vercel.app`

### 4.4 Configure Custom Domain (Optional)

If you have a custom domain:

1. In Vercel project settings → **Domains**
2. Add your domain: `hrm.yourcompany.com`
3. Update DNS records:
   ```
   Type: CNAME
   Name: hrm
   Value: cname.vercel-dns.com
   ```

## 🔗 Step 5: Integration and Testing

### 5.1 Update Backend Environment

Update Render environment variables with actual frontend URL:

```bash
FRONTEND_URL=https://hrm-saas-frontend.vercel.app
ALLOWED_ORIGINS=https://hrm-saas-frontend.vercel.app
```

### 5.2 Test Complete Flow

1. **Frontend Test**:
   - Visit: `https://hrm-saas-frontend.vercel.app`
   - Should load without errors

2. **Registration Test**:
   - Try to register a new tenant
   - Check Supabase database for new records

3. **Authentication Test**:
   - Login with created user
   - Verify JWT tokens are set

### 5.3 Multi-Tenant Testing

Test subdomain functionality:

1. Register tenant: `acme`
2. Visit: `https://acme.hrm-saas-frontend.vercel.app`
3. Should route to `acme` tenant dashboard

## 📊 Step 6: Monitoring Setup

### 6.1 Vercel Analytics (Free)

1. In Vercel project → **Analytics**
2. Enable **Web Analytics** (free tier)
3. Monitor:
   - Page views
   - Core Web Vitals
   - Bandwidth usage

### 6.2 Render Monitoring

1. In Render service → **Metrics**
2. Monitor:
   - CPU usage
   - Memory usage
   - Response times
   - Error rates

### 6.3 Supabase Monitoring

1. In Supabase dashboard → **Reports**
2. Monitor:
   - Database performance
   - Storage usage
   - API usage
   - Active connections

## 🔍 Step 7: Initial Verification Tests

### 7.1 Health Check Script

Create and run this verification script:

```bash
#!/bin/bash

echo "=== HRM SaaS Free Tier Verification ==="

# Test backend health
echo "Testing backend..."
curl -f https://hrm-saas-backend.onrender.com/health || exit 1

# Test frontend
echo "Testing frontend..."
curl -f https://hrm-saas-frontend.vercel.app || exit 1

# Test database connection
echo "Testing database connection..."
# You would need to add a health endpoint that checks DB

echo "✅ All tests passed!"
```

### 7.2 Functional Tests

1. **User Registration**:
   - Register new tenant: `test-company`
   - Verify tenant created in Supabase
   - Verify admin user created

2. **User Authentication**:
   - Login with admin credentials
   - Verify JWT tokens received
   - Test protected routes

3. **Multi-Tenancy**:
   - Create multiple tenants
   - Verify data isolation
   - Test subdomain routing

## 💰 Free Tier Limitations & Workarounds

### Known Limitations

| Service | Free Tier Limitation | Workaround |
|---------|---------------------|------------|
| **Render** | 15 min cold starts | Upgrade to Pro when needed |
| **Supabase** | 500MB database limit | Monitor usage, cleanup old data |
| **Vercel** | 100GB bandwidth/month | Optimize images, use caching |
| **Render** | 750 hours/month | Use efficiently, monitor usage |

### Performance Considerations

- **Cold Start Time**: 5-15 seconds on first request
- **Response Time**: 200-500ms average
- **Database Connections**: Limited to 20 concurrent
- **Storage**: 500MB limit (monitor closely)

### When to Upgrade Alert

Monitor these metrics and upgrade when exceeded:

```bash
# Database Storage Alert
Supabase Storage > 400MB (80% of 500MB limit)

# Bandwidth Alert  
Vercel Bandwidth > 80GB (80% of 100GB limit)

# Cold Start Impact
User complaints about slow initial load

# Performance Requirements
Need response times < 200ms
Need > 50 concurrent users
```

## 🛡️ Security Configuration

### 7.1 SSL/HTTPS Verification

Ensure all services use HTTPS:

```bash
# Test HTTPS
curl -I https://hrm-saas-frontend.vercel.app
curl -I https://hrm-saas-backend.onrender.com
# Both should return: HTTP/2 200
```

### 7.2 CORS Configuration

Verify CORS settings in backend:

```javascript
// In backend .env, ensure proper CORS origins
ALLOWED_ORIGINS=https://hrm-saas-frontend.vercel.app,https://*.vercel.app
```

### 7.3 Environment Security

- **Never commit** `.env` files
- **Use strong** JWT secrets (32+ characters)
- **Enable SSL** for database connections
- **Regularly rotate** API keys

## 📈 Cost Expectations

### Free Tier Monthly Cost: $0

| Service | Free Tier Cost |
|---------|---------------|
| **Vercel Frontend** | $0 |
| **Render Backend** | $0 |
| **Supabase Database** | $0 |
| **Custom Domain** | $0 (if you have one) |
| **SSL Certificate** | $0 (Let's Encrypt) |
| **Total Monthly** | **$0** |

### Included Resources

- **Frontend**: 100GB bandwidth, unlimited deployments
- **Backend**: 750 hours compute, unlimited bandwidth
- **Database**: 500MB storage, 2GB transfer, daily backups
- **SSL**: Automatic certificates
- **Support**: Community support

## 🚀 Next Steps

### Immediate Next Steps

1. **Test thoroughly** with your use case
2. **Monitor performance** and usage
3. **Set up monitoring alerts** for upgrade triggers
4. **Plan upgrade path** if growing

### Review Documentation

- **[PRO_TIER_UPGRADE.md](./PRO_TIER_UPGRADE.md)** - When to upgrade
- **[MONITORING.md](./MONITORING.md)** - Monitoring setup
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues
- **[FAQ.md](./FAQ.md)** - Frequently asked questions

### Prepare for Growth

- **Monitor metrics** that indicate upgrade need
- **Plan migration** to Pro tier if needed
- **Consider own server** for long-term cost savings
- **Prepare backup** and recovery procedures

## ✅ Success Criteria

Your free tier deployment is successful when:

- [ ] **Frontend loads** at Vercel URL
- [ ] **Backend API responds** to health checks
- [ ] **Database connection** works (users can register)
- [ ] **Multi-tenant routing** works with subdomains
- [ ] **Authentication flow** completes successfully
- [ ] **SSL certificates** are active and valid
- [ ] **Performance** meets your requirements
- [ ] **Monitoring** is set up and receiving data

## 🆘 Troubleshooting

### Common Issues

**Backend not responding:**
- Check Render deployment logs
- Verify environment variables
- Test database connection

**Database connection errors:**
- Verify Supabase credentials
- Check SSL settings
- Confirm database is accessible

**Frontend not loading:**
- Check Vercel build logs
- Verify environment variables
- Test API endpoint from frontend

**CORS errors:**
- Update ALLOWED_ORIGINS in backend
- Include both production and development URLs
- Clear browser cache and cookies

### Getting Help

1. **Check logs** in each service dashboard
2. **Review** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. **Test locally** to isolate issues
4. **Contact support** through service dashboards

---

**🎉 Congratulations!** Your HRM SaaS platform is now deployed on the free tier. Start testing and monitoring to prepare for future upgrades.