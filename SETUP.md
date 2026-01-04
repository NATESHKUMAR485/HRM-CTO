# HRM SaaS - Setup Guide

This guide will walk you through setting up the HRM SaaS platform for development and production.

## Quick Start (Development)

### 1. Prerequisites
- Node.js 18 or higher
- Docker and Docker Compose
- Git

### 2. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd hrm-saas

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Start PostgreSQL Database

```bash
# From the root directory
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps
```

### 4. Configure Environment Variables

**Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env with your settings (default values work for local development)
```

**Frontend:**
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your settings (default values work for local development)
```

### 5. Run Database Migrations

```bash
cd backend
npm run dev &
# Wait for server to start, then in another terminal:
npm run migrate
```

### 6. Start Development Servers

```bash
# Terminal 1 - Backend (from backend directory)
npm run dev

# Terminal 2 - Frontend (from frontend directory)
npm run dev
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## First Steps

1. Navigate to http://localhost:3000
2. Click "Get Started" or "Register"
3. Fill in the registration form:
   - Company Name: Your Company
   - Subdomain: yourcompany (will create yourcompany.hrm-saas.com)
   - Email: admin@yourcompany.com
   - Password: (minimum 8 characters)
   - First Name & Last Name
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the dashboard

## Production Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Frontend (Vercel)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Add environment variables:
     - `NEXT_PUBLIC_API_URL`: Your backend API URL
     - `NEXT_PUBLIC_APP_URL`: Your frontend URL
   - Deploy

#### Backend (Railway)

1. **Create Railway Project**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Backend Service**
   - Set root directory to `backend`
   - Add environment variables from `.env.example`
   - Important variables to update:
     - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
     - `JWT_ACCESS_SECRET` (use a strong random string)
     - `JWT_REFRESH_SECRET` (use a different strong random string)
     - `FRONTEND_URL` (your Vercel URL)
     - `ALLOWED_ORIGINS` (your Vercel URL)

3. **Add PostgreSQL Database**
   - In Railway, click "New"
   - Select "Database" -> "PostgreSQL"
   - Railway will automatically set environment variables

4. **Run Migrations**
   - After deployment, go to the service
   - Open the deployment logs
   - Use Railway CLI or run migration manually

### Option 2: Self-Hosted (VPS/Cloud)

#### Requirements
- Ubuntu 20.04+ server
- Node.js 18+
- PostgreSQL 13+
- Nginx
- PM2 (process manager)
- SSL certificate (Let's Encrypt)

#### Steps

1. **Set up PostgreSQL**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo -u postgres createdb hrm_saas
   sudo -u postgres createuser hrm_user
   sudo -u postgres psql
   ALTER USER hrm_user WITH PASSWORD 'your-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE hrm_saas TO hrm_user;
   \q
   ```

2. **Clone and Build Backend**
   ```bash
   cd /var/www
   git clone <your-repo-url> hrm-saas
   cd hrm-saas/backend
   npm install
   npm run build
   ```

3. **Configure Backend Environment**
   ```bash
   cp .env.example .env
   nano .env
   # Update all variables for production
   ```

4. **Run Migrations**
   ```bash
   npm run migrate
   ```

5. **Start Backend with PM2**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name hrm-backend
   pm2 save
   pm2 startup
   ```

6. **Build Frontend**
   ```bash
   cd /var/www/hrm-saas/frontend
   npm install
   npm run build
   ```

7. **Configure Nginx**
   ```nginx
   # /etc/nginx/sites-available/hrm-saas
   
   # Backend
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   
   # Frontend
   server {
       listen 80;
       server_name yourdomain.com *.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

8. **Enable Site and SSL**
   ```bash
   sudo ln -s /etc/nginx/sites-available/hrm-saas /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   
   # Install Certbot for SSL
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
   ```

9. **Start Frontend with PM2**
   ```bash
   cd /var/www/hrm-saas/frontend
   pm2 start npm --name hrm-frontend -- start
   pm2 save
   ```

## Environment Variables Reference

### Backend (.env)

```env
# Server
NODE_ENV=production
PORT=5000
API_BASE_URL=https://api.yourdomain.com

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=hrm_saas
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_SSL=true

# JWT (IMPORTANT: Use strong random strings in production)
JWT_ACCESS_SECRET=<generate-random-string-64-chars>
JWT_REFRESH_SECRET=<generate-random-string-64-chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Multi-Tenant
BASE_DOMAIN=yourdomain.com
TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
```

### Frontend (.env.local or Vercel Environment Variables)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Generating Secure JWT Secrets

```bash
# Generate secure random strings for JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this command twice to generate two different secrets for access and refresh tokens.

## Database Backup

```bash
# Backup
pg_dump -U hrm_user hrm_saas > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
psql -U hrm_user hrm_saas < backup_20240104_120000.sql
```

## Troubleshooting

### Database Connection Issues

1. Check PostgreSQL is running:
   ```bash
   docker-compose ps  # For Docker
   sudo systemctl status postgresql  # For system PostgreSQL
   ```

2. Verify database credentials in `.env`

3. Check if database exists:
   ```bash
   docker exec -it hrm-saas-db psql -U postgres -l
   ```

### Backend Won't Start

1. Check logs:
   ```bash
   cd backend
   npm run dev
   # Look for error messages
   ```

2. Verify all dependencies are installed:
   ```bash
   npm install
   ```

3. Check port 5000 is not in use:
   ```bash
   lsof -i :5000
   ```

### Frontend Build Issues

1. Clear Next.js cache:
   ```bash
   cd frontend
   rm -rf .next
   npm run build
   ```

2. Verify environment variables:
   ```bash
   cat .env.local
   ```

### Migration Issues

1. Check database connection
2. Verify migration files in `backend/src/database/migrations/`
3. Check migration logs for errors

## Security Checklist

- [ ] Changed default JWT secrets to strong random strings
- [ ] Updated database password
- [ ] Configured CORS for your domain only
- [ ] Enabled SSL/TLS (HTTPS)
- [ ] Set up database backups
- [ ] Configured rate limiting appropriately
- [ ] Reviewed and updated all environment variables
- [ ] Set up monitoring and logging
- [ ] Configured firewall rules
- [ ] Enabled PostgreSQL SSL connection

## Support

For issues and questions:
- Check the main README.md
- Review this setup guide
- Open an issue on GitHub

## Next Steps

After successful setup:
1. Explore the dashboard
2. Review the API endpoints
3. Customize the tenant settings
4. Add employee management features
5. Implement payroll processing
6. Set up email notifications
