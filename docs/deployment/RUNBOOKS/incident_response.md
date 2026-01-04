# Incident Response Runbook

## Overview

This runbook provides structured procedures for responding to incidents across the HRM SaaS platform. It covers incident classification, response procedures, communication templates, and post-incident review processes.

**Response Time Target:** < 5 minutes for acknowledgment, < 30 minutes for resolution  
**Incident Types:** Security, Performance, Availability, Data Loss, Compliance  
**Escalation:** Clear escalation paths based on severity  

## 🚨 Incident Classification

### Severity Levels

#### Severity 1 (Critical) - Immediate Response
```bash
Characteristics:
- Complete service outage
- Security breach detected
- Data corruption/loss
- Regulatory compliance violation
- Revenue impact > $1000/hour

Response Time: < 5 minutes
Response Team: Full emergency team
Communication: Immediate to all stakeholders
Resolution Target: < 30 minutes
```

#### Severity 2 (High) - Urgent Response
```bash
Characteristics:
- Major feature unavailable
- Performance degradation > 50%
- Partial service outage
- User data at risk
- Revenue impact $100-1000/hour

Response Time: < 15 minutes
Response Team: On-call engineer + technical lead
Communication: Immediate to affected users
Resolution Target: < 2 hours
```

#### Severity 3 (Medium) - Priority Response
```bash
Characteristics:
- Minor feature issues
- Performance degradation < 50%
- Single tenant affected
- Non-critical security issue
- Revenue impact < $100/hour

Response Time: < 1 hour
Response Team: On-call engineer
Communication: Status update to users
Resolution Target: < 8 hours
```

#### Severity 4 (Low) - Standard Response
```bash
Characteristics:
- Cosmetic issues
- Documentation problems
- Enhancement requests
- Monitoring alerts
- No user impact

Response Time: < 4 hours
Response Team: Assigned engineer
Communication: Weekly summary
Resolution Target: < 48 hours
```

### Incident Types

#### Availability Incidents
```bash
# Complete service outage
# Partial service degradation
# Database connectivity issues
# API endpoint failures
# Frontend loading problems
```

#### Performance Incidents
```bash
# Response time degradation
# High error rates
# Resource exhaustion
# Database performance issues
# Memory leaks
```

#### Security Incidents
```bash
# Unauthorized access attempts
# Data breach indicators
# Certificate compromise
# Malware detection
# Compliance violations
```

#### Data Incidents
```bash
# Data corruption
# Data loss
# Backup failures
# Database inconsistencies
# Transaction failures
```

## ⚡ Initial Response (First 5 Minutes)

### Step 1: Incident Detection (30 seconds)

#### Automated Detection
```bash
# Health check failures
./scripts/health-check.sh
# Expected: All services UP
# If FAILED: Trigger incident response

# Performance degradation
curl -w "%{time_total}" -o /dev/null -s https://yourdomain.com/health
# Expected: < 200ms
# If > 1000ms: Trigger performance incident

# Error rate spikes
curl -s https://yourdomain.com/api/health | jq -r '.error_rate // 0'
# Expected: < 1%
# If > 5%: Trigger availability incident
```

#### Manual Detection
```bash
# User reports
# Support tickets mentioning "down" or "error"
# Monitoring alerts
# Social media mentions
# Internal team notifications
```

### Step 2: Immediate Assessment (1 minute)

#### Quick Status Check
```bash
# Test critical endpoints
curl -f https://yourdomain.com/health || echo "CRITICAL: Backend down"
curl -f https://yourdomain.com/api/health || echo "CRITICAL: API down"
curl -f https://yourdomain.com || echo "CRITICAL: Frontend down"

# Check database connectivity
curl -X POST https://yourdomain.com/api/auth/test-db || echo "CRITICAL: Database down"
```

#### Severity Classification
```bash
# Determine initial severity
if [ all services down ]; then
    SEVERITY=1
    RESPONSE_TIME="5 minutes"
elif [ major features broken ]; then
    SEVERITY=2
    RESPONSE_TIME="15 minutes"
elif [ minor issues ]; then
    SEVERITY=3
    RESPONSE_TIME="1 hour"
else
    SEVERITY=4
    RESPONSE_TIME="4 hours"
fi

echo "Incident Severity: $SEVERITY"
echo "Target Response Time: $RESPONSE_TIME"
```

