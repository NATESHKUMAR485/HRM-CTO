# Rollback Plan - Emergency Procedures

## Overview

This document provides detailed rollback procedures for emergency situations during deployment, upgrades, or migrations. The goal is to restore service quickly with minimal data loss and user impact.

**Rollback Time Target:** 5 minutes for DNS, 15 minutes for full service restoration  
**Risk Level:** Low (with proper preparation)  
**User Impact:** Minimal (brief service interruption)  
**Data Loss:** None (with proper backup procedures)  

## 🚨 When to Rollback

### Decision Criteria

#### Immediate Rollback Triggers
- **Application Completely Down**
  - Backend API returning 500 errors for > 5 minutes
  - Frontend not loading for > 5 minutes
  - Database connection failures

- **Data Integrity Issues**
  - Database corruption detected
  - Data loss confirmed
  - Invalid data in critical tables

- **Security Breaches**
  - Unauthorized access detected
  - Certificate compromise
  - Malicious code deployment

#### Planned Rollback Triggers
- **Performance Degradation**
  - Response times > 50% slower than baseline
  - User complaints > 10% of active users
  - Support ticket volume > 2x normal

- **Feature Broken**
  - Critical functionality not working
  - Authentication system failures
  - Multi-tenant routing issues

- **Business Impact**
  - Revenue loss from downtime
  - Customer churn due to issues
  - SLA breaches

### Rollback Decision Matrix

| Issue Severity | Service Impact | Rollback Time | User Communication |
|----------------|----------------|---------------|-------------------|
| **Critical** | Service down | 5 minutes | Immediate |
| **High** | Major features broken | 15 minutes | Within 30 minutes |
| **Medium** | Performance issues | 1 hour | Within 2 hours |
| **Low** | Minor issues | 24 hours | Next business day |

## ⚡ Immediate Actions (First 5 Minutes)

### Step 1: Assess Situation (30 seconds)

```bash
# Quick health check
curl -f https://yourdomain.com/health
curl -f https://yourdomain.com/api/health
curl -f https://yourdomain.com

# Expected: All should return HTTP 200
# If any fail: Rollback immediately
```

### Step 2: Alert Team (1 minute)

```bash
# Notify team immediately
# Slack/Discord/Email:
# 🚨 ROLLBACK INITIATED
# Time: $(date)
# Issue: [Brief description]
# Action: Reverting to previous version
# ETA: 5 minutes
```

### Step 3: Initiate DNS Rollback (2 minutes)

#### Free Tier Rollback (Vercel + Render + Supabase)

```bash
# If you have custom domain
# DNS Provider Console:
# A Record: yourdomain.com → [old-vercel-ip]
# CNAME: *.yourdomain.com → [old-vercel-domain]
# TTL: 300 (5 minutes)

# If using service domains
# Just wait 5 minutes for TTL expiry
# old-frontend.vercel.app (automatic)
# old-backend.onrender.com (automatic)
```

#### Pro Tier Rollback

```bash
# Same process as free tier
# Services can be downgraded immediately
# DNS points to old service URLs
```

#### Own Server Rollback

```bash
# DNS Revert
# A Record: yourdomain.com → [previous-server-ip]
# CNAME: *.yourdomain.com → [previous-server-ip]
# TTL: 300
```

### Step 4: Verify Rollback (1.5 minutes)

```bash
# Test old services
curl -f https://old-frontend.vercel.app
curl -f https://old-backend.onrender.com/health

# Check DNS propagation
nslookup yourdomain.com
# Should show old IP within 5 minutes
```

## 🔄 DNS Reversion Procedure

### Custom Domain Rollback

#### Step 1: Access DNS Provider

```bash
# Common DNS providers:
# - Cloudflare: https://dash.cloudflare.com
# - Route 53: https://console.aws.amazon.com/route53
# - Namecheap: https://ap.www.namecheap.com
# - GoDaddy: https://sso.godaddy.com
```

#### Step 2: Update DNS Records

```bash
# A Record Update
# Name: @
# Type: A
# Value: [OLD_SERVER_IP]
# TTL: 300 (5 minutes)

# CNAME Update for subdomains
# Name: *
# Type: CNAME
# Value: [OLD_SERVICE_DOMAIN]
# TTL: 300

# www Record Update  
# Name: www
# Type: CNAME
# Value: [OLD_SERVICE_DOMAIN]
# TTL: 300
```

