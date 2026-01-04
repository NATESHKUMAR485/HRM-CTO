# Database Maintenance Runbook

## Overview

This runbook provides comprehensive procedures for maintaining the PostgreSQL database that powers the HRM SaaS platform. It covers routine maintenance, performance optimization, backup procedures, and emergency recovery.

**Maintenance Frequency:** Daily health checks, Weekly optimization, Monthly reviews  
**Performance Targets:** Query time < 50ms, Connection usage < 80%  
**Maintenance Window:** 2-4 hours weekly (low-traffic periods)  
**Emergency Response:** < 15 minutes for critical issues  

## 🔧 Database Maintenance Strategy

### Maintenance Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                   Routine Maintenance                          │
├─────────────────────────────────────────────────────────────────┤
│ • Daily: Health checks, connection monitoring                  │
│ • Weekly: VACUUM, ANALYZE, index maintenance                   │
│ • Monthly: Statistics review, performance analysis             │
│ • Quarterly: Deep analysis, optimization review                │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                 Performance Optimization                       │
├─────────────────────────────────────────────────────────────────┤
│ • Query optimization and indexing                              │
│ • Connection pool tuning                                       │
│ • Memory configuration optimization                            │
│ • Statistics and cost model updates                            │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Backup & Recovery                           │
├─────────────────────────────────────────────────────────────────┤
│ • Daily backups with verification                              │
│ • Point-in-time recovery capabilities                          │
│ • Backup testing and validation                                │
│ • Disaster recovery procedures                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Performance Targets

#### Query Performance
```bash
# Performance thresholds
Critical: Query time > 1000ms (immediate investigation)
High: Query time > 500ms (optimization needed)
Warning: Query time > 100ms (monitor closely)
Target: Query time < 50ms (excellent performance)

# Connection thresholds
Critical: > 90% of max connections (immediate action)
High: > 80% of max connections (optimization needed)
Warning: > 70% of max connections (monitor closely)
Target: < 50% of max connections (healthy usage)
```

#### Storage and Growth
```bash
# Storage thresholds
Critical: > 95% disk usage (immediate expansion)
High: > 85% disk usage (plan expansion)
Warning: > 75% disk usage (monitor growth)
Target: < 60% disk usage (healthy headroom)

# Growth monitoring
Database size growth: < 10% per month
Table growth: Monitor per-tenant growth patterns
Index size: < 30% of table size
```

## 📊 Daily Database Health Checks

### Automated Health Check Script

Create `/scripts/db-health-check.sh`:

