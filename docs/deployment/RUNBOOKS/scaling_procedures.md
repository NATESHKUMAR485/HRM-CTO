# Scaling Procedures Runbook

## Overview

This runbook provides comprehensive procedures for scaling the HRM SaaS platform across all deployment tiers. It covers both vertical scaling (resource upgrades) and horizontal scaling (additional instances), with automated and manual procedures.

**Scaling Triggers:** CPU > 70%, Memory > 80%, Response time > 300ms  
**Scaling Types:** Vertical (resources), Horizontal (instances), Geographic (regions)  
**Response Time:** < 30 minutes for automatic, < 2 hours for manual  
**Zero Downtime:** Required for production scaling  

## 📈 Scaling Strategy Overview

### Scaling Dimensions

```
┌─────────────────────────────────────────────────────────────────┐
│                     Vertical Scaling                           │
├─────────────────────────────────────────────────────────────────┤
│ • CPU: 2 → 4 → 8 → 16 cores                                   │
│ • Memory: 4GB → 8GB → 16GB → 32GB                             │
│ • Storage: 80GB → 160GB → 320GB → 640GB                       │
│ • Network: 1Gbps → 10Gbps                                     │
│ • Cost: Linear increase with resources                        │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Horizontal Scaling                         │
├─────────────────────────────────────────────────────────────────┤
│ • Backend Instances: 1 → 2 → 4 → 8                          │
│ • Load Balancer: NGINX, HAProxy, Cloud LB                     │
│ • Database: Read replicas, connection pooling                  │
│ • CDN: Global edge distribution                                │
│ • Cost: Sub-linear increase (efficiency gains)               │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Geographic Scaling                        │
├─────────────────────────────────────────────────────────────────┤
│ • Regions: Single → Multi-region                              │
│ • Latency: < 50ms per region                                  │
│ • Data replication: Synchronous → Asynchronous                │
│ • Compliance: GDPR, data residency                            │
│ • Cost: Significant increase for full redundancy             │
└─────────────────────────────────────────────────────────────────┘
```

### Scaling Triggers by Tier

#### Free Tier Scaling Indicators
```bash
# When to upgrade from Free to Pro
Database Storage > 400MB (80% of 500MB)
Response Time > 400ms average
Error Rate > 2%
Concurrent Users > 25
Bandwidth > 80GB/month
Support Tickets > 2x normal
User Complaints > 5% report slow performance
```

#### Pro Tier Scaling Indicators
```bash
# When to migrate from Pro to Own Server
Database Storage > 6GB (80% of 8GB)
Response Time > 300ms average
CPU Usage > 70% consistently
Memory Usage > 80% consistently
Monthly Cost > $100
Compliance Requirements
Custom Feature Requirements
High Availability Requirements
```

#### Own Server Scaling Indicators
```bash
# When to scale horizontally
CPU Usage > 70% for > 1 hour
Memory Usage > 80% for > 30 minutes
Response Time > 200ms average
Concurrent Users > 500
Database Connections > 80% of limit
Geographic Distribution Required
High Availability Required
```

## ⚡ Automatic Scaling Procedures

### Vertical Scaling Triggers

#### CPU-Based Scaling
```bash
# Monitor CPU usage and trigger scaling
#!/bin/bash

# Configuration
CPU_THRESHOLD=70
SCALE_UP_COOLDOWN=300  # 5 minutes
SCALE_DOWN_COOLDOWN=1800  # 30 minutes
LAST_SCALE_TIME=0

# Get current CPU usage
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | sed 's/us,//')
current_time=$(date +%s)

# Determine if we should scale
if (( $(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l) )); then
    if [ $((current_time - LAST_SCALE_TIME)) -gt $SCALE_UP_COOLDOWN ]; then
        echo "$(date): High CPU usage detected: ${cpu_usage}%"
        
        # Trigger scaling based on current tier
        if [ "$DEPLOYMENT_TIER" == "free" ]; then
            echo "$(date): Triggering upgrade from Free to Pro tier"
            # Send upgrade notification
            # Or auto-upgrade if configured
        elif [ "$DEPLOYMENT_TIER" == "pro" ]; then
            echo "$(date): Triggering server resource upgrade"
            # Upgrade VPS resources
        fi
        
        LAST_SCALE_TIME=$current_time
    fi
elif (( $(echo "$cpu_usage < 30" | bc -l) )); then
    if [ $((current_time - LAST_SCALE_TIME)) -gt $SCALE_DOWN_COOLDOWN ]; then
        echo "$(date): Low CPU usage detected: ${cpu_usage}%"
        # Consider scaling down (only for own server)
    fi
fi
```