### Step 3: Team Alert (2 minutes)

#### Internal Team Notification
```bash
# Slack/Discord alert
curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 INCIDENT DETECTED - Severity: $SEVERITY\\nTime: $(date)\\nIssue: [Brief description]\\nResponse: Initiated\\nStatus: Investigating\"}" \
    "$SLACK_WEBHOOK"

# Email notification
echo "Incident Alert - Severity $SEVERITY
Time: $(date)
Status: Investigating
Initial Assessment: [Brief description]

Incident Response Team: Please acknowledge receipt.
" | mail -s "ALERT: HRM SaaS Incident - Severity $SEVERITY" incident-response@yourcompany.com
```

#### Incident Commander Assignment
```bash
# Assign incident commander based on severity
if [ $SEVERITY -eq 1 ]; then
    INCIDENT_COMMANDER="senior-engineer@yourcompany.com"
    ESCALATION_TIME="15 minutes"
elif [ $SEVERITY -eq 2 ]; then
    INCIDENT_COMMANDER="oncall-engineer@yourcompany.com"
    ESCALATION_TIME="30 minutes"
else
    INCIDENT_COMMANDER="assigned-engineer@yourcompany.com"
    ESCALATION_TIME="2 hours"
fi

echo "Incident Commander: $INCIDENT_COMMANDER"
echo "Escalation Time: $ESCALATION_TIME"
```

### Step 4: Initial Investigation (1.5 minutes)

#### Log Analysis
```bash
# Check recent error logs
tail -n 50 /var/log/hrm-saas/application.log | grep -i "error\|exception\|failed"

# Check service-specific logs
# Render: https://dashboard.render.com → Service → Logs
# Vercel: https://vercel.com/dashboard → Project → Functions → Logs
# Supabase: https://supabase.com/dashboard → Project → Logs

# Check system resources
top -bn1 | head -10
df -h
free -h
```

#### Recent Changes Review
```bash
# Check for recent deployments
git log --oneline --since="1 hour ago"

# Check for configuration changes
# Render: https://dashboard.render.com → Service → Settings
# Vercel: https://vercel.com/dashboard → Project → Settings
# Supabase: https://supabase.com/dashboard → Project → Settings

# Check for external service issues
# Service status pages
# Cloud provider status
# CDN status
```

## 🔧 Investigation Procedures

### Service-Specific Diagnostics

#### Backend API Issues
```bash
# Check Render service status
curl -f https://your-backend.onrender.com/health
curl -f https://your-backend.onrender.com/api/health

# Check Render logs
# URL: https://dashboard.render.com → Service → Logs
# Look for:
# - Build failures
# - Runtime errors
# - Memory issues
# - Database connection errors

# Common backend issues:
# - Environment variables missing
# - Database connection failures
# - Memory leaks/OOM
# - Build failures
# - SSL certificate issues
```

#### Frontend Issues
```bash
# Check Vercel deployment status
curl -f https://your-frontend.vercel.app
curl -f https://yourdomain.com

# Check Vercel build logs
# URL: https://vercel.com/dashboard → Project → Deployments → Latest → View Build Logs
# Look for:
# - Build failures
# - TypeScript errors
# - Missing dependencies
# - Environment variable issues

# Common frontend issues:
# - Build failures
# - API endpoint changes
# - Environment variable mismatches
# - CORS configuration issues
```

#### Database Issues
```bash
# Check Supabase status
curl -X POST https://your-backend.onrender.com/api/auth/test-db

# Check Supabase dashboard
# URL: https://supabase.com/dashboard → Project → Reports
# Look for:
# - Connection failures
# - Slow queries
# - Storage limits
# - Performance metrics

# Common database issues:
# - Connection pool exhaustion
# - Slow queries
# - Storage quota exceeded
# - Schema changes
# - Authentication failures
```

### Performance Investigation