#### Step 3: DNS Propagation Check

```bash
# Check from multiple DNS servers
nslookup yourdomain.com 8.8.8.8
nslookup yourdomain.com 1.1.1.1
nslookup yourdomain.com [your-dns-server]

# Should return OLD_SERVER_IP
# Use online tools:
# https://dnschecker.org/
# https://www.whatsmydns.net/
```

### Service Domain Rollback

#### Free/Pro Tier Services

```bash
# No DNS changes needed
# Old service URLs automatically active:
# https://your-frontend.vercel.app
# https://your-backend.onrender.com
# https://your-project.supabase.co

# Just wait for DNS TTL expiry (5-15 minutes)
```

## 🔧 Service Reactivation Procedures

### Render Backend Reactivation

#### Step 1: Redeploy to Render

```bash
# Method 1: Git push trigger
git push origin main
# Render automatically redeploys

# Method 2: Manual redeploy
# 1. Log into Render dashboard
# 2. Select your service
# 3. Click "Manual Deploy" → "Deploy latest commit"

# Method 3: Environment fix
# 1. Update environment variables if needed
# 2. Redeploy service
```

#### Step 2: Verify Backend

```bash
# Test health endpoint
curl -f https://your-backend.onrender.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}

# Test API endpoints
curl -f https://your-backend.onrender.com/api/auth/test-db
# Should return database connection status
```

### Vercel Frontend Reactivation

#### Step 1: Redeploy to Vercel

```bash
# Method 1: Git push trigger
git push origin main
# Vercel automatically redeploys

# Method 2: Manual redeploy
# 1. Log into Vercel dashboard
# 2. Select your project
# 3. Click "Deployments" → "Redeploy"

# Method 3: Environment fix
# 1. Update environment variables if needed
# 2. Redeploy project
```

#### Step 2: Verify Frontend

```bash
# Test frontend loading
curl -f https://your-frontend.vercel.app

# Test build
# Check Vercel deployment logs for errors
# Should show successful build and deployment
```

### Supabase Database Reactivation

#### Step 1: Verify Database Access

```bash
# Database should still be accessible
# Check Supabase dashboard:
# 1. Log into https://supabase.com/dashboard
# 2. Select your project
# 3. Check "Database" → "Overview"
# Should show connected status
```

#### Step 2: Test Database Operations

```bash
# Test connection from backend
curl -X POST https://your-backend.onrender.com/api/auth/test-db

# Expected response:
{
  "success": true,
  "message": "Database connection successful",
  "connection_count": 1
}

# Manual test (if needed):
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -c "SELECT 1;"
# Should return: 1
```

## 🔍 Verification Tests

### Step 1: Application Functionality

#### User Registration Test

```bash
# Test user registration flow
# 1. Visit frontend URL
# 2. Try to register new tenant
# 3. Check database for new records

# Expected: Registration completes successfully
```

#### Authentication Test

```bash
# Test login functionality
# 1. Login with existing user
# 2. Verify JWT tokens received
# 3. Test protected routes

# Expected: Authentication works correctly
```

#### Multi-Tenant Test

```bash
# Test subdomain routing
# 1. Register tenant: rollback-test
# 2. Visit: https://rollback-test.frontend-domain
# 3. Should load tenant-specific content

# Expected: Multi-tenant routing works
```

### Step 2: Performance Verification

#### Response Time Test

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/health

# curl-format.txt:
# time_total: %{time_total}\n

# Expected: Similar to pre-rollback performance
# Should be < 500ms for basic endpoints
```

#### Load Test

```bash
# Basic load test with Apache Bench
ab -n 100 -c 10 https://yourdomain.com/

# Monitor:
# - Requests per second
# - Failed requests (should be 0)
# - Time per request
```

### Step 3: Data Integrity Test

#### Database Data Check

```bash
# Verify critical data exists
psql "postgresql://..." -c "
SELECT 
  'tenants' as table_name, COUNT(*) as count 
FROM tenants
UNION ALL
SELECT 
  'users' as table_name, COUNT(*) as count 
FROM users
UNION ALL
SELECT 
  'roles' as table_name, COUNT(*) as count 
FROM roles;
"

# Expected: Counts should match pre-rollback values
```

#### User Data Verification

```bash
# Test specific user data
# 1. Login with test user
# 2. Verify user profile data
# 3. Check tenant-specific settings

