# Migration Guide - Managed Services to Own Server

## Overview

This guide provides step-by-step instructions for migrating your HRM SaaS platform from managed services (Vercel + Render + Supabase) to your own server infrastructure. The migration is designed to be safe, reversible, and minimize downtime.

**Migration Timeline:** 1-2 hours actual migration + 48 hours monitoring  
**Planned Downtime:** 15-30 minutes (during DNS cutover)  
**Risk Level:** Low (with proper preparation)  
**Rollback Time:** 5 minutes if needed  

## 🎯 Migration Strategy

### Blue-Green Deployment Approach

1. **Green Environment** (New): Set up own server alongside existing
2. **Testing Phase**: Verify new environment works perfectly
3. **Blue Environment** (Old): Keep existing services running
4. **Cutover**: Switch DNS to point to new environment
5. **Monitoring Phase**: Watch for 48 hours
6. **Cleanup**: Decommission old services after confidence period

### Migration Philosophy

- **Zero Data Loss**: All data replicated before cutover
- **Quick Rollback**: DNS can be reverted in 5 minutes
- **Thorough Testing**: New environment fully tested before cutover
- **User Communication**: Clear timeline and expectations
- **Monitoring**: Enhanced monitoring during transition

## 📅 Migration Timeline

### Phase 1: Preparation (1-2 Days Before)

**Day -2 to Day -1:**
- [ ] Server provisioning and initial setup
- [ ] Pre-migration checklist completion
- [ ] Backup procedures testing
- [ ] Configuration documentation
- [ ] Testing plan finalization
- [ ] Rollback plan preparation
- [ ] Team notification and training

### Phase 2: Data Export (Day Before)

**Evening Before Migration:**
- [ ] Database backup from Supabase
- [ ] File backup from all services
- [ ] Configuration export
- [ ] Verification of backup integrity
- [ ] Test restore procedures

### Phase 3: Own Server Setup (Migration Day)

**Morning of Migration:**
- [ ] Complete server configuration
- [ ] Database import and verification
- [ ] Application deployment
- [ ] SSL certificate setup
- [ ] Initial testing and validation

### Phase 4: Cutover (Go Live)

**Afternoon of Migration:**
- [ ] Final verification tests
- [ ] DNS update to point to new server
- [ ] User communication
- [ ] Monitoring activation
- [ ] Issue resolution procedures

### Phase 5: Post-Migration (First 48 Hours)

**Days 1-2 After Migration:**
- [ ] Continuous monitoring
- [ ] Performance verification
- [ ] User feedback collection
- [ ] Error tracking and resolution
- [ ] Old services cleanup

## 🏗️ Phase 1: Preparation (1-2 Days Before)

### 1.1 Server Provisioning

**Timeline:** Day -2, 1 hour

Follow [OWN_SERVER_SETUP.md](./OWN_SERVER_SETUP.md) to provision your VPS:

```bash
# Quick setup checklist
□ VPS created (DigitalOcean recommended)
□ SSH access configured
□ Basic security setup completed
□ PostgreSQL installed and configured
□ Node.js environment ready
□ NGINX configured with placeholder
```

### 1.2 Pre-Migration Checklist

**Timeline:** Day -1, 30 minutes

Complete this comprehensive checklist:

#### Technical Readiness
- [ ] **Current Performance Baseline**
  ```bash
  # Record current performance metrics
  curl -w "@curl-format.txt" -o /dev/null -s https://your-frontend.vercel.app
  curl -w "@curl-format.txt" -o /dev/null -s https://your-backend.onrender.com/api/health
  
  # Document results:
  # Frontend: ___ms
  # Backend: ___ms
  # Database: ___ms
  ```

- [ ] **Storage Analysis**
  ```bash
  # Check current storage usage
  # Supabase dashboard → Storage
  # Document: ___MB used of ___MB available
  ```

- [ ] **Bandwidth Usage**
  ```bash
  # Check current bandwidth
  # Vercel dashboard → Analytics
  # Document: ___GB used this month
  ```