#### Response Time Analysis
```bash
# Measure response times
for endpoint in "/health" "/api/auth/test-db" "/"; do
    response_time=$(curl -w "%{time_total}" -o /dev/null -s "https://yourdomain.com$endpoint")
    echo "$(date): $endpoint response time: ${response_time}s"
done

# Compare with baseline
# Baseline response times:
# /health: < 0.1s
# /api/health: < 0.2s
# /: < 0.3s
```

#### Resource Usage Analysis
```bash
# Check server resources (own server)
if command -v psql &> /dev/null; then
    # Database connections
    db_connections=$(psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    max_connections=$(psql -U postgres -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
    
    echo "Database connections: $db_connections/$max_connections"
    
    # Slow queries
    slow_queries=$(psql -U postgres -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;" 2>/dev/null | tr -d ' ')
    echo "Slow queries: $slow_queries"
fi

# Check PM2 processes
pm2 status
pm2 logs hrm-saas-backend --lines 50
```

## 🛠️ Resolution Procedures

### Immediate Actions

#### Service Restart
```bash
# Restart backend service
pm2 restart hrm-saas-backend

# Check status
pm2 status
pm2 logs hrm-saas-backend --lines 20

# If needed, redeploy to Render
# Visit: https://dashboard.render.com → Service → Manual Deploy
```

#### Database Connection Reset
```bash
# Restart PostgreSQL (own server)
sudo systemctl restart postgresql

# Check connection
psql -U postgres -c "SELECT 1;"

# Clear connection pool
# (This depends on your application code)
```

#### Clear Cache/Restart Services
```bash
# Clear application cache
pm2 flush hrm-saas-backend

# Restart NGINX (own server)
sudo systemctl restart nginx

# Clear browser cache (inform users if needed)
```

### Emergency Rollback

#### Quick Rollback Triggers
```bash
# If incident occurred after deployment:
# 1. Immediate rollback to previous version
# 2. Verify rollback success
# 3. Communicate to users

# Rollback to Render
# 1. Git revert to previous commit
# 2. Push to trigger redeploy
# 3. Monitor for resolution

# Rollback to Vercel
# 1. Vercel dashboard → Deployments → Previous successful deployment → Redeploy
# 2. Monitor for resolution
```

#### Rollback Decision Matrix
```bash
# Rollback if:
# - Service completely down > 15 minutes
# - Data corruption detected
# - Security breach confirmed
# - Performance worse than before deployment
# - User complaints > 50 in 15 minutes

# Don't rollback if:
# - Issue isolated to one feature
# - Workaround available
# - Issue being resolved with current deployment
# - Rollback would cause more disruption
```

## 📢 Communication Procedures

### Stakeholder Communication

#### Initial Incident Alert (Within 5 minutes)
```bash
# User communication template
SUBJECT: 🚨 Service Issue - Investigation In Progress

Dear Users,

We have detected an issue with the HRM SaaS platform and are actively investigating.

⏰ Current Status:
- Issue detected: [TIME]
- Impact: [Brief description]
- Investigation: In progress
- Next update: [TIME + 15 minutes]

🔧 What we're doing:
- Technical team investigating
- Working on resolution
- Monitoring system health

📞 Support:
For urgent issues, contact: support@yourdomain.com

We'll provide updates every 15 minutes.

HRM SaaS Team

# Send via:
# - Email to all users
# - Status page update
# - Social media posts
```

#### Progress Updates (Every 15 minutes)
```bash
# Update template
SUBJECT: 🔄 Service Issue - Update [N]

Dear Users,

Update #[N] on the service issue:

⏰ Current Status:
- Issue detected: [TIME]
- Current time: [TIME]
- Status: [Investigating/Fixing/Resolving]
- Progress: [What has been done]

🔧 What we're doing:
- [Current actions]
- [Next steps]

⏰ Expected resolution: [TIME]

We'll provide another update in 15 minutes.

HRM SaaS Team
```