# Expected: All user data intact
```

## 📢 Communication Procedures

### Step 1: User Communication Template

#### Immediate Alert (Within 5 minutes)

```bash
Subject: 🚨 Service Issue - Rollback in Progress

Dear Users,

We have detected a critical issue with our HRM SaaS platform and are implementing our rollback procedure to restore service.

⏰ Timeline:
- Issue detected: [TIME]
- Rollback initiated: [TIME]  
- Expected resolution: [TIME + 15 minutes]

🔧 What we're doing:
- Reverting to previous stable version
- Restoring database connectivity
- Verifying all systems

📞 Support:
If you have urgent issues, contact: [SUPPORT_EMAIL]

We'll update you every 15 minutes.

HRM SaaS Team
```

#### Resolution Update (Within 30 minutes)

```bash
Subject: ✅ Service Restored - Issue Resolved

Dear Users,

Good news! We have successfully resolved the issue and restored service.

✅ What's been restored:
- All platform features are working
- Database connectivity restored  
- User data is intact
- Performance back to normal

🔍 What happened:
[Brief explanation of the issue and resolution]

💡 What we're doing to prevent this:
[Preventive measures being implemented]

Thank you for your patience during this incident.

HRM SaaS Team
```

### Step 2: Internal Communication

#### Team Alert Template

```bash
# Slack/Discord alert:
🚨 ROLLBACK INITIATED

Issue: [Brief description]
Severity: Critical/High/Medium
Rollback started: [TIME]
Target resolution: [TIME + 15 minutes]

Team actions:
- [Person]: DNS rollback
- [Person]: Service reactivation
- [Person]: Testing and verification
- [Person]: User communication

Updates every 15 minutes.
```

#### Management Update Template

```bash
Subject: Incident Report - Service Rollback [DATE]

Executive Summary:
- Issue detected: [TIME]
- Impact: [Duration] of service degradation
- Resolution: Rollback to previous version
- User impact: [Number] users affected

Technical Details:
- Root cause: [Brief technical explanation]
- Resolution: [Actions taken]
- Prevention: [Measures being implemented]

Financial Impact:
- Downtime: [Duration]
- Revenue impact: $[Amount] (if applicable)
- Customer impact: [Number] support tickets

Next Steps:
- [Action items]
- [Prevention measures]
- [Timeline for improvements]
```

## 📊 Investigation Procedures

### Step 1: Root Cause Analysis

#### Log Collection

```bash
# Collect logs from all services
# Backend logs (Render):
# Render dashboard → Service → Logs

# Frontend logs (Vercel):
# Vercel dashboard → Project → Functions → View Function Logs

# Database logs (Supabase):
# Supabase dashboard → Logs → Database

# NGINX logs (if own server):
sudo tail -n 1000 /var/log/nginx/error.log
sudo tail -n 1000 /var/log/nginx/access.log
```

#### Timeline Reconstruction

```bash
# Create incident timeline
[TIME] - Issue detected
[TIME] - Rollback initiated
[TIME] - DNS reverted
[TIME] - Services restored
[TIME] - Testing completed
[TIME] - User notification sent

# Correlate with:
# - Deployment timestamps
# - Error log entries
# - Performance metrics
# - User reports
```

### Step 2: Impact Assessment

#### Technical Impact

```bash
# Assess technical impact
- Services affected: [List]
- Duration of impact: [Minutes]
- Data integrity: [Status]
- Performance impact: [Metrics]
- Security impact: [Assessment]
```

#### Business Impact

```bash
# Assess business impact
- User complaints: [Number]
- Support tickets: [Number]
- Revenue impact: [Amount]
- SLA breaches: [Count]
- Reputation impact: [Assessment]
```

### Step 3: Prevention Measures

#### Immediate Actions

```bash
# Actions to prevent recurrence
□ Enhanced monitoring setup
□ Improved testing procedures
□ Better rollback procedures
□ Team training updates
□ Documentation updates
```

#### Long-term Improvements

```bash
# Long-term improvements
□ Automated rollback triggers
□ Enhanced monitoring and alerting
□ Improved deployment procedures
□ Better testing coverage
□ Disaster recovery planning
```

## 📋 Post-Mortem Documentation

### Incident Report Template

```markdown
# Incident Report - [DATE]