#### Backup Verification
- [ ] **Database Backup Test**
  ```bash
  # Test backup creation and restore
  pg_dump "postgresql://..." > test-backup.sql
  # Verify backup file size and integrity
  ```

- [ ] **File Backup Test**
  ```bash
  # Create test backup of all files
  tar -czf test-files-backup.tar.gz /path/to/files
  # Verify backup integrity
  ```

#### Configuration Documentation
- [ ] **Environment Variables Export**
  ```bash
  # Document all environment variables
  # Render dashboard → Environment
  # Vercel dashboard → Environment Variables
  
  # Create migration document:
  FRONTEND_ENV_VARS=...
  BACKEND_ENV_VARS=...
  ```

- [ ] **Domain Configuration**
  ```bash
  # Document current domain setup
  # DNS records for custom domain (if any)
  # Subdomain configurations
  # SSL certificate details
  ```

#### Team Preparation
- [ ] **Migration Team Briefing**
  - [ ] Migration timeline shared
  - [ ] Roles and responsibilities assigned
  - [ ] Communication channels established
  - [ ] Escalation procedures documented

- [ ] **User Communication Plan**
  - [ ] Migration announcement prepared
  - [ ] Downtime window communicated
  - [ ] Support contact information shared
  - [ ] Expected improvements highlighted

### 1.3 Testing Plan

**Timeline:** Day -1, 1 hour

Create comprehensive testing plan:

#### Functional Testing
```bash
# Test scenarios to validate after migration
□ User registration flow
□ User authentication flow
□ Multi-tenant routing (subdomains)
□ Role-based access control
□ API endpoint functionality
□ Database operations
□ File upload/download
□ Email notifications
```

#### Performance Testing
```bash
# Performance benchmarks to meet
□ Frontend load time < 200ms
□ Backend API response < 150ms
□ Database queries < 50ms
□ No cold start delays
□ Concurrent user handling (10+ users)
```

#### Integration Testing
```bash
# External service testing
□ Third-party API connections
□ Email service functionality
□ File storage access
□ SSL certificate validation
□ DNS resolution
```

### 1.4 Rollback Plan

**Timeline:** Day -1, 30 minutes

Create detailed rollback procedures:

#### Quick Rollback (5 minutes)
```bash
# DNS reversion procedure
1. Access domain registrar/DNS provider
2. Update A record: yourdomain.com → old-server-ip
3. Update CNAME: *.yourdomain.com → old-server-ip
4. Clear DNS cache locally: ipconfig /flushdns
5. Verify: nslookup yourdomain.com
```

#### Service Restoration
```bash
# If backend needs restoration
1. Render dashboard → Redeploy latest version
2. Verify environment variables
3. Test health endpoint
4. Update DNS if needed
```

#### Database Rollback
```bash
# If database issues occur
1. Use last known good backup
2. Restore to own server
3. Test data integrity
4. Update connection strings
```

## 💾 Phase 2: Data Export (Day Before)

### 2.1 Database Backup Procedure

**Timeline:** Evening before migration, 30 minutes

#### Complete Database Export

```bash
# Connect to Supabase and create full backup
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  --no-owner \
  --no-privileges \
  --schema=public \
  > hrm_saas_migration_backup.sql

# Verify backup
wc -l hrm_saas_migration_backup.sql
# Should be several thousand lines for full database

# Compress backup
gzip hrm_saas_migration_backup.sql

# Upload to server for safety
scp hrm_saas_migration_backup.sql.gz user@your-server-ip:/home/user/backups/
```

#### Backup Verification

```bash
# Test backup integrity
gunzip -t hrm_saas_migration_backup.sql.gz

# Quick content verification
zcat hrm_saas_migration_backup.sql.gz | head -50
zcat hrm_saas_migration_backup.sql.gz | grep -c "CREATE TABLE"

# Expected: Multiple CREATE TABLE statements
# Expected: Data INSERT statements
# Expected: Index creation statements
```