#### Resolution Notification
```bash
# Resolution template
SUBJECT: ✅ Service Issue Resolved

Dear Users,

Good news! We have successfully resolved the service issue.

✅ Resolution Summary:
- Issue resolved: [TIME]
- Root cause: [Brief explanation]
- Impact duration: [Total time]
- Data integrity: Confirmed intact

🔍 What happened:
[Detailed explanation for transparency]

💡 What we're doing to prevent this:
- [Prevention measure 1]
- [Prevention measure 2]
- [Prevention measure 3]

Thank you for your patience during this incident.

HRM SaaS Team

# Include:
# - Incident timeline
# - Technical details
# - Prevention measures
# - Contact for questions
```

### Internal Communication

#### Team Coordination
```bash
# Slack/Discord incident channel
# Create dedicated incident channel: #incident-YYYYMMDD-HHMM

# Channel template:
# 🚨 INCIDENT - [Brief Description]
# Severity: [1-4]
# Incident Commander: [Name]
# Start Time: [TIME]
# Status: [Investigating/Fixing/Resolved]
# 
# Updates:
# [TIME] - [Action taken]
# [TIME] - [Status change]
# [TIME] - [Next steps]
```

#### Management Updates
```bash
# Executive summary template
SUBJECT: Incident Report - [SEVERITY] Level - [Brief Description]

Executive Summary:
- Incident: [Brief description]
- Severity: [1-4]
- Duration: [Start time] - [End time]
- Impact: [User/business impact]
- Status: [Resolved/In Progress]

Technical Summary:
- Root cause: [Technical explanation]
- Resolution: [Actions taken]
- Prevention: [Measures implemented]

Business Impact:
- Revenue impact: [If applicable]
- User impact: [Number of affected users]
- SLA impact: [SLA breach details]

Next Steps:
- [Immediate actions]
- [Long-term improvements]
- [Timeline for implementation]
```

## 📊 Post-Incident Review

### Immediate Post-Incident (Within 24 hours)

#### Incident Timeline Reconstruction
```bash
# Create detailed timeline
cat > incident-timeline-$(date +%Y%m%d).txt << EOF
INCIDENT TIMELINE - $(date)

DETECTION:
[TIME] - Issue detected via [method]
[TIME] - Initial assessment completed
[TIME] - Incident classification: Severity [X]

RESPONSE:
[TIME] - Incident commander assigned
[TIME] - Team notified
[TIME] - Investigation started
[TIME] - Root cause identified
[TIME] - Resolution implemented
[TIME] - Service restored
[TIME] - User notification sent

INVESTIGATION:
[TIME] - Log analysis completed
[TIME] - Service diagnostics completed
[TIME] - Performance analysis completed
[TIME] - Root cause confirmed

RESOLUTION:
[TIME] - Fix deployed
[TIME] - Service verification completed
[TIME] - Monitoring confirmed stability
[TIME] - All-clear notification sent

EOF
```

#### Root Cause Analysis
```bash
# Root cause analysis template
ROOT CAUSE ANALYSIS

INCIDENT: [Brief description]
DATE: [Date]
SEVERITY: [1-4]
DURATION: [Total time]

ROOT CAUSE:
[Detailed technical explanation of what caused the incident]

CONTRIBUTING FACTORS:
- Factor 1: [Description]
- Factor 2: [Description]
- Factor 3: [Description]

IMMEDIATE ACTIONS TAKEN:
1. [Action 1] - [Result]
2. [Action 2] - [Result]
3. [Action 3] - [Result]

LESSONS LEARNED:
1. [Lesson 1]
2. [Lesson 2]
3. [Lesson 3]

PREVENTION MEASURES:
1. [Measure 1] - [Owner] - [Timeline]
2. [Measure 2] - [Owner] - [Timeline]
3. [Measure 3] - [Owner] - [Timeline]

ACTION ITEMS:
- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]
- [ ] [Action item 3] - Owner: [Name] - Due: [Date]
```

### Follow-up Actions (Within 7 days)

#### Team Retrospective
```bash
# Schedule retrospective meeting
# Attendees:
# - Incident commander
# - Technical team
# - Product team
# - Management

# Discussion points:
# 1. What went well?
# 2. What could be improved?
# 3. What needs to change?
# 4. Action items and owners
# 5. Timeline for improvements
```