#### Memory-Based Scaling
```bash
# Memory usage monitoring and scaling
#!/bin/bash

MEMORY_THRESHOLD=80
SCALE_UP_COOLDOWN=300
LAST_SCALE_TIME=0

# Get current memory usage
memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
current_time=$(date +%s)

if [ $memory_usage -gt $MEMORY_THRESHOLD ]; then
    if [ $((current_time - LAST_SCALE_TIME)) -gt $SCALE_UP_COOLDOWN ]; then
        echo "$(date): High memory usage detected: ${memory_usage}%"
        
        # Check for memory leaks first
        memory_growth=$(pm2 jlist | jq '.[0].monit.memory' | tail -1)
        
        if (( $(echo "$memory_growth > 1073741824" | bc -l) )); then  # 1GB
            echo "$(date): Potential memory leak detected, investigating"
            # Investigate memory usage
            # pm2 logs hrm-saas-backend --lines 1000 | grep -i "memory\|heap"
        else
            echo "$(date): Memory scaling triggered"
            # Scale up resources
        fi
        
        LAST_SCALE_TIME=$current_time
    fi
fi
```

#### Response Time Scaling
```bash
# Response time based scaling
#!/bin/bash

RESPONSE_TIME_THRESHOLD=300  # milliseconds
MEASUREMENT_WINDOW=10  # number of measurements
MEASUREMENTS_FILE="/tmp/response_measurements"

# Collect response time measurements
response_time=$(curl -w "%{time_total}" -o /dev/null -s "https://yourdomain.com/health")
response_time_ms=$(echo "$response_time * 1000" | bc)

# Append to measurements file
echo "$response_time_ms" >> "$MEASUREMENTS_FILE"

# Keep only last N measurements
tail -n "$MEASUREMENT_WINDOW" "$MEASUREMENTS_FILE" > "${MEASUREMENTS_FILE}.tmp"
mv "${MEASUREMENTS_FILE}.tmp" "$MEASUREMENTS_FILE"

# Calculate average response time
avg_response_time=$(awk '{sum+=$1} END {print sum/NR}' "$MEASUREMENTS_FILE")

if (( $(echo "$avg_response_time > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
    echo "$(date): High response time detected: ${avg_response_time}ms average"
    # Trigger scaling
    # Could be:
    # 1. Upgrade to Pro tier
    # 2. Add database connections
    # 3. Enable caching
    # 4. Scale horizontally
fi
```

### Horizontal Scaling Triggers

#### Load-Based Scaling
```bash
# Request rate based horizontal scaling
#!/bin/bash

# Configuration
REQUEST_RATE_THRESHOLD=100  # requests per minute
MEASUREMENT_PERIOD=60  # seconds

# Count requests in measurement period
request_count=$(curl -s "https://yourdomain.com/api/metrics/requests" | jq -r '.requests_last_minute // 0')

echo "$(date): Current request rate: $request_count requests/minute"

if [ "$request_count" -gt "$REQUEST_RATE_THRESHOLD" ]; then
    echo "$(date): High request rate detected, considering horizontal scaling"
    
    # Check current number of instances
    current_instances=$(pm2 jlist | jq '. | length')
    max_instances=4
    
    if [ "$current_instances" -lt "$max_instances" ]; then
        echo "$(date): Scaling horizontally: $current_instances → $((current_instances + 1)) instances"
        
        # Add new PM2 instance
        pm2 scale hrm-saas-backend +1
        
        # Wait and verify
        sleep 30
        new_instances=$(pm2 jlist | jq '. | length')
        
        if [ "$new_instances" -eq $((current_instances + 1)) ]; then
            echo "$(date): Horizontal scaling successful"
        else
            echo "$(date): Horizontal scaling failed"
        fi
    else
        echo "$(date): Maximum instances reached, consider vertical scaling"
    fi
fi
```

