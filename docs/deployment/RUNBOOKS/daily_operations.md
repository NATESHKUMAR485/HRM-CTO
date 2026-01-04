# Daily Operations Runbook

## Overview

This runbook covers daily operational procedures for the HRM SaaS platform across all deployment tiers. It provides checklists and procedures to ensure system health, performance, and reliability.

**Frequency:** Daily  
**Estimated Time:** 15-30 minutes  
**Priority:** High (prevention is better than firefighting)  

## 🌅 Morning Operations (9:00 AM)

### 1. System Health Check (5 minutes)

#### Automated Health Check
```bash
# Run automated health check
./scripts/health-check.sh

# Expected output:
# 2024-01-01 09:00:01: API Health - OK (HTTP 200)
# 2024-01-01 09:00:01: Frontend - OK (HTTP 200)
# 2024-01-01 09:00:01: Database - OK
# 2024-01-01 09:00:01: All systems operational
```

#### Manual Verification
```bash
# Quick manual checks
curl -f https://yourdomain.com/health
curl -f https://yourdomain.com/api/health

# Expected: Both return {"status": "ok", ...}
```

#### Check Service Dashboards
- [ ] **Vercel Analytics**: Check for errors or unusual traffic
- [ ] **Render Metrics**: Verify CPU/memory usage normal
- [ ] **Supabase Reports**: Check database performance
- [ ] **SSL Certificates**: Verify none expire within 30 days

### 2. Performance Review (5 minutes)

#### Response Time Analysis
```bash
# Check yesterday's performance metrics
tail -n 1000 /var/log/hrm-saas/performance.log | grep "$(date -d 'yesterday' +%Y-%m-%d)"

# Monitor key metrics:
# - Average response time < 200ms
# - Error rate < 1%
# - Database query time < 50ms
```

#### Resource Usage Review
```bash
# Check resource monitoring logs
tail -n 100 /var/log/hrm-saas/resource-monitor.log | grep "$(date -d 'yesterday' +%Y-%m-%d)"

# Monitor thresholds:
# - CPU usage < 70%
# - Memory usage < 80%
# - Disk usage < 85%
```

### 3. Error Log Review (5 minutes)

#### Application Errors
```bash
# Check for critical errors
grep -i "error\|exception\|failed" /var/log/hrm-saas/application.log | \
tail -n 50

# Look for patterns:
# - Database connection issues
# - Authentication failures
# - API endpoint errors
# - Performance degradation
```

#### Service-Specific Logs
```bash
# Render backend logs
# Visit: https://dashboard.render.com → Service → Logs
# Look for: Restarts, errors, warnings

# Vercel function logs
# Visit: https://vercel.com/dashboard → Project → Functions → View Function Logs
# Look for: Build errors, runtime errors

# Supabase logs
# Visit: https://supabase.com/dashboard → Project → Logs
# Look for: Database errors, API errors
```

### 4. Backup Verification (3 minutes)

#### Database Backup Check
```bash
# Verify yesterday's database backup
ls -la /home/hrm-saas/backups/ | grep "$(date -d 'yesterday' +%Y%m%d)"

# Expected: 
# -rw-r--r-- 1 hrm-saas hrm-saas 1024000 Jan  1 02:00 hrm_saas_backup_20240101_020000.sql.gz
```

#### Backup Integrity Test
```bash
# Test backup file integrity
gunzip -t /home/hrm-saas/backups/hrm_saas_backup_$(date -d 'yesterday' +%Y%m%d)*.sql.gz

# Expected: No output (success) or error message
```

#### File Backup Check
```bash
# Verify file backups if applicable
ls -la /home/hrm-saas/backups/ | grep "files_backup"

# Check backup sizes are reasonable
du -h /home/hrm-saas/backups/*$(date -d 'yesterday' +%Y%m%d)*
```

### 5. Security Review (3 minutes)

#### Failed Login Analysis
```bash
# Check for unusual login patterns
# Look in Supabase dashboard → Authentication → Logs
# Monitor for:
# - Multiple failed attempts from same IP
# - Attempts outside business hours
# - Geographic anomalies
```

#### SSL Certificate Status
```bash
# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | \
grep "Not After"

# Alert if expires within 30 days
```