### 2.2 Configuration Export

**Timeline:** Evening before migration, 15 minutes

#### Environment Variables

```bash
# Export from Render
# Backend Environment Variables:
DB_HOST=db.xxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=[redacted]
JWT_ACCESS_SECRET=[redacted]
JWT_REFRESH_SECRET=[redacted]
# ... (all other variables)

# Export from Vercel
# Frontend Environment Variables:
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
# ... (all other variables)
```

#### Domain Configuration

```bash
# Document current DNS settings
# Custom domain (if any):
A Record: yourdomain.com → [old-ip]
CNAME: www.yourdomain.com → yourdomain.com
CNAME: *.yourdomain.com → your-frontend.vercel.app

# SSL certificates:
# Current: Let's Encrypt via Vercel
# New: Will be Let's Encrypt on own server
```

### 2.3 File Backup (If Applicable)

**Timeline:** Evening before migration, 15 minutes

```bash
# If using file storage, backup all files
# This may include:
# - User uploaded documents
# - Employee photos
# - Company logos
# - Generated reports

# Example backup command (adjust paths as needed)
tar -czf files_backup_$(date +%Y%m%d).tar.gz /path/to/uploaded/files/

# Upload to server
scp files_backup_*.tar.gz user@your-server-ip:/home/user/backups/
```

## 🖥️ Phase 3: Own Server Setup (Migration Day)

### 3.1 Complete Server Configuration

**Timeline:** Morning of migration, 2 hours

Follow the complete [OWN_SERVER_SETUP.md](./OWN_SERVER_SETUP.md) guide:

#### Quick Setup Checklist
```bash
□ VPS created and accessible
□ PostgreSQL installed and configured
□ Node.js and PM2 installed
□ NGINX configured with SSL
□ Application deployed and running
□ Database schema created
□ Environment variables configured
□ Health checks passing
```

### 3.2 Database Import

**Timeline:** Morning of migration, 30 minutes

#### Import Database Backup

```bash
# Upload backup to server if not already there
scp hrm_saas_migration_backup.sql.gz user@your-server-ip:/home/user/backups/

# Connect to server
ssh user@your-server-ip

# Import database
gunzip -c /home/user/backups/hrm_saas_migration_backup.sql.gz | \
psql -U hrm_user -d hrm_saas -h localhost

# Verify import
psql -U hrm_user -d hrm_saas -c "SELECT COUNT(*) FROM tenants;"
psql -U hrm_user -d hrm_saas -c "SELECT COUNT(*) FROM users;"
```

#### Database Verification

```bash
# Check data integrity
psql -U hrm_user -d hrm_saas -c "
SELECT 
  'tenants' as table_name, COUNT(*) as record_count 
FROM tenants
UNION ALL
SELECT 
  'users' as table_name, COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
  'roles' as table_name, COUNT(*) as record_count 
FROM roles;
"

# Expected output should match original database counts
```

### 3.3 Application Deployment

**Timeline:** Morning of migration, 45 minutes

#### Backend Deployment

```bash
# Deploy backend application
cd /home/hrm-saas/apps/hrm-saas/backend

# Install dependencies
npm install --production

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Verify application
curl -f https://yourdomain.com/health
# Expected: {"status": "ok", ...}
```

#### Frontend Deployment

```bash
# Build and deploy frontend
cd /home/hrm-saas/apps/hrm-saas/frontend

# Create production environment
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
NEXT_PUBLIC_TENANT_SUBDOMAIN_REGEX=^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
EOF

# Build production version
npm run build

# Copy to web directory
sudo cp -r .next /var/www/hrm-saas/
sudo cp -r public /var/www/hrm-saas/
sudo chown -R www-data:www-data /var/www/hrm-saas
```

### 3.4 SSL Certificate Setup

**Timeline:** Morning of migration, 15 minutes