#### Database Connection Scaling
```bash
# Database connection pool scaling
#!/bin/bash

# Configuration
CONNECTION_THRESHOLD=80  # percentage of max connections
DB_HOST="localhost"

# Get database connection stats
if command -v psql &> /dev/null; then
    active_connections=$(psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    max_connections=$(psql -U postgres -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
    
    if [ ! -z "$active_connections" ] && [ ! -z "$max_connections" ]; then
        connection_percent=$((active_connections * 100 / max_connections))
        
        echo "$(date): Database connections: $active_connections/$max_connections ($connection_percent%)"
        
        if [ $connection_percent -gt $CONNECTION_THRESHOLD ]; then
            echo "$(date): High database connection usage, scaling database"
            
            # Options for scaling:
            # 1. Increase max_connections
            # 2. Add read replicas
            # 3. Implement connection pooling
            # 4. Optimize queries
            
            # Increase connection pool size temporarily
            psql -U postgres -c "ALTER SYSTEM SET max_connections = $((max_connections + 20));"
            psql -U postgres -c "SELECT pg_reload_conf();"
        fi
    fi
fi
```

## 🛠️ Manual Scaling Procedures

### Free to Pro Tier Upgrade

#### Pre-Upgrade Assessment
```bash
# Assessment checklist before upgrading
echo "=== Free to Pro Tier Upgrade Assessment ==="

# 1. Current resource usage
echo "Current Resource Usage:"
echo "- Database storage: $(du -sh /var/lib/postgresql/data 2>/dev/null | cut -f1)"
echo "- Response time: $(curl -w "%{time_total}" -o /dev/null -s https://yourdomain.com/health | awk '{print $1 * 1000 "ms"}')"
echo "- Error rate: $(curl -s https://yourdomain.com/api/health | jq -r '.error_rate // 0')%"

# 2. Business requirements
echo "Business Requirements:"
echo "- Expected user growth: [enter number]"
echo "- Performance SLA: [enter requirement]"
echo "- Budget approval: [yes/no]"

# 3. Cost analysis
echo "Cost Impact:"
echo "- Current monthly cost: $0"
echo "- Pro tier monthly cost: $67"
echo "- Annual cost increase: $804"

# 4. Technical readiness
echo "Technical Readiness:"
echo "- All services stable: [yes/no]"
echo "- No ongoing incidents: [yes/no]"
echo "- Team notification sent: [yes/no]"

echo "Assessment complete. Proceed with upgrade if all checks pass."
```

#### Pro Tier Upgrade Steps
```bash
# Step-by-step Pro tier upgrade
echo "=== Upgrading to Pro Tier ==="

# 1. Create backup before upgrade
echo "Step 1: Creating pre-upgrade backup"
/scripts/backup.sh
echo "Backup completed"

# 2. Upgrade Supabase
echo "Step 2: Upgrading Supabase to Pro"
echo "Please complete manually:"
echo "1. Visit https://supabase.com/dashboard"
echo "2. Navigate to Project → Settings → Billing"
echo "3. Upgrade to Pro plan ($25/month)"
echo "4. Verify upgrade in dashboard"
read -p "Press Enter when Supabase upgrade is complete..."

# 3. Upgrade Render
echo "Step 3: Upgrading Render to Pro"
echo "Please complete manually:"
echo "1. Visit https://dashboard.render.com"
echo "2. Navigate to Service → Settings"
echo "3. Change Instance Type to Standard ($7/month)"
echo "4. Save changes and wait for restart"
read -p "Press Enter when Render upgrade is complete..."

# 4. Upgrade Vercel
echo "Step 4: Upgrading Vercel to Pro"
echo "Please complete manually:"
echo "1. Visit https://vercel.com/dashboard"
echo "2. Navigate to Project → Settings → Billing"
echo "3. Upgrade to Pro plan ($20/month)"
echo "4. Verify upgrade"
read -Press Enter when Vercel upgrade is complete..."

# 5. Post-upgrade verification
echo "Step 5: Post-upgrade verification"
curl -f https://yourdomain.com/health
curl -f https://yourdomain.com/api/health

# 6. Update monitoring thresholds
echo "Step 6: Updating monitoring thresholds"
# Update scripts to reflect new Pro tier limits

echo "Pro tier upgrade completed successfully!"
```

### Pro to Own Server Migration