```bash
#!/bin/bash

# Daily Database Health Check
# Purpose: Monitor database health and performance
# Schedule: Daily at 9:00 AM via cron

set -e

# Configuration
DB_NAME="hrm_saas"
DB_USER="hrm_user"
DB_HOST="localhost"
LOG_FILE="/var/log/hrm-saas/db-health.log"
ALERT_EMAIL="admin@yourdomain.com"

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

log_message "Starting daily database health check"

# 1. Connection Health
log_message "Checking database connections..."
active_connections=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_activity 
    WHERE state = 'active';" 2>/dev/null | tr -d ' ')

total_connections=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')

max_connections=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SHOW max_connections;" 2>/dev/null | tr -d ' ')

connection_percent=$((total_connections * 100 / max_connections))

log_message "Connections: $total_connections/$max_connections ($connection_percent%)"

if [ $connection_percent -gt 80 ]; then
    log_message "WARNING: High connection usage ($connection_percent%)"
    # Send alert if configured
fi

# 2. Database Size
log_message "Checking database size..."
db_size=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | tr -d ' ')

log_message "Database size: $db_size"

# 3. Table Statistics
log_message "Checking table statistics..."
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;
" 2>/dev/null

# 4. Index Usage
log_message "Checking index usage..."
unused_indexes=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_user_indexes 
    WHERE idx_scan = 0;" 2>/dev/null | tr -d ' ')

log_message "Unused indexes: $unused_indexes"

if [ "$unused_indexes" -gt 0 ]; then
    log_message "WARNING: Found $unused_indexes unused indexes"
    # List unused indexes for review
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT schemaname, tablename, indexname 
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        ORDER BY tablename, indexname;
    " 2>/dev/null
fi

# 5. Slow Queries
log_message "Checking for slow queries..."
slow_query_count=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_statements 
    WHERE mean_time > 100;" 2>/dev/null | tr -d ' ')

log_message "Slow queries (>100ms): $slow_query_count"

if [ "$slow_query_count" -gt 0 ]; then
    log_message "WARNING: Found $slow_query_count slow queries"
    # Log slow queries for analysis
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT query, mean_time, calls 
        FROM pg_stat_statements 
        WHERE mean_time > 100 
        ORDER BY mean_time DESC 
        LIMIT 5;
    " 2>/dev/null >> "$LOG_FILE"
fi

# 6. Lock Analysis
log_message "Checking for locks..."
blocking_queries=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_locks 
    WHERE NOT granted;" 2>/dev/null | tr -d ' ')

log_message "Blocked queries: $blocking_queries"

if [ "$blocking_queries" -gt 0 ]; then
    log_message "WARNING: Found $blocking_queries blocked queries"
    # Log blocking queries for investigation
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            a.datname,
            l.relation::regclass,
            l.transactionid,
            l.mode,
            l.locktype,
            page AS virtual_transaction,
            virtualxid AS transaction,
            xid AS ordinal_id,
            pid,
            adrelid::regclass AS table,
            pg_class.relname AS table_name,
            pg_namespace.nspname AS table_schema,
            pg_locks.gid,
            mode,
            granted
        FROM pg_locks blocked_locks
        JOIN pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
            AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
            AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
            AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
            AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
            AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
            AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
            AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
            AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
            AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
            AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
            AND blocking_locks.pid != blocked_locks.pid
        JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        JOIN pg_class ON pg_class.oid = blocked_locks.relation
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE NOT blocked_locks.granted;
    " 2>/dev/null >> "$LOG_FILE"
fi

# 7. Autovacuum Status
log_message "Checking autovacuum status..."
autovacuum_running=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_activity 
    WHERE query LIKE '%autovacuum%';" 2>/dev/null | tr -d ' ')

log_message "Autovacuum processes: $autovacuum_running"

# 8. Replication Status (if applicable)
log_message "Checking replication status..."
if psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM pg_stat_replication;" 2>/dev/null | grep -q 1; then
    replication_lag=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) 
        FROM pg_stat_replication;" 2>/dev/null | tr -d ' ')
    
    log_message "Replication lag: $replication_lag bytes"
else
    log_message "No replication configured"
fi

# 9. Summary
log_message "Database health check completed"
log_message "Summary: Connections: $total_connections/$max_connections, Size: $db_size, Slow queries: $slow_query_count"

# Optional: Send health report
# echo "Daily Database Health Report - $(date)
# 
# Database: $DB_NAME
# Connections: $total_connections/$max_connections ($connection_percent%)
# Database Size: $db_size
# Slow Queries: $slow_query_count
# Unused Indexes: $unused_indexes
# Blocked Queries: $blocking_queries
# 
# Status: Database health check completed
# " | mail -s "Daily DB Health Report - $(date +%Y-%m-%d)" "$ALERT_EMAIL"

exit 0
```

### Performance Monitoring

Create `/scripts/db-performance-monitor.sh`:

```bash
#!/bin/bash

# Database Performance Monitor
# Purpose: Continuous performance monitoring
# Schedule: Every 15 minutes via cron

# Configuration
DB_NAME="hrm_saas"
DB_USER="hrm_user"
PERFORMANCE_LOG="/var/log/hrm-saas/db-performance.log"

log_performance() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$PERFORMANCE_LOG"
}

# Response time monitoring
query_start=$(date +%s%3N)
psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM tenants;" >/dev/null 2>&1
query_end=$(date +%s%3N)
query_time=$((query_end - query_start))

log_performance "Tenant query time: ${query_time}ms"

# Connection monitoring
connections=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')

log_performance "Active connections: $connections"

# Cache hit ratio
cache_hit_ratio=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT round(
        100 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2
    ) FROM pg_stat_database 
    WHERE datname = '$DB_NAME';" 2>/dev/null | tr -d ' ')

log_performance "Cache hit ratio: ${cache_hit_ratio}%"

# Alert on performance issues
if [ "$query_time" -gt 100 ]; then
    log_performance "WARNING: Slow query detected (${query_time}ms)"
fi

if (( $(echo "$cache_hit_ratio < 95" | bc -l) )); then
    log_performance "WARNING: Low cache hit ratio (${cache_hit_ratio}%)"
fi
```

## 🔧 Weekly Database Maintenance

### Weekly Maintenance Script

Create `/scripts/db-weekly-maintenance.sh`:

```bash
#!/bin/bash

# Weekly Database Maintenance
# Purpose: Routine database maintenance and optimization
# Schedule: Sunday at 3:00 AM via cron

set -e

# Configuration
DB_NAME="hrm_saas"
DB_USER="hrm_user"
LOG_FILE="/var/log/hrm-saas/db-maintenance.log"
MAINTENANCE_START=$(date)

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

log_message "Starting weekly database maintenance"

# 1. Update Statistics
log_message "Step 1: Updating database statistics"
psql -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE VERBOSE;" >> "$LOG_FILE" 2>&1
log_message "Statistics updated successfully"

# 2. Vacuum Operations
log_message "Step 2: Running VACUUM operations"

# Standard VACUUM
log_message "Running VACUUM ANALYZE..."
psql -U "$DB_USER" -d "$DB_NAME" -c "VACUUM (ANALYZE, VERBOSE);" >> "$LOG_FILE" 2>&1

# Optional: Full VACUUM (if needed, takes longer)
# log_message "Running VACUUM FULL (this may take longer)..."
# psql -U "$DB_USER" -d "$DB_NAME" -c "VACUUM FULL (ANALYZE, VERBOSE);" >> "$LOG_FILE" 2>&1

log_message "VACUUM operations completed"

# 3. Index Maintenance
log_message "Step 3: Index maintenance"

# Find unused indexes
log_message "Checking for unused indexes..."
unused_indexes=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_user_indexes 
    WHERE idx_scan = 0;" 2>/dev/null | tr -d ' ')

log_message "Found $unused_indexes unused indexes"

if [ "$unused_indexes" -gt 0 ]; then
    log_message "Listing unused indexes for review:"
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        ORDER BY pg_relation_size(indexrelid) DESC;
    " >> "$LOG_FILE" 2>&1
fi

# Rebuild bloated indexes
log_message "Checking for bloated indexes..."
bloated_indexes=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM (
        SELECT 
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) as size,
            round(
                100 * pg_relation_size(indexrelid) / (
                    SELECT sum(pg_relation_size(indexrelid)) 
                    FROM pg_stat_user_indexes 
                    WHERE schemaname = 'public'
                ), 2
            ) as pct_of_total
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 10
    ) t 
    WHERE pct_of_total > 10;
" 2>/dev/null | tr -d ' ')

log_message "Found $bloated_indexes potentially bloated indexes"

# 4. Table Analysis
log_message "Step 4: Table analysis"
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_live_tup,
        n_dead_tup,
        round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) as dead_tup_pct
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" >> "$LOG_FILE" 2>&1

# 5. Configuration Review
log_message "Step 5: Configuration review"

# Check current configuration
log_message "Current database configuration:"
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT name, setting, unit, context 
    FROM pg_settings 
    WHERE name IN (
        'shared_buffers', 
        'effective_cache_size', 
        'work_mem', 
        'maintenance_work_mem',
        'checkpoint_completion_target',
        'wal_buffers',
        'default_statistics_target'
    )
    ORDER BY name;
" >> "$LOG_FILE" 2>&1

# 6. Query Performance Analysis
log_message "Step 6: Query performance analysis"
if psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM pg_stat_statements;" 2>/dev/null | grep -q 1; then
    log_message "Analyzing slow queries..."
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            query,
            calls,
            round(mean_time::numeric, 2) as mean_time_ms,
            round(total_time::numeric, 2) as total_time_ms,
            round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 2) as hit_pct
        FROM pg_stat_statements 
        WHERE mean_time > 10
        ORDER BY mean_time DESC 
        LIMIT 10;
    " >> "$LOG_FILE" 2>&1
else
    log_message "pg_stat_statements not available, skipping query analysis"
fi

# 7. Cleanup
log_message "Step 7: Cleanup operations"

# Remove old log entries (keep last 1000 lines)
tail -n 1000 "$PERFORMANCE_LOG" > "${PERFORMANCE_LOG}.tmp"
mv "${PERFORMANCE_LOG}.tmp" "$PERFORMANCE_LOG"

# 8. Maintenance Summary
MAINTENANCE_END=$(date)
log_message "Weekly database maintenance completed"
log_message "Maintenance started: $MAINTENANCE_START"
log_message "Maintenance completed: $MAINTENANCE_END"

# Send maintenance report
echo "Weekly Database Maintenance Report

Maintenance Period: $MAINTENANCE_START - $MAINTENANCE_END

Operations Completed:
- Statistics updated (ANALYZE)
- VACUUM operations performed
- Index usage analyzed
- Table statistics reviewed
- Configuration checked
- Query performance analyzed

Key Findings:
- Unused indexes: $unused_indexes
- Bloated indexes: $bloated_indexes
- Database performance: $(tail -n 1 "$PERFORMANCE_LOG")

Next Steps:
- Review unused indexes for removal
- Monitor query performance
- Consider index optimization

" | mail -s "Weekly DB Maintenance Report - $(date +%Y-%m-%d)" admin@yourdomain.com

exit 0
```