```bash
# Stop NGINX temporarily
sudo systemctl stop nginx

# Obtain SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d *.yourdomain.com

# Start NGINX
sudo systemctl start nginx

# Verify SSL
curl -I https://yourdomain.com
# Expected: HTTP/2 200
```

### 3.5 Initial Verification Tests

**Timeline:** Morning of migration, 30 minutes

#### System Health Check

```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status

# Check ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :5432
```

#### Application Tests

```bash
# Test backend health
curl -f https://yourdomain.com/health
# Expected: {"status": "ok", ...}

# Test frontend
curl -f https://yourdomain.com
# Expected: HTML content loads

# Test database connection
curl -X POST https://yourdomain.com/api/auth/test-db
# Expected: {"success": true, ...}
```

#### Multi-Tenant Tests

```bash
# Test subdomain routing
curl -f https://test.yourdomain.com
# Should load the application for 'test' tenant

# Test tenant isolation
curl -f https://different.yourdomain.com
# Should load different tenant or handle appropriately
```

## 🔄 Phase 4: Cutover (Go Live)

### 4.1 Final Pre-Cutover Verification

**Timeline:** 30 minutes before cutover

#### Complete System Test

```bash
# Full application test
□ Frontend loads correctly
□ Backend API responds
□ Database queries work
□ User registration functional
□ Authentication works
□ Multi-tenant routing works
□ SSL certificates valid
□ Performance meets requirements
```

#### Performance Benchmarking

```bash
# Compare with original performance
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com
# Document: Frontend ___ms

curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/health
# Document: Backend ___ms

# Should be equal or better than original
```

### 4.2 DNS Update Procedure

**Timeline:** Go-live moment, 5 minutes

#### DNS Cutover Steps

```bash
# 1. Update A record (custom domain)
# In your DNS provider:
# Name: @
# Type: A
# Value: [your-new-server-ip]
# TTL: 300 (5 minutes)

# 2. Update CNAME for subdomains
# Name: *
# Type: CNAME  
# Value: yourdomain.com
# TTL: 300

# 3. Update www record
# Name: www
# Type: CNAME
# Value: yourdomain.com
# TTL: 300

# 4. Verify DNS propagation
nslookup yourdomain.com
# Should return your new server IP
```

#### DNS Propagation Verification

```bash
# Check from multiple locations
# Use online DNS checker tools:
# https://dnschecker.org/
# https://www.whatsmydns.net/

# Local verification
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1

# Should return new server IP
```

### 4.3 User Communication

**Timeline:** During cutover, 10 minutes

#### Migration Announcement

```bash
# Send to all users:
Subject: HRM SaaS Platform - Scheduled Maintenance Complete

Dear Users,

We have successfully completed the migration of our HRM SaaS platform to our new infrastructure. 

✅ What's Improved:
- Faster response times (50% improvement)
- Better reliability (99.95% uptime)
- Enhanced security features
- Improved scalability

🔧 What Changed:
- Platform is now hosted on our dedicated servers
- All existing data and settings are preserved
- No action required from your side

⚡ Access Your Account:
Visit: https://yourdomain.com

If you experience any issues, please contact support immediately.

Thank you for your patience during this migration.

Best regards,
HRM SaaS Team
```

### 4.4 Post-Cutover Monitoring

**Timeline:** First 2 hours after cutover, continuous monitoring

#### Immediate Monitoring

```bash
# Monitor every 5 minutes for first 2 hours
□ Application accessibility
□ Response times
□ Error rates
□ Database performance
□ Server resources
□ User feedback
```

#### Key Metrics to Watch

```bash
# Response time monitoring
curl -w "%{time_total}" -o /dev/null -s https://yourdomain.com
# Target: < 200ms

# Error rate monitoring
curl -s https://yourdomain.com/api/health | jq '.status'
# Target: "ok"

# Database performance
psql -U hrm_user -d hrm_saas -c "SELECT COUNT(*) FROM users;"
# Target: < 100ms
```