#### Documentation Updates
```bash
# Update runbooks
# - Add new procedures learned
# - Update escalation procedures
# - Improve diagnostic steps
# - Update contact information

# Update monitoring
# - Add new alerts
# - Adjust thresholds
# - Improve detection
# - Enhance dashboards

# Update training
# - Team training needs
# - Process improvements
# - Tool enhancements
# - Knowledge sharing
```

## 📈 Incident Metrics

### Key Performance Indicators

#### Response Time Metrics
```bash
# Time to detection
# Time to acknowledgment
# Time to escalation
# Time to resolution
# Time to user notification

# Targets:
# Detection: < 5 minutes
# Acknowledgment: < 5 minutes
# Resolution: < 30 minutes (Sev 1), < 2 hours (Sev 2)
```

#### Communication Metrics
```bash
# Time to first user notification
# Frequency of updates
# Communication completeness
# Stakeholder satisfaction

# Targets:
# First notification: < 15 minutes
# Updates: Every 15 minutes
# Resolution notification: Within 5 minutes of fix
```

#### Business Impact Metrics
```bash
# Number of affected users
# Duration of impact
# Revenue impact
# SLA compliance
# Customer satisfaction

# Targets:
# Minimize user impact
# Maintain SLA compliance
# Zero data loss
# User satisfaction > 90%
```

### Continuous Improvement

#### Monthly Incident Review
```bash
# Review all incidents from previous month
# Analyze patterns
# Identify trends
# Measure improvements
# Update procedures

# Key questions:
# - Are we detecting issues faster?
# - Are we resolving issues faster?
# - Are incidents decreasing?
# - Are prevention measures working?
```

#### Quarterly Process Review
```bash
# Comprehensive review of incident response
# Update procedures based on lessons learned
# Test incident response procedures
# Train team on improvements
# Update contact information and escalation paths
```

## ✅ Incident Response Checklist

### Initial Response (First 5 minutes)
- [ ] **Detect and acknowledge incident**
- [ ] **Classify severity level**
- [ ] **Assign incident commander**
- [ ] **Notify response team**
- [ ] **Start incident log**
- [ ] **Begin initial investigation**
- [ ] **Send initial user notification**

### Investigation Phase
- [ ] **Perform service diagnostics**
- [ ] **Analyze logs and metrics**
- [ ] **Check recent changes**
- [ ] **Identify root cause**
- [ ] **Determine resolution approach**
- [ ] **Update team on progress**
- [ ] **Provide regular user updates**

### Resolution Phase
- [ ] **Implement fix**
- [ ] **Verify service restoration**
- [ ] **Monitor for stability**
- [ ] **Send resolution notification**
- [ ] **Document lessons learned**
- [ ] **Schedule retrospective**
- [ ] **Update procedures if needed**

### Post-Incident Phase
- [ ] **Complete root cause analysis**
- [ ] **Document timeline**
- [ ] **Hold team retrospective**
- [ ] **Implement prevention measures**
- [ ] **Update runbooks**
- [ ] **Train team on improvements**
- [ ] **Review and update metrics**

## 🎯 Success Criteria

### Technical Success
- [ ] **Incident detected within 5 minutes**
- [ ] **Severity correctly classified**
- [ ] **Root cause identified and fixed**
- [ ] **Service restored to normal operation**
- [ ] **No data loss or corruption**
- [ ] **Prevention measures implemented**

### Communication Success
- [ ] **Users notified within 15 minutes**
- [ ] **Updates provided every 15 minutes**
- [ ] **Resolution notification sent promptly**
- [ ] **Stakeholders kept informed**
- [ ] **Documentation completed**

### Business Success
- [ ] **Minimal user impact**
- [ ] **SLA requirements met**
- [ ] **Revenue impact minimized**
- [ ] **Customer satisfaction maintained**
- [ ] **Lessons learned and applied**

---

**💡 Remember**: The goal of incident response is not just to fix the immediate problem, but to learn from it and prevent similar incidents in the future. Every incident is an opportunity to improve the system and processes.