### Index Optimization

#### Index Analysis Script

Create `/scripts/db-index-analysis.sh`:

```bash
#!/bin/bash

# Database Index Analysis
# Purpose: Analyze and optimize database indexes
# Schedule: Weekly as part of maintenance

# Configuration
DB_NAME="hrm_saas"
DB_USER="hrm_user"
INDEX_LOG="/var/log/hrm-saas/db-index-analysis.log"

log_index() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$INDEX_LOG"
}

log_index "Starting index analysis"

# 1. Find unused indexes
log_index "Finding unused indexes..."
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan
    FROM pg_stat_user_indexes 
    WHERE idx_scan = 0 
    AND schemaname = 'public'
    ORDER BY pg_relation_size(indexrelid) DESC;
" >> "$INDEX_LOG"

# 2. Find duplicate indexes
log_index "Finding duplicate indexes..."
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        t.relname AS table_name,
        i.relname AS index_name,
        ix.indkey::regclass AS indexed_column,
        pg_size_pretty(pg_relation_size(i.oid)) AS index_size
    FROM pg_class t
    JOIN pg_index ix ON t.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    WHERE t.relkind = 'r'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND i.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ORDER BY pg_relation_size(i.oid) DESC;
" >> "$INDEX_LOG"

# 3. Find missing indexes for foreign keys
log_index "Finding foreign keys without indexes..."
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class c ON c.oid = i.indrelid
        WHERE i.indisprimary = false
        AND array_to_string(i.indkey, ' ') LIKE '%' || kcu.ordinal_position::text || '%'
        AND c.relname = tc.table_name
    );
" >> "$INDEX_LOG"

# 4. Analyze index effectiveness
log_index "Analyzing index effectiveness..."
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
            WHEN idx_scan = 0 THEN 'Never used'
            WHEN idx_tup_read = 0 THEN 'No rows read'
            ELSE round(idx_tup_fetch::numeric / idx_tup_read * 100, 2)::text || '%' 
        END as efficiency
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    AND idx_scan > 0
    ORDER BY idx_scan DESC;
" >> "$INDEX_LOG"

log_index "Index analysis completed"

# Generate index recommendations
echo "Index Optimization Recommendations

Based on the analysis:

1. Unused Indexes to Consider Removing:
$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 'DROP INDEX ' || schemaname || '.' || indexname || ';' 
    FROM pg_stat_user_indexes 
    WHERE idx_scan = 0 AND schemaname = 'public';
")

2. Missing Foreign Key Indexes to Add:
$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 'CREATE INDEX idx_' || table_name || '_' || column_name || 
           ' ON ' || table_name || '(' || column_name || ');'
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class c ON c.oid = i.indrelid
        WHERE i.indisprimary = false
        AND array_to_string(i.indkey, ' ') LIKE '%' || kcu.ordinal_position::text || '%'
        AND c.relname = tc.table_name
    );
")

" > /tmp/index-recommendations.sql

log_index "Index recommendations generated in /tmp/index-recommendations.sql"
```