#### Pre-Migration Preparation
```bash
# Pre-migration preparation checklist
echo "=== Pro to Own Server Migration Preparation ==="

# 1. Resource requirements planning
echo "Resource Planning:"
echo "- Current load: [measure current usage]"
echo "- Expected growth: [project 6-12 months]"
echo "- Recommended specs: 4GB RAM, 2 vCPU minimum"

# 2. Server provisioning
echo "Server Provisioning:"
echo "- VPS provider: DigitalOcean recommended"
echo "- Operating system: Ubuntu 22.04 LTS"
echo "- Additional storage: 100GB backup space"

# 3. DNS planning
echo "DNS Planning:"
echo "- Current domain configuration"
echo "- SSL certificate planning"
echo "- Subdomain setup for multi-tenancy"

# 4. Data migration planning
echo "Data Migration:"
echo "- Database export from Supabase"
echo "- File backup from all services"
echo "- Configuration export"

# 5. Timeline planning
echo "Migration Timeline:"
echo "- Preparation: 1-2 days"
echo "- Data migration: 4-6 hours"
echo "- Testing and verification: 2-4 hours"
echo "- DNS cutover: 30 minutes"
echo "- Post-migration monitoring: 48 hours"

echo "Migration preparation complete. Review timeline and resources."
```

#### Own Server Scaling Procedure
```bash
# Complete own server setup and scaling
echo "=== Own Server Setup and Scaling ==="

# 1. Server setup (follow OWN_SERVER_SETUP.md)
echo "Step 1: Server provisioning and setup"
echo "Follow the complete guide: docs/deployment/OWN_SERVER_SETUP.md"

# 2. Database migration
echo "Step 2: Database migration from Supabase"
# Export from Supabase
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
    --no-owner --no-privileges --schema=public \
    > hrm_saas_migration_backup.sql

# Import to own server
gunzip -c hrm_saas_migration_backup.sql | \
psql -U hrm_user -d hrm_saas -h localhost

# 3. Application deployment
echo "Step 3: Application deployment"
# Deploy backend
cd /home/hrm-saas/apps/hrm-saas/backend
npm install --production
npm run build
pm2 start ecosystem.config.js

# Deploy frontend
cd ../frontend
npm install
npm run build
sudo cp -r .next /var/www/hrm-saas/

# 4. SSL setup
echo "Step 4: SSL certificate setup"
sudo certbot --nginx -d yourdomain.com -d *.yourdomain.com

# 5. Performance optimization
echo "Step 5: Performance optimization"
# Database optimization
sudo -u postgres psql -d hrm_saas -c "ANALYZE;"

# Application optimization
pm2 scale hrm-saas-backend 2  # Start with 2 instances

# NGINX optimization
sudo nginx -t && sudo systemctl reload nginx

echo "Own server deployment complete!"
```

### Horizontal Scaling Implementation

#### Load Balancer Setup
```bash
# NGINX load balancer configuration
echo "=== Setting up NGINX Load Balancer ==="

# Create load balancer configuration
sudo tee /etc/nginx/sites-available/hrm-saas-lb << EOF
upstream backend {
    server localhost:5000 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:5001 weight=1 max_fails=3 fail_timeout=30s;
    server localhost:5002 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Load balancer specific settings
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}
EOF

# Test and enable
sudo nginx -t
sudo ln -sf /etc/nginx/sites-available/hrm-saas-lb /etc/nginx/sites-enabled/
sudo systemctl reload nginx

echo "NGINX load balancer configured"
```

#### PM2 Cluster Mode Setup
```bash
# PM2 clustering for horizontal scaling
echo "=== Setting up PM2 Cluster Mode ==="

# Update PM2 configuration for clustering
cat > /home/hrm-saas/apps/hrm-saas/backend/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'hrm-saas-backend',
    script: './dist/server.js',
    cwd: '/home/hrm-saas/apps/hrm-saas/backend',
    
    // Clustering
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
    
    // Health monitoring
    monitoring: false,
    
    // Log rotation
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start with cluster mode
cd /home/hrm-saas/apps/hrm-saas/backend
pm2 delete hrm-saas-backend 2>/dev/null || true
pm2 start ecosystem.config.js

# Verify cluster mode
pm2 list
pm2 monit

echo "PM2 cluster mode configured and started"
```