## 📊 Phase 5: Post-Migration (First 48 Hours)

### 5.1 Continuous Monitoring

**Timeline:** Days 1-2, continuous monitoring

#### Hourly Health Checks

```bash
# Create monitoring script
#!/bin/bash
LOG_FILE="/home/hrm-saas/logs/migration-monitor.log"

# Check application
response=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/health)
if [ $response -eq 200 ]; then
    echo "$(date): Application OK" >> $LOG_FILE
else
    echo "$(date): Application ERROR (HTTP $response)" >> $LOG_FILE
    # Send alert
fi

# Check performance
time_total=$(curl -w "%{time_total}" -o /dev/null -s https://yourdomain.com)
if (( $(echo "$time_total > 0.5" | bc -l) )); then
    echo "$(date): Performance WARNING ($time_total seconds)" >> $LOG_FILE
fi
```

#### User Feedback Collection

```bash
# Monitor user feedback channels
□ Support ticket volume
□ User satisfaction surveys
□ Performance complaints
□ Feature requests
□ Bug reports

# Set up feedback collection
# - Survey tool (Typeform, Google Forms)
# - Support email monitoring
# - Social media monitoring
```

### 5.2 Performance Verification

**Timeline:** Day 1, 4 hours after migration

#### Performance Comparison

```bash
# Compare with pre-migration metrics
Pre-Migration:
- Frontend: 250ms
- Backend: 180ms  
- Database: 75ms

Post-Migration:
- Frontend: ___ms
- Backend: ___ms
- Database: ___ms

# Should be equal or better
```

#### Load Testing

```bash
# Test with multiple concurrent users
# Use tools like: ab (Apache Bench), wrk, or load testing services

# Example with Apache Bench
ab -n 100 -c 10 https://yourdomain.com/
# Monitor:
# - Requests per second
# - Time per request
# - Failed requests
```

### 5.3 Error Tracking

**Timeline:** Days 1-2, continuous monitoring

#### Log Monitoring

```bash
# Monitor application logs
pm2 logs hrm-saas-backend --lines 50

# Monitor NGINX logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### Error Alerting

```bash
# Set up automated error detection
grep -i "error\|exception\|failed" /var/log/nginx/error.log | \
tail -10

# Monitor PM2 for restarts
pm2 monit

# Check for database connection issues
psql -U hrm_user -d hrm_saas -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

### 5.4 Issue Resolution

**Timeline:** As needed, immediate response

#### Common Post-Migration Issues

**Issue: 502 Bad Gateway**
```bash
# Diagnosis
sudo systemctl status nginx
pm2 status

# Resolution
sudo systemctl restart nginx
pm2 restart hrm-saas-backend
```

**Issue: Database Connection Errors**
```bash
# Diagnosis
psql -U hrm_user -d hrm_saas -h localhost

# Resolution
sudo systemctl restart postgresql
# Check environment variables
```

**Issue: Slow Performance**
```bash
# Diagnosis
top
htop
iotop

# Resolution
# Optimize database queries
# Increase server resources
# Check network connectivity
```

### 5.5 Old Services Cleanup

**Timeline:** After 48-hour confidence period

#### Service Decommissioning

```bash
# After confirming migration success:

# 1. Cancel Render service
# - Log into Render dashboard
# - Cancel backend service
# - Confirm cancellation

# 2. Cancel Vercel project
# - Log into Vercel dashboard  
# - Delete project or downgrade to free
# - Confirm changes

# 3. Downgrade Supabase
# - Log into Supabase dashboard
# - Change plan back to free (if desired)
# - Confirm plan change

# 4. Update DNS records
# - Remove old service references
# - Keep only your domain DNS records
```

#### Data Archive

```bash
# Archive old service configurations
# - Export environment variables
# - Save deployment configurations
# - Archive for future reference

# Example archive command
mkdir -p /home/hrm-saas/archive/$(date +%Y%m%d)
cp -r /path/to/old/configs /home/hrm-saas/archive/$(date +%Y%m%d)/
```