## 📈 Monthly Database Review

### Comprehensive Analysis Script

Create `/scripts/db-monthly-review.sh`:

```bash
#!/bin/bash

# Monthly Database Review
# Purpose: Comprehensive monthly database analysis and optimization review
# Schedule: First Sunday of each month

set -e

# Configuration
DB_NAME="hrm_saas"
DB_USER="hrm_user"
LOG_FILE="/var/log/hrm-saas/db-monthly-review.log"
REPORT_FILE="/tmp/db-monthly-report-$(date +%Y%m).txt"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

log_message "Starting monthly database review"

# Create monthly report
cat > "$REPORT_FILE" << EOF
HRM SaaS Database Monthly Review - $(date +%Y-%m)

EXECUTIVE SUMMARY
================
This report provides a comprehensive analysis of the HRM SaaS database performance, 
usage patterns, and optimization opportunities for $(date +%B %Y).

EOF

# 1. Performance Summary
log_message "Analyzing performance metrics..."

cat >> "$REPORT_FILE" << EOF
PERFORMANCE SUMMARY
==================

1. Query Performance
-------------------
EOF

# Average query performance
if psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM pg_stat_statements;" 2>/dev/null | grep -q 1; then
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            'Average query time: ' || round(avg(mean_time), 2) || 'ms' as metric,
            'Total queries: ' || sum(calls) as queries,
            'Slow queries (>100ms): ' || count(*) as slow_queries
        FROM pg_stat_statements 
        WHERE calls > 100;
    " >> "$REPORT_FILE"
fi

# Cache hit ratio
cache_hit=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT round(
        100 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2
    ) FROM pg_stat_database 
    WHERE datname = '$DB_NAME';" 2>/dev/null | tr -d ' ')

cat >> "$REPORT_FILE" << EOF

2. Cache Performance
-------------------
Cache Hit Ratio: ${cache_hit}%
Target: >95% (Good), >99% (Excellent)

EOF

# 2. Storage Analysis
log_message "Analyzing storage usage..."

cat >> "$REPORT_FILE" << EOF
STORAGE ANALYSIS
===============

EOF

# Database size
db_size=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | tr -d ' ')

# Table sizes
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        'Table sizes:' as section,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF

Total Database Size: $db_size

EOF

# 3. Growth Analysis
log_message "Analyzing growth patterns..."

cat >> "$REPORT_FILE" << EOF
GROWTH ANALYSIS
==============

Monthly Growth Patterns:
EOF

# Check growth over the month
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        'Users table growth: ' || 
        (SELECT count(*) FROM users WHERE created_at >= date_trunc('month', CURRENT_DATE)) ||
        ' new users this month' as growth;
    
    SELECT 
        'Tenants table growth: ' || 
        (SELECT count(*) FROM tenants WHERE created_at >= date_trunc('month', CURRENT_DATE)) ||
        ' new tenants this month' as growth;
    
    SELECT 
        'Audit logs: ' || 
        (SELECT count(*) FROM audit_logs WHERE created_at >= date_trunc('month', CURRENT_DATE)) ||
        ' new log entries this month' as growth;
" >> "$REPORT_FILE"

# 4. Index Usage
log_message "Analyzing index usage..."

cat >> "$REPORT_FILE" << EOF

INDEX ANALYSIS
=============

Unused Indexes:
EOF

# Find unused indexes
unused_count=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT count(*) FROM pg_stat_user_indexes 
    WHERE idx_scan = 0 AND schemaname = 'public';" 2>/dev/null | tr -d ' ')

cat >> "$REPORT_FILE" << EOF
Count of unused indexes: $unused_count

Most Used Indexes:
EOF

psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        indexname,
        idx_scan as usage_count,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC 
    LIMIT 5;
" >> "$REPORT_FILE"

# 5. Connection Analysis
log_message "Analyzing connection patterns..."

cat >> "$REPORT_FILE" << EOF

CONNECTION ANALYSIS
==================

Connection Statistics:
EOF

# Connection statistics
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        'Max connections: ' || setting as max_connections,
        'Current connections: ' || (SELECT count(*) FROM pg_stat_activity) as current_connections,
        'Idle connections: ' || (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections
    FROM pg_settings 
    WHERE name = 'max_connections';
" >> "$REPORT_FILE"

# 6. Security Review
log_message "Performing security review..."

cat >> "$REPORT_FILE" << EOF

SECURITY REVIEW
==============

EOF

# Check for security issues
psql -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT 
        'Roles defined: ' || count(*) as roles_count
    FROM pg_roles 
    WHERE rolname NOT LIKE 'pg_%';
    
    SELECT 
        'Tables with RLS enabled: ' || count(*) as rls_tables
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relrowsecurity = true AND n.nspname = 'public';
" >> "$REPORT_FILE"

# 7. Recommendations
log_message "Generating recommendations..."

cat >> "$REPORT_FILE" << EOF

RECOMMENDATIONS
==============

Based on this analysis, here are the key recommendations:

1. Performance Optimization:
   - Review slow queries and optimize them
   - Consider adding indexes for frequently queried columns
   - Monitor cache hit ratio (currently ${cache_hit}%)

2. Storage Management:
   - Monitor database growth rate
   - Archive old audit logs if needed
   - Consider partitioning for large tables

3. Index Optimization:
   - Review unused indexes for removal ($unused_count found)
   - Add indexes for foreign keys without them
   - Monitor index bloat

4. Security:
   - Regularly review user permissions
   - Monitor for suspicious connection patterns
   - Keep PostgreSQL updated

5. Monitoring:
   - Set up automated alerts for performance degradation
   - Monitor connection pool usage
   - Track query performance trends

EOF

# 8. Action Items
log_message "Creating action items...")

cat >> "$REPORT_FILE" << EOF

ACTION ITEMS
===========

Immediate Actions (Next 30 days):
□ Review and optimize slow queries
□ Remove unused indexes
□ Set up performance monitoring alerts
□ Review connection pool settings

Medium-term Actions (Next 90 days):
□ Implement query result caching
□ Consider read replicas for scaling
□ Optimize table schemas if needed
□ Plan for database growth

Long-term Actions (Next 6 months):
□ Evaluate partitioning strategies
□ Consider database sharding if needed
□ Plan for high availability setup
□ Review disaster recovery procedures

EOF

log_message "Monthly review completed. Report saved to $REPORT_FILE"

# Send report
mail -s "HRM SaaS Database Monthly Review - $(date +%Y-%m)" admin@yourdomain.com < "$REPORT_FILE"

# Clean up old reports
find /tmp -name "db-monthly-report-*.txt" -mtime +90 -delete

exit 0
```