## Summary
- **Issue**: [Brief description]
- **Severity**: Critical/High/Medium/Low
- **Duration**: [Start time] - [End time]
- **Impact**: [Users affected, duration, business impact]

## Timeline
- **[TIME]**: Issue detected
- **[TIME]**: Rollback initiated
- **[TIME]**: Services restored
- **[TIME]**: Investigation completed

## Root Cause
[Detailed explanation of what caused the issue]

## Resolution
[Steps taken to resolve the issue]

## Impact
- **Technical**: [Technical systems affected]
- **Business**: [Business impact]
- **Users**: [User impact]

## Prevention
- **Immediate**: [Actions to prevent recurrence]
- **Long-term**: [Strategic improvements]

## Lessons Learned
[Key takeaways for the team]

## Action Items
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]
```

### Team Retrospective

```bash
# Schedule retrospective within 48 hours
# Discuss:
# - What went well
# - What could improve
# - Action items
# - Process improvements
# - Training needs

# Attendees:
# - Technical team
# - Product team
# - Customer support
# - Management
```

## 🛡️ Prevention Measures

### Enhanced Monitoring

#### Automated Health Checks

```bash
# Add enhanced health checks
*/5 * * * * /scripts/health-check.sh
*/5 * * * * /scripts/performance-check.sh
*/5 * * * * /scripts/database-check.sh
```

#### Alert Thresholds

```bash
# Set stricter alert thresholds
- Response time > 1000ms: Critical alert
- Error rate > 5%: High alert
- Database connection failures: Critical alert
- CPU usage > 80%: Warning alert
```

### Improved Testing

#### Pre-Deployment Testing

```bash
# Enhanced testing checklist
□ Full regression test
□ Performance benchmarking
□ Load testing
□ Security scanning
□ Database integrity checks
```

#### Rollback Testing

```bash
# Test rollback procedures monthly
# Document any issues found
# Update procedures based on learnings
# Train team on rollback procedures
```

### Process Improvements

#### Deployment Procedures

```bash
# Enhanced deployment checklist
□ Code review completed
□ Tests passing
□ Staging deployment successful
□ Performance baseline established
□ Rollback plan prepared
□ Team notified
```

#### Change Management

```bash
# Change management process
□ Change request submitted
□ Risk assessment completed
□ Approval obtained
□ Implementation scheduled
□ Rollback plan confirmed
□ Team training completed
```

## ✅ Rollback Success Criteria

### Technical Success

- [ ] **Services Restored**: All services responding normally
- [ ] **Data Integrity**: No data loss or corruption
- [ ] **Performance**: Response times back to baseline
- [ ] **Functionality**: All features working correctly
- [ ] **Security**: No security vulnerabilities introduced

### User Experience Success

- [ ] **User Access**: Users can access all features
- [ ] **User Satisfaction**: No increase in complaints
- [ ] **Support Tickets**: Normal support volume
- [ ] **Feature Usage**: Normal usage patterns
- [ ] **Multi-Tenancy**: Subdomain routing works

### Business Success

- [ ] **Downtime Minimized**: < 30 minutes total
- [ ] **Revenue Impact**: Minimal or no revenue loss
- [ ] **SLA Compliance**: SLA requirements met
- [ ] **Customer Retention**: No customer churn
- [ ] **Reputation**: No lasting reputation damage

## 📞 Emergency Contacts

### Technical Team

```bash
# Emergency contact list
Primary On-Call: [Name] - [Phone] - [Email]
Secondary On-Call: [Name] - [Phone] - [Email]
Database Admin: [Name] - [Phone] - [Email]
DevOps Engineer: [Name] - [Phone] - [Email]
```

### External Contacts

```bash
# Service provider contacts
Vercel Support: https://vercel.com/support
Render Support: https://render.com/support
Supabase Support: https://supabase.com/support
DNS Provider Support: [Contact info]
```

### Escalation Matrix

```bash
# Escalation timeline
0-15 minutes: Technical team handles
15-30 minutes: Escalate to senior engineer
30-60 minutes: Escalate to engineering manager
60+ minutes: Escalate to CTO/executive team
```

---

**🛡️ Remember**: The goal of rollback is to restore service quickly and safely. Speed is important, but accuracy and safety are more important. Always verify that the rollback has actually fixed the issue before declaring success.