## 🔄 Rollback Procedures

### Emergency Rollback (5 minutes)

**When to Rollback:**
- Application completely inaccessible
- Database corruption detected
- Critical data loss
- Performance degradation > 50%

#### Immediate Actions (First 5 minutes)

```bash
# 1. Revert DNS immediately
# Access DNS provider:
# A Record: yourdomain.com → [old-vercel-ip]
# CNAME: *.yourdomain.com → [old-vercel-domain]

# 2. Verify DNS propagation
nslookup yourdomain.com
# Should show old IP within 5 minutes

# 3. Test old services
curl -f https://your-old-frontend.vercel.app
curl -f https://your-old-backend.onrender.com/health

# 4. Send user communication
# Subject: Emergency Rollback - Service Restored
```

#### Service Restoration

```bash
# If old services need restoration:
# 1. Re-deploy to Render
git push origin main
# Wait for deployment

# 2. Re-deploy to Vercel  
git push origin main
# Wait for deployment

# 3. Verify database still accessible
# Supabase should still have all data
```

### Planned Rollback (15 minutes)

**When to Rollback:**
- Non-critical issues discovered
- Performance below expectations
- User complaints about new system
- Configuration errors

#### Rollback Process

```bash
# 1. DNS Revert (5 minutes)
# Update DNS to point to old services

# 2. Environment Update (5 minutes)
# Update old services with latest code
git push origin main

# 3. Verification (5 minutes)
# Test old services thoroughly

# 4. User Communication
# Explain rollback reason and next steps
```

## ✅ Migration Success Criteria

### Technical Success Metrics

- [ ] **Application Accessibility**: 100% uptime during migration window
- [ ] **Performance**: Equal or better than pre-migration performance
- [ ] **Data Integrity**: 100% data preservation
- [ ] **Functionality**: All features working correctly
- [ ] **Security**: SSL certificates active and valid

### User Experience Metrics

- [ ] **User Complaints**: < 5% of user base reports issues
- [ ] **Support Tickets**: Normal or reduced volume post-migration
- [ ] **User Satisfaction**: No decrease in satisfaction scores
- [ ] **Feature Usage**: Normal usage patterns maintained

### Business Success Metrics

- [ ] **Cost Savings**: Achieved projected monthly savings
- [ ] **Scalability**: Improved capacity for growth
- [ ] **Control**: Full control over infrastructure achieved
- [ ] **Compliance**: All compliance requirements met

## 📊 Migration Metrics

### Pre-Migration Baseline

```
Performance Metrics:
- Frontend Response Time: ___ms
- Backend Response Time: ___ms
- Database Query Time: ___ms
- Uptime: ___%

Resource Usage:
- Database Storage: ___MB
- Bandwidth: ___GB/month
- Monthly Cost: $___

User Metrics:
- Active Users: ___
- Daily Logins: ___
- Support Tickets: ___
```

### Post-Migration Results

```
Performance Metrics:
- Frontend Response Time: ___ms (improvement: ___%)
- Backend Response Time: ___ms (improvement: ___%)
- Database Query Time: ___ms (improvement: ___%)
- Uptime: ___%

Resource Usage:
- Database Storage: ___MB
- Bandwidth: Unlimited
- Monthly Cost: $___ (savings: $___)

User Metrics:
- Active Users: ___
- Daily Logins: ___
- Support Tickets: ___
```

## 🎯 Lessons Learned

### Document for Future

After successful migration, document:

- **What Worked Well**
  - Preparation steps that were effective
  - Testing procedures that caught issues
  - Communication strategies that worked

- **What Could Improve**
  - Areas that caused delays
  - Issues encountered and resolutions
  - Recommendations for future migrations

- **Best Practices**
  - Timeline that worked best
  - Team coordination strategies
  - Risk mitigation techniques

---

**🎉 Migration Complete!** Your HRM SaaS platform is now running on your own infrastructure with full control and cost savings.