## 🚨 Emergency Database Procedures

### Database Corruption Recovery

#### Immediate Response
```bash
# Database corruption emergency response
#!/bin/bash

echo "=== Database Corruption Emergency Response ==="

# 1. Immediate assessment
echo "Step 1: Assess corruption extent"
psql -U postgres -c "SELECT version();"
psql -U postgres -d hrm_saas -c "SELECT COUNT(*) FROM tenants;"
psql -U postgres -d hrm_saas -c "SELECT COUNT(*) FROM users;"

# 2. Check for corruption
echo "Step 2: Check for corruption"
psql -U postgres -d hrm_saas -c "REINDEX DATABASE hrm_saas VERBOSE;"

# 3. Backup current state
echo "Step 3: Create emergency backup"
pg_dump -U postgres hrm_saas > /tmp/emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Analyze corruption
echo "Step 4: Analyze corruption"
psql -U postgres -d hrm_saas -c "
    SELECT 
        schemaname, 
        tablename, 
        n_tup_ins, 
        n_tup_upd, 
        n_tup_del,
        n_live_tup,
        n_dead_tup
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
    ORDER BY n_dead_tup DESC;
"

# 5. Attempt repair
echo "Step 5: Attempt database repair"
psql -U postgres -d hrm_saas -c "VACUUM FULL ANALYZE;"

# 6. If repair fails, restore from backup
echo "Step 6: Restore from backup if needed"
read -p "Continue with restore? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    dropdb -U postgres hrm_saas
    createdb -U postgres hrm_saas
    gunzip -c /home/hrm-saas/backups/hrm_saas_backup_LATEST.sql.gz | \
    psql -U postgres -d hrm_saas
fi
```