#### Security Headers Check
```bash
# Test security headers
curl -I https://yourdomain.com | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection"

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

## 📊 Performance Monitoring (Throughout Day)

### Real-time Monitoring (Every 2 hours)

#### Response Time Checks
```bash
# Quick performance test
for endpoint in "/health" "/api/auth/test-db" "/"; do
    time_start=$(date +%s%3N)
    curl -s -o /dev/null -w "%{http_code}" "https://yourdomain.com$endpoint"
    time_end=$(date +%s%3N)
    response_time=$((time_end - time_start))
    echo "$(date): $endpoint - ${response_time}ms"
done
```

#### Error Rate Monitoring
```bash
# Check error rates
error_count=$(curl -s "https://yourdomain.com/api/health" | jq -r '.error_count // 0')
total_requests=$(curl -s "https://yourdomain.com/api/health" | jq -r '.total_requests // 1')

if [ "$total_requests" -gt 0 ]; then
    error_rate=$(echo "scale=2; $error_count * 100 / $total_requests" | bc)
    echo "$(date): Error rate: ${error_rate}%"
    
    # Alert if error rate > 5%
    if (( $(echo "$error_rate > 5" | bc -l) )); then
        echo "ALERT: High error rate detected: ${error_rate}%"
        # Send alert notification
    fi