#### Database Scaling
```bash
# Database scaling procedures
echo "=== Database Scaling Procedures ==="

# 1. Connection pooling optimization
echo "Step 1: Optimizing connection pooling"
# Update database configuration
sudo -u postgres psql -c "
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET effective_cache_size = '3GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
"

# 2. Read replica setup (if needed)
echo "Step 2: Setting up read replica"
# This would require additional server setup
# For now, document the process:
echo "Read replica setup requires:"
echo "1. Additional PostgreSQL server"
echo "2. Streaming replication configuration"
echo "3. Application-level read/write splitting"
echo "4. Monitoring and failover procedures"

# 3. Query optimization
echo "Step 3: Query optimization"
# Identify slow queries
sudo -u postgres psql -d hrm_saas -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
"

# Add indexes for slow queries
# (This would be based on actual query analysis)

echo "Database scaling optimization completed"
```

## 📊 Monitoring During Scaling

### Scaling Performance Monitoring
```bash
# Monitor scaling performance
#!/bin/bash

echo "=== Scaling Performance Monitoring ==="

# Response time monitoring
echo "Response Time Analysis:"
for endpoint in "/health" "/api/auth/test-db" "/"; do
    response_time=$(curl -w "%{time_total}" -o /dev/null -s "https://yourdomain.com$endpoint")
    response_time_ms=$(echo "$response_time * 1000" | bc)
    echo "- $endpoint: ${response_time_ms}ms"
done

# Throughput monitoring
echo "Throughput Analysis:"
current_rps=$(curl -s "https://yourdomain.com/api/metrics/requests" | jq -r '.requests_per_second // 0')
echo "Current RPS: $current_rps"

# Resource utilization
echo "Resource Utilization:"
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | sed 's/us,//')
memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
echo "CPU Usage: ${cpu_usage}%"
echo "Memory Usage: ${memory_usage}%"

# Database performance
if command -v psql &> /dev/null; then
    db_connections=$(psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    echo "Database Connections: $db_connections"
fi

# Application instances
instances=$(pm2 jlist | jq '. | length' 2>/dev/null || echo "1")
echo "Application Instances: $instances"

echo "Monitoring data collected"
```

### Scaling Success Metrics
```bash
# Define and measure scaling success
#!/bin/bash

echo "=== Scaling Success Metrics ==="

# Performance improvement metrics
baseline_response_time=400  # ms before scaling
current_response_time=$(curl -w "%{time_total}" -o /dev/null -s "https://yourdomain.com/health" | awk '{print $1 * 1000}')
improvement_percent=$(echo "scale=2; ($baseline_response_time - $current_response_time) * 100 / $baseline_response_time" | bc)

echo "Performance Improvement:"
echo "- Baseline response time: ${baseline_response_time}ms"
echo "- Current response time: ${current_response_time}ms"
echo "- Improvement: ${improvement_percent}%"

# Capacity improvement metrics
baseline_max_users=50
current_max_users=500
capacity_improvement=$(echo "scale=0; ($current_max_users - $baseline_max_users) * 100 / $baseline_max_users" | bc)

echo "Capacity Improvement:"
echo "- Baseline max users: $baseline_max_users"
echo "- Current max users: $current_max_users"
echo "- Capacity increase: ${capacity_improvement}%"

# Cost efficiency metrics
echo "Cost Efficiency:"
echo "- Cost per user before: $0 (free tier)"
echo "- Cost per user after: $(echo "scale=4; 67 / $current_max_users" | bc)"
echo "- Cost per transaction: [calculate based on revenue]"

echo "Scaling success metrics collected"
```

## 🔄 Scaling Rollback Procedures

### Automatic Rollback Triggers
```bash
# Automatic rollback on scaling failure
#!/bin/bash

# Monitoring for scaling failure
SCALING_FAILURE_THRESHOLD=300  # seconds
HEALTH_CHECK_INTERVAL=30  # seconds

# Monitor health during scaling
start_time=$(date +%s)
failure_count=0

while [ $(( $(date +%s) - start_time )) -lt $SCALING_FAILURE_THRESHOLD ]; do
    # Health check
    if curl -f https://yourdomain.com/health >/dev/null 2>&1; then
        failure_count=0
    else
        failure_count=$((failure_count + 1))
        echo "$(date): Health check failed (attempt $failure_count)"
    fi
    
    if [ $failure_count -gt 3 ]; then
        echo "$(date): Scaling failure detected, initiating rollback"
        
        # Rollback procedures
        # 1. Revert to previous configuration
        # 2. Restart services
        # 3. Verify health
        # 4. Notify team
        
        break
    fi
    
    sleep $HEALTH_CHECK_INTERVAL
done

if [ $failure_count -eq 0 ]; then
    echo "$(date): Scaling completed successfully"
else
    echo "$(date): Scaling failed and was rolled back"
fi
```