### Connection Pool Exhaustion

#### Immediate Response
```bash
# Connection pool exhaustion emergency
#!/bin/bash

echo "=== Connection Pool Exhaustion Response ==="

# 1. Check current connections
echo "Step 1: Check connections"
current_connections=$(psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity;" | tr -d ' ')
max_connections=$(psql -U postgres -t -c "SHOW max_connections;" | tr -d ' ')

echo "Current connections: $current_connections/$max_connections"

# 2. Identify blocking queries
echo "Step 2: Identify blocking queries"
psql -U postgres -c "
    SELECT 
        pid,
        now() - pg_stat_activity.query_start AS duration,
        query,
        state
    FROM pg_stat_activity
    WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
    ORDER BY duration DESC;
"

# 3. Terminate long-running queries
echo "Step 3: Terminate long-running queries"
read -p "Terminate queries running > 5 minutes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    psql -U postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE (now() - query_start) > interval '5 minutes'
        AND state = 'active';
    "
fi

# 4. Increase connection limit temporarily
echo "Step 4: Increase connection limit temporarily"
read -p "Increase max_connections by 25%? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    new_limit=$((max_connections * 125 / 100))
    psql -U postgres -c "ALTER SYSTEM SET max_connections = $new_limit;"
    psql -U postgres -c "SELECT pg_reload_conf();"
fi

# 5. Restart application if needed
echo "Step 5: Restart application if needed"
pm2 restart hrm-saas-backend
```

## 🔄 Backup and Recovery

### Point-in-Time Recovery

#### Setup WAL Archiving
```bash
# Enable WAL archiving for point-in-time recovery
echo "=== Setting up WAL Archiving ==="

# 1. Configure WAL archiving
sudo -u postgres psql -c "
    ALTER SYSTEM SET wal_level = replica;
    ALTER SYSTEM SET archive_mode = on;
    ALTER SYSTEM SET archive_command = 'cp %p /var/lib/postgresql/archive/%f';
    ALTER SYSTEM SET max_wal_senders = 3;
    ALTER SYSTEM SET checkpoint_segments = 8;
    ALTER SYSTEM SET wal_keep_segments = 32;
    SELECT pg_reload_conf();
"

# 2. Create archive directory
sudo mkdir -p /var/lib/postgresql/archive
sudo chown postgres:postgres /var/lib/postgresql/archive
sudo chmod 700 /var/lib/postgresql/archive

# 3. Restart PostgreSQL
sudo systemctl restart postgresql

echo "WAL archiving configured for point-in-time recovery"
```