fi
```

### Resource Usage Monitoring (Every 4 hours)

#### Database Performance
```bash
# Check database metrics (if own server)
if command -v psql &> /dev/null; then
    # Active connections
    active_connections=$(psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    max_connections=$(psql -U postgres -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
    
    echo "$(date): DB Connections: $active_connections/$max_connections"
    
    # Alert if > 80% of connections used
    if [ $((active_connections * 100 / max_connections)) -gt 80 ]; then
        echo "ALERT: High database connection usage"
    fi
    
    # Slow queries
    slow_queries=$(psql -U postgres -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;" 2>/dev/null | tr -d ' ')
    if [ "$slow_queries" -gt 0 ]; then
        echo "WARNING: $slow_queries slow queries detected"
    fi
fi
```

#### Server Resources (Own Server)
```bash
# Check system resources
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | sed 's/us,//')
memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)

echo "$(date): Resources - CPU: ${cpu_usage}% Memory: ${memory_usage}% Disk: ${disk_usage}%"

# Resource alerts
if (( $(echo "$cpu_usage > 80" | bc -l) )); then
    echo "ALERT: High CPU usage: ${cpu_usage}%"
fi

if [ $memory_usage -gt 85 ]; then
    echo "ALERT: High memory usage: ${memory_usage}%"
fi

if [ $disk_usage -gt 90 ]; then
    echo "ALERT: High disk usage: ${disk_usage}%"
fi
```

## 🔍 Incident Detection

### Automated Alert Response

#### Critical Alerts (< 5 minutes response)
```bash
# Critical alert types:
# - Service completely down
# - Database connection failures
# - Security breaches
# - Performance degradation > 50%

# Response procedure:
# 1. Acknowledge alert immediately
# 2. Check service status dashboards
# 3. Implement emergency fixes if possible
# 4. Escalate if issue persists > 15 minutes
```

#### High Priority Alerts (< 15 minutes response)
```bash
# High priority alert types:
# - Response time > 1000ms
# - Error rate > 5%
# - High resource usage
# - Backup failures

# Response procedure:
# 1. Investigate root cause
# 2. Check recent deployments
# 3. Review configuration changes
# 4. Implement fixes or escalate
```

### Manual Issue Detection

#### User Experience Issues
```bash
# Monitor user feedback channels:
# - Support tickets
# - User satisfaction surveys
# - Social media mentions
# - Performance complaints

# Check user activity patterns:
# - Login success rates
# - Feature usage statistics
# - Page load times
# - Error reports
```

#### Performance Degradation
```bash
# Signs of performance issues:
# - Response times increasing over time
# - Error rates rising
# - Resource usage climbing
# - User complaints about speed

# Investigation steps:
# 1. Check recent deployments
# 2. Review database performance
# 3. Analyze traffic patterns
# 4. Check for memory leaks
```

## 📈 Capacity Planning

### Growth Monitoring

#### User Growth Tracking
```bash
# Monitor user metrics:
# - Daily active users (DAU)
# - Weekly active users (WAU)
# - Monthly active users (MAU)
# - User registration rate

# Database queries for user metrics:
# DAU: SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at >= CURRENT_DATE
# WAU: SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
# MAU: SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
```

#### Resource Usage Trends
```bash
# Track resource trends:
# - CPU usage over time
# - Memory consumption growth
# - Database storage increase
# - Bandwidth usage patterns

# Weekly trend analysis:
weekly_cpu_avg=$(grep "CPU=" /var/log/hrm-saas/resource-monitor.log | tail -168 | awk -F'[=%]' '{sum+=$2; count++} END {print sum/count}')
weekly_memory_avg=$(grep "Memory=" /var/log/hrm-saas/resource-monitor.log | tail -168 | awk -F'[=%]' '{sum+=$4; count++} END {print sum/count}')

echo "Weekly averages - CPU: ${weekly_cpu_avg}% Memory: ${weekly_memory_avg}%"
```

### Scaling Triggers

#### Automatic Scaling Indicators
```bash
# Database storage > 80% of limit
# Bandwidth > 80% of monthly limit
# CPU usage > 70% consistently
# Memory usage > 80% consistently
# Response time > 300ms consistently
# Error rate > 2% consistently

# Action triggers:
if [ $((database_usage_percent)) -gt 80 ]; then
    echo "SCALE TRIGGER: Database storage"
    # Plan storage upgrade
fi

if (( $(echo "$cpu_usage > 70" | bc -l) )); then
    echo "SCALE TRIGGER: CPU usage"
    # Plan compute upgrade
fi
```

## 🔧 Maintenance Tasks

### Weekly Maintenance (Fridays, 2:00 PM)

#### Database Maintenance
```bash
# PostgreSQL maintenance (own server)
sudo -u postgres psql -d hrm_saas -c "ANALYZE;"

# Vacuum database if needed
sudo -u postgres psql -d hrm_saas -c "VACUUM ANALYZE;"

# Check for unused indexes
sudo -u postgres psql -d hrm_saas -c "
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename, indexname;
"

# Archive old data if needed
# Move audit logs older than 90 days to archive
```

#### Application Updates
```bash
# Check for application updates
cd /home/hrm-saas/apps/hrm-saas
git fetch origin
git status

# Update dependencies if needed
npm audit
npm update

# Check for security vulnerabilities
npm audit --audit-level moderate

# Update PM2 if needed
npm update -g pm2
```

#### Log Rotation
```bash
# Check log file sizes
du -h /var/log/hrm-saas/*.log

# Rotate logs if needed
sudo logrotate -f /etc/logrotate.d/hrm-saas-monitoring

# Clean old log entries
find /var/log/hrm-saas/ -name "*.log" -mtime +30 -delete
```

### Monthly Maintenance (First Saturday, 3:00 AM)

#### Security Updates
```bash
# System updates (own server)
sudo apt update
sudo apt list --upgradable
sudo apt upgrade -y

# Check SSL certificate renewal
sudo certbot certificates

# Review security logs
sudo grep -i "failed\|error\|attack" /var/log/auth.log | tail -100
```

#### Performance Review
```bash
# Generate monthly performance report
./scripts/monthly-report.sh

# Review slow queries
sudo -u postgres psql -d hrm_saas -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
"

# Check for memory leaks
pm2 logs hrm-saas-backend --lines 1000 | grep -i "memory\|heap"
```

#### Backup Testing
```bash
# Test backup restoration
# (Perform on staging environment)
# Create test database
# Restore backup to test database
# Verify data integrity
# Clean up test environment
```

## 📊 Reporting

### Daily Operations Report

#### Template
```bash
# Create daily report
cat > /tmp/daily-report-$(date +%Y%m%d).txt << EOF
=== HRM SaaS Daily Operations Report ===
Date: $(date)
Operator: [Your Name]

SYSTEM STATUS:
- Backend API: [UP/DOWN]
- Frontend: [UP/DOWN]
- Database: [UP/DOWN]
- SSL Certificate: [VALID/EXPIRING]

PERFORMANCE METRICS:
- Average Response Time: [XXX]ms
- Error Rate: [X]%
- Database Query Time: [XXX]ms
- Active Connections: [XX/XX]

RESOURCE USAGE:
- CPU Usage: [XX]%
- Memory Usage: [XX]%
- Disk Usage: [XX]%
- Bandwidth: [XXX]GB

SECURITY STATUS:
- Failed Login Attempts: [XX]
- SSL Certificate Days: [XX]
- Security Alerts: [NONE/XX]

BACKUP STATUS:
- Database Backup: [SUCCESS/FAILED]
- File Backup: [SUCCESS/FAILED]
- Backup Size: [XXX]MB

ISSUES:
- [List any issues encountered]
- [Actions taken]

NOTES:
- [Any important observations]
- [Plans for tomorrow]

EOF

# Send report
# mail -s "Daily Operations Report - $(date +%Y%m%d)" admin@yourdomain.com < /tmp/daily-report-$(date +%Y%m%d).txt
```

### Weekly Summary Report

#### Template
```bash
# Generate weekly summary
cat > /tmp/weekly-summary-$(date +%Y%W).txt << EOF
=== HRM SaaS Weekly Summary ===
Week: $(date +%Y-W%V)
Period: $(date -d '7 days ago' +%Y-%m-%d) to $(date +%Y-%m-%d)

PERFORMANCE SUMMARY:
- Average Response Time: [XXX]ms ([+/-X]% vs last week)
- Uptime: [99.XX]%
- Error Rate: [X.XX]% ([+/-X.XX]% vs last week)
- Total Requests: [XXX,XXX]

RESOURCE UTILIZATION:
- Average CPU Usage: [XX]%
- Peak Memory Usage: [XX]%
- Database Storage Growth: [+/-XX]MB
- Bandwidth Usage: [XXX]GB

SECURITY SUMMARY:
- Failed Login Attempts: [XXX]
- Security Incidents: [NONE/XX]
- Certificate Status: [VALID - XX days remaining]

BACKUP SUMMARY:
- Successful Backups: [XX/7]
- Average Backup Size: [XXX]MB
- Backup Issues: [NONE/XX]

ISSUES RESOLVED:
- [List resolved issues]

UPCOMING TASKS:
- [List upcoming maintenance tasks]
- [Planned upgrades or changes]

RECOMMENDATIONS:
- [List any recommendations]

EOF

# Send weekly summary
# mail -s "Weekly Operations Summary - $(date +%Y-W%V)" admin@yourdomain.com < /tmp/weekly-summary-$(date +%Y%W).txt
```

## ✅ Daily Checklist

### Morning Checklist (15 minutes)
- [ ] Run automated health check
- [ ] Verify all services responding
- [ ] Check service dashboards for alerts
- [ ] Review performance metrics
- [ ] Check error logs for issues
- [ ] Verify backup completion
- [ ] Review security status
- [ ] Check certificate expiration dates

### Throughout Day Monitoring
- [ ] Monitor response times (every 2 hours)
- [ ] Check error rates (every 2 hours)
- [ ] Monitor resource usage (every 4 hours)
- [ ] Respond to alerts promptly
- [ ] Check user feedback channels
- [ ] Monitor capacity indicators

### End of Day (10 minutes)
- [ ] Review day's performance metrics
- [ ] Document any issues encountered
- [ ] Update operations log
- [ ] Plan next day's priorities
- [ ] Send daily operations report

### Weekly Tasks (Friday)
- [ ] Database maintenance
- [ ] Application updates check
- [ ] Log rotation
- [ ] Performance review
- [ ] Generate weekly report
- [ ] Plan upcoming week's activities

### Monthly Tasks (First Saturday)
- [ ] Security updates
- [ ] SSL certificate review
- [ ] Performance analysis
- [ ] Backup testing
- [ ] Capacity planning review
- [ ] Update runbooks if needed

## 🚨 Escalation Procedures

### Level 1: Operator Response (0-15 minutes)
```bash
# Handle by: On-call operator
# Actions:
# 1. Acknowledge alert
# 2. Check service status
# 3. Review recent changes
# 4. Implement basic fixes
# 5. Escalate if not resolved
```

### Level 2: Technical Lead (15-30 minutes)
```bash
# Handle by: Technical lead or senior engineer
# Actions:
# 1. Deep investigation
# 2. Coordinate with team
# 3. Implement advanced fixes
# 4. Communication with stakeholders
# 5. Plan prevention measures
```

### Level 3: Emergency Response (30+ minutes)
```bash
# Handle by: Engineering manager or CTO
# Actions:
# 1. Activate emergency procedures
# 2. Full team mobilization
# 3. External vendor support
# 4. Customer communication
# 5. Post-incident review
```

## 📞 Emergency Contacts

### Internal Contacts
```bash
Primary On-Call: [Name] - [Phone] - [Email]
Secondary On-Call: [Name] - [Phone] - [Email]
Technical Lead: [Name] - [Phone] - [Email]
Engineering Manager: [Name] - [Phone] - [Email]
```

### External Contacts
```bash
Vercel Support: https://vercel.com/support
Render Support: https://render.com/support
Supabase Support: https://supabase.com/support
Domain Registrar: [Contact info]
DNS Provider: [Contact info]
```

---

**💡 Remember**: Consistency in daily operations prevents most issues. Small, regular checks are more effective than reactive firefighting. Document everything and learn from each day's operations to continuously improve procedures.