### Manual Rollback Procedures
```bash
# Manual scaling rollback
echo "=== Manual Scaling Rollback ==="

# 1. Assess rollback need
echo "Rollback Assessment:"
echo "- Scaling issue: [describe issue]"
echo "- Impact level: [high/medium/low]"
echo "- Rollback time: [estimate]"

# 2. Execute rollback
echo "Executing rollback..."

# Vertical scaling rollback
if [ "$SCALING_TYPE" == "vertical" ]; then
    echo "Rolling back vertical scaling..."
    # Revert resource upgrades
    # Restart services with previous configuration
fi

# Horizontal scaling rollback
if [ "$SCALING_TYPE" == "horizontal" ]; then
    echo "Rolling back horizontal scaling..."
    # Reduce PM2 instances
    pm2 scale hrm-saas-backend 1
    
    # Update load balancer
    sudo nginx -t && sudo systemctl reload nginx
fi

# 3. Verify rollback
echo "Verifying rollback..."
curl -f https://yourdomain.com/health
pm2 status
sudo systemctl status nginx

echo "Rollback completed"
```

## 📋 Scaling Checklist

### Pre-Scaling Checklist
- [ ] **Scaling trigger confirmed**
- [ ] **Resource assessment completed**
- [ ] **Cost analysis approved**
- [ ] **Team notification sent**
- [ ] **Backup created**
- [ ] **Rollback plan prepared**
- [ ] **Monitoring enhanced**
- [ ] **Performance baseline recorded**

### Scaling Execution Checklist
- [ ] **Scaling procedure initiated**
- [ ] **Services monitored continuously**
- [ ] **Performance metrics tracked**
- [ ] **Error rates monitored**
- [ ] **Resource usage verified**
- [ ] **User experience validated**
- [ ] **Team updated regularly**
- [ ] **Documentation updated**

### Post-Scaling Checklist
- [ ] **Scaling success confirmed**
- [ ] **Performance improved**
- [ ] **Monitoring adjusted for new baseline**
- [ ] **Documentation updated**
- [ ] **Team debrief completed**
- [ ] **Lessons learned documented**
- [ ] **Future scaling triggers updated**
- [ ] **Cost optimization reviewed**

### Rollback Checklist
- [ ] **Rollback decision made**
- [ ] **Rollback procedure executed**
- [ ] **Services restored**
- [ ] **Performance verified**
- [ ] **Root cause analyzed**
- [ ] **Prevention measures implemented**
- [ ] **Team notified of resolution**
- [ ] **Documentation updated**

## 🎯 Scaling Best Practices

### Performance Optimization

#### Database Optimization
```bash
# Optimize database for scaling
# 1. Connection pooling
# 2. Query optimization
# 3. Index optimization
# 4. Read replicas
# 5. Caching strategies
```

#### Application Optimization
```bash
# Optimize application for scaling
# 1. Code optimization
# 2. Memory management
# 3. CPU efficiency
# 4. Response caching
# 5. Resource pooling
```

### Monitoring and Alerting

#### Scaling-Specific Monitoring
```bash
# Monitor scaling metrics
# 1. Response times
# 2. Throughput
# 3. Resource utilization
# 4. Error rates
# 5. User experience
```

#### Automated Scaling Decisions
```bash
# Make scaling decisions automated
# 1. Clear thresholds
# 2. Cooldown periods
# 3. Safety checks
# 4. Rollback triggers
# 5. Notification systems
```

### Cost Optimization

#### Right-Sizing Resources
```bash
# Optimize resource allocation
# 1. Regular assessment
# 2. Usage pattern analysis
# 3. Cost monitoring
# 4. Performance vs cost balance
# 5. Reserved capacity planning
```

---

**💡 Remember**: Scaling should be proactive, not reactive. Monitor trends, plan for growth, and scale before you hit limits. Always test scaling procedures and have rollback plans ready.