#### Point-in-Time Recovery Procedure
```bash
# Point-in-time recovery procedure
echo "=== Point-in-Time Recovery Procedure ==="

# 1. Stop application
pm2 stop hrm-saas-backend

# 2. Identify recovery point
echo "Step 1: Identify recovery target time"
read -p "Enter recovery target time (YYYY-MM-DD HH:MM:SS): " recovery_time

# 3. Restore base backup
echo "Step 2: Restore base backup"
dropdb -U postgres hrm_saas
createdb -U postgres hrm_saas
gunzip -c /home/hrm-saas/backups/hrm_saas_backup_LATEST.sql.gz | \
psql -U postgres -d hrm_saas

# 4. Configure recovery
echo "Step 3: Configure recovery settings"
sudo -u postgres psql << EOF
ALTER SYSTEM SET restore_command = 'cp /var/lib/postgresql/archive/%f %p';
ALTER SYSTEM SET recovery_target_time = '$recovery_time';
SELECT pg_reload_conf();
EOF

# 5. Start recovery
echo "Step 4: Start PostgreSQL in recovery mode"
sudo systemctl restart postgresql

# 6. Verify recovery
echo "Step 5: Verify recovery"
psql -U postgres -d hrm_saas -c "SELECT now() as recovery_time;"
psql -U postgres -d hrm_saas -c "SELECT COUNT(*) FROM tenants;"

# 7. Start application
pm2 start hrm-saas-backend

echo "Point-in-time recovery completed"
```

## 📊 Database Monitoring

### Custom Monitoring Views

#### Performance Monitoring View
```sql
-- Create performance monitoring view
CREATE OR REPLACE VIEW db_performance AS
SELECT 
    'connections' as metric,
    count(*)::text as current_value,
    setting as max_value,
    round(100.0 * count(*) / setting, 2)::text as usage_percent
FROM pg_stat_activity, pg_settings 
WHERE pg_settings.name = 'max_connections'
GROUP BY setting

UNION ALL

SELECT 
    'cache_hit_ratio' as metric,
    round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2)::text as current_value,
    '100.00' as max_value,
    round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2)::text as usage_percent
FROM pg_stat_database 
WHERE datname = current_database()

UNION ALL

SELECT 
    'database_size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as current_value,
    'N/A' as max_value,
    'N/A' as usage_percent;
```

#### Index Monitoring View
```sql
-- Create index monitoring view
CREATE OR REPLACE VIEW index_monitoring AS
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'Never used'
        WHEN idx_tup_read = 0 THEN 'No rows read'
        ELSE round(idx_tup_fetch::numeric / idx_tup_read * 100, 2)::text || '%' 
    END as efficiency,
    CASE 
        WHEN idx_scan = 0 THEN 'Consider dropping'
        WHEN idx_tup_read = 0 THEN 'Inefficient'
        WHEN round(idx_tup_fetch::numeric / idx_tup_read * 100, 2) < 50 THEN 'Low efficiency'
        ELSE 'Good'
    END as recommendation
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## ✅ Database Maintenance Checklist

### Daily Tasks
- [ ] **Run health check script**
- [ ] **Monitor connection usage**
- [ ] **Check query performance**
- [ ] **Review error logs**
- [ ] **Monitor disk space**
- [ ] **Check backup completion**

### Weekly Tasks
- [ ] **Run VACUUM and ANALYZE**
- [ ] **Update statistics**
- [ ] **Analyze index usage**
- [ ] **Review slow queries**
- [ ] **Check for locks**
- [ ] **Monitor autovacuum status**

### Monthly Tasks
- [ ] **Comprehensive performance review**
- [ ] **Storage usage analysis**
- [ ] **Growth pattern analysis**
- [ ] **Security review**
- [ ] **Configuration optimization**
- [ ] **Generate monthly report**

### Quarterly Tasks
- [ ] **Deep performance analysis**
- [ ] **Architecture review**
- [ ] **Disaster recovery testing**
- [ ] **Capacity planning**
- [ ] **Security audit**
- [ ] **Update maintenance procedures**

---

**💡 Remember**: Database maintenance is proactive. Regular maintenance prevents issues before they become problems. Monitor trends and plan for growth to avoid emergency situations.