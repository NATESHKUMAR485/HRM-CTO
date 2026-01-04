# Backup and Restore Runbook

## Overview

This runbook provides comprehensive procedures for backup and restoration of the HRM SaaS platform. It covers automated backup procedures, manual backup processes, restoration testing, and disaster recovery scenarios.

**Backup Frequency:** Daily database, weekly files  
**Retention Policy:** 30 days for daily, 12 months for weekly  
**Testing Frequency:** Monthly restoration tests  
**Recovery Time Objective (RTO):** < 4 hours  
**Recovery Point Objective (RPO):** < 24 hours  

## 💾 Backup Strategy

### Multi-Layer Backup Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                     Data Classification                         │
├─────────────────────────────────────────────────────────────────┤
│ Tier 1: Critical (Daily backup, 30-day retention)              │
│ - Production database (PostgreSQL)                             │
│ - User-generated content                                        │
│ - Configuration files                                           │
│ - SSL certificates                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Backup Methods                              │
├─────────────────────────────────────────────────────────────────┤
│ • Automated Daily Backups (Database)                           │
│ • Weekly Full Backups (Database + Files)                       │
│ • Real-time Replication (Production ready)                     │
│ • Point-in-time Recovery (Last 7 days)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                     Storage Locations                           │
├─────────────────────────────────────────────────────────────────┤
│ • Primary: Local server storage                                │
│ • Secondary: Cloud storage (S3, Spaces)                        │
│ • Tertiary: Off-site backup (if required)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Backup Types and Schedules

#### Daily Backups (Automated)
```bash
# Database backups
- Frequency: Daily at 2:00 AM
- Type: Full database dump
- Retention: 30 days
- Storage: Local + Cloud
- Compression: gzip
- Encryption: AES-256

# Configuration backups
- Frequency: Daily after database backup
- Type: Configuration files + environment variables
- Retention: 30 days
- Storage: Local + Cloud
```

#### Weekly Backups (Comprehensive)
```bash
# Full system backup
- Frequency: Sunday at 3:00 AM
- Type: Database + Application files + Configurations
- Retention: 12 months
- Storage: Cloud storage primarily
- Testing: Monthly restoration test
```

#### Real-time Replication (Production)
```bash
# PostgreSQL streaming replication
- Type: Continuous WAL shipping
- Latency: < 5 seconds
- Failover: Automated with monitoring
- Storage: Dedicated replica server
```

## 🛠️ Automated Backup Procedures

### Database Backup Script

Create `/scripts/backup.sh`:

```bash
#!/bin/bash

# HRM SaaS Database Backup Script
# Purpose: Automated daily database backups
# Schedule: Daily at 2:00 AM via cron

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/home/hrm-saas/backups"
DB_NAME="hrm_saas"
DB_USER="hrm_user"
DB_HOST="localhost"
DB_PORT="5432"
RETENTION_DAYS=30
CLOUD_STORAGE_BUCKET="hrm-saas-backups"
LOG_FILE="/var/log/hrm-saas/backup.log"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/hrm_saas_backup_$TIMESTAMP.sql"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Start backup process
log_message "Starting database backup process"

# Create database backup
log_message "Creating database backup: $BACKUP_FILE"

if pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" \
    --verbose --clean --if-exists --create --no-owner --no-privileges \
    > "$BACKUP_FILE"; then
    log_message "Database backup created successfully"
else
    log_message "ERROR: Database backup failed"
    exit 1
fi

# Compress backup
log_message "Compressing backup file"
if gzip "$BACKUP_FILE"; then
    log_message "Backup compressed successfully"
else
    log_message "ERROR: Backup compression failed"
    exit 1
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
log_message "Backup file size: $BACKUP_SIZE"

# Verify backup integrity
log_message "Verifying backup integrity"
if gunzip -t "$BACKUP_FILE_GZ"; then
    log_message "Backup integrity verified"
else
    log_message "ERROR: Backup integrity check failed"
    exit 1
fi

# Upload to cloud storage (optional)
if command -v aws &> /dev/null; then
    log_message "Uploading backup to cloud storage"
    if aws s3 cp "$BACKUP_FILE_GZ" "s3://$CLOUD_STORAGE_BUCKET/database/" --server-side-encryption AES256; then
        log_message "Backup uploaded to cloud storage successfully"
    else
        log_message "WARNING: Cloud upload failed, backup available locally"
    fi
fi

# Clean up old backups (local)
log_message "Cleaning up old backups (older than $RETENTION_DAYS days)"
find "$BACKUP_DIR" -name "hrm_saas_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
log_message "Old backups cleaned up"

# Backup statistics
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/hrm_saas_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_message "Backup process completed successfully"
log_message "Total backups: $TOTAL_BACKUPS, Total size: $TOTAL_SIZE"

# Optional: Send backup summary email
# echo "Database backup completed successfully
# Date: $(date)
# File: $BACKUP_FILE_GZ
# Size: $BACKUP_SIZE
# Total backups: $TOTAL_BACKUPS
# Total storage: $TOTAL_SIZE
# " | mail -s "HRM SaaS Database Backup - $(date +%Y-%m-%d)" admin@yourdomain.com

exit 0
```

### File Backup Script

Create `/scripts/file-backup.sh`:

```bash
#!/bin/bash

# HRM SaaS File Backup Script
# Purpose: Backup application files and configurations
# Schedule: Weekly on Sunday at 3:00 AM via cron

set -e

# Configuration
BACKUP_DIR="/home/hrm-saas/backups"
WEB_DIR="/var/www/hrm-saas"
APP_DIR="/home/hrm-saas/apps"
CONFIG_DIR="/home/hrm-saas/config"
SSL_DIR="/etc/letsencrypt"
RETENTION_DAYS=365  # 1 year for file backups
CLOUD_STORAGE_BUCKET="hrm-saas-backups"
LOG_FILE="/var/log/hrm-saas/file-backup.log"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/hrm_saas_files_backup_$TIMESTAMP.tar.gz"
LOG_FILE="/var/log/hrm-saas/file-backup.log"

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Start backup process
log_message "Starting file backup process"

# Create comprehensive file backup
log_message "Creating file backup: $BACKUP_FILE"

tar -czf "$BACKUP_FILE" \
    -C /var/www hrm-saas \
    -C /home/hrm-saas/apps hrm-saas \
    -C /home/hrm-saas config \
    -C /etc/letsencrypt live \
    --exclude='*.log' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.tmp' \
    --exclude='*.cache' \
    2>/dev/null || {
        log_message "WARNING: Some files could not be backed up"
    }

if [ -f "$BACKUP_FILE" ]; then
    log_message "File backup created successfully"
else
    log_message "ERROR: File backup failed"
    exit 1
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_message "Backup file size: $BACKUP_SIZE"

# Verify backup integrity
log_message "Verifying backup integrity"
if tar -tzf "$BACKUP_FILE" >/dev/null 2>&1; then
    log_message "Backup integrity verified"
else
    log_message "ERROR: Backup integrity check failed"
    exit 1
fi

# Upload to cloud storage
if command -v aws &> /dev/null; then
    log_message "Uploading backup to cloud storage"
    if aws s3 cp "$BACKUP_FILE" "s3://$CLOUD_STORAGE_BUCKET/files/" --server-side-encryption AES256; then
        log_message "Backup uploaded to cloud storage successfully"
    else
        log_message "WARNING: Cloud upload failed, backup available locally"
    fi
fi

# Clean up old backups
log_message "Cleaning up old backups (older than $RETENTION_DAYS days)"
find "$BACKUP_DIR" -name "hrm_saas_files_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
log_message "Old file backups cleaned up"

# Backup statistics
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/hrm_saas_files_backup_*.tar.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_message "File backup process completed successfully"
log_message "Total file backups: $TOTAL_BACKUPS, Total size: $TOTAL_SIZE"

exit 0
```

### Configuration Backup Script

Create `/scripts/config-backup.sh`:

```bash
#!/bin/bash

# Configuration Backup Script
# Purpose: Backup all configuration files
# Schedule: Daily after database backup

set -e

# Configuration
BACKUP_DIR="/home/hrm-saas/backups"
CONFIG_DIR="/home/hrm-saas/config"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/hrm-saas/config-backup.log"

# Create config backup directory
mkdir -p "$CONFIG_DIR/$TIMESTAMP"

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

log_message "Starting configuration backup"

# Backup environment files
cp /home/hrm-saas/apps/hrm-saas/backend/.env "$CONFIG_DIR/$TIMESTAMP/" 2>/dev/null || log_message "No backend .env file found"

# Backup NGINX configuration
cp /etc/nginx/sites-available/hrm-saas "$CONFIG_DIR/$TIMESTAMP/" 2>/dev/null || log_message "No NGINX config found"

# Backup PM2 configuration
cp /home/hrm-saas/apps/hrm-saas/backend/ecosystem.config.js "$CONFIG_DIR/$TIMESTAMP/" 2>/dev/null || log_message "No PM2 config found"

# Backup database configuration
if command -v psql &> /dev/null; then
    psql -U postgres -c "SELECT current_setting('all')" > "$CONFIG_DIR/$TIMESTAMP/postgres_config.txt" 2>/dev/null || log_message "Could not backup PostgreSQL config"
fi

# Backup SSL certificates (if using own server)
if [ -d "/etc/letsencrypt/live" ]; then
    cp -r /etc/letsencrypt/live "$CONFIG_DIR/$TIMESTAMP/ssl_certs" 2>/dev/null || log_message "No SSL certificates found"
fi

# Create archive
tar -czf "$CONFIG_DIR/hrm_saas_config_backup_$TIMESTAMP.tar.gz" -C "$CONFIG_DIR" "$TIMESTAMP"
rm -rf "$CONFIG_DIR/$TIMESTAMP"

log_message "Configuration backup completed: hrm_saas_config_backup_$TIMESTAMP.tar.gz"
```

### Backup Schedule Configuration

Create cron jobs:

```bash
# Add to crontab: crontab -e

# Daily database backup at 2:00 AM
0 2 * * * /scripts/backup.sh >> /var/log/hrm-saas/backup-cron.log 2>&1

# Daily configuration backup at 2:30 AM
30 2 * * * /scripts/config-backup.sh >> /var/log/hrm-saas/config-backup-cron.log 2>&1

# Weekly file backup on Sunday at 3:00 AM
0 3 * * 0 /scripts/file-backup.sh >> /var/log/hrm-saas/file-backup-cron.log 2>&1

# Monthly backup verification (first day of month at 4:00 AM)
0 4 1 * * /scripts/backup-verification.sh >> /var/log/hrm-saas/backup-verification.log 2>&1

# Clean up old log files weekly
0 5 * * 0 find /var/log/hrm-saas/ -name "*.log" -mtime +30 -delete
```

## 🔍 Backup Verification

### Backup Verification Script

Create `/scripts/backup-verification.sh`:

```bash
#!/bin/bash

# Backup Verification Script
# Purpose: Verify backup integrity and test restoration
# Schedule: Monthly on first day of month

set -e

# Configuration
BACKUP_DIR="/home/hrm-saas/backups"
TEST_DB_NAME="hrm_saas_test_restore"
LOG_FILE="/var/log/hrm-saas/backup-verification.log"

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

log_message "Starting backup verification process"

# Check for recent backups
RECENT_BACKUP=$(ls -t "$BACKUP_DIR"/hrm_saas_backup_*.sql.gz | head -1)

if [ -z "$RECENT_BACKUP" ]; then
    log_message "ERROR: No recent backups found"
    exit 1
fi

log_message "Testing backup: $(basename "$RECENT_BACKUP")"

# Verify backup file integrity
log_message "Verifying backup file integrity"
if gunzip -t "$RECENT_BACKUP"; then
    log_message "✓ Backup file integrity check passed"
else
    log_message "ERROR: Backup file integrity check failed"
    exit 1
fi

# Create test database
log_message "Creating test database: $TEST_DB_NAME"
dropdb -U postgres "$TEST_DB_NAME" 2>/dev/null || true
createdb -U postgres "$TEST_DB_NAME"

# Test restoration
log_message "Testing backup restoration"
if gunzip -c "$RECENT_BACKUP" | psql -U postgres -d "$TEST_DB_NAME" >/dev/null 2>&1; then
    log_message "✓ Backup restoration test passed"
else
    log_message "ERROR: Backup restoration test failed"
    dropdb -U postgres "$TEST_DB_NAME"
    exit 1
fi

# Verify restored data
log_message "Verifying restored data"
TABLES_COUNT=$(psql -U postgres -d "$TEST_DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

if [ "$TABLES_COUNT" -gt 0 ]; then
    log_message "✓ Data verification passed - $TABLES_COUNT tables restored"
    
    # Check critical tables
    TENANTS_COUNT=$(psql -U postgres -d "$TEST_DB_NAME" -t -c "SELECT count(*) FROM tenants;" 2>/dev/null | tr -d ' ')
    USERS_COUNT=$(psql -U postgres -d "$TEST_DB_NAME" -t -c "SELECT count(*) FROM users;" 2>/dev/null | tr -d ' ')
    
    log_message "Critical data check - Tenants: $TENANTS_COUNT, Users: $USERS_COUNT"
    
    if [ "$TENANTS_COUNT" -ge 0 ] && [ "$USERS_COUNT" -ge 0 ]; then
        log_message "✓ Critical data verification passed"
    else
        log_message "WARNING: Critical data count seems incorrect"
    fi
else
    log_message "ERROR: No tables found in restored database"
    dropdb -U postgres "$TEST_DB_NAME"
    exit 1
fi

# Clean up test database
log_message "Cleaning up test database"
dropdb -U postgres "$TEST_DB_NAME"

# Check backup sizes and counts
log_message "Backup inventory check"
DATABASE_BACKUPS=$(ls -1 "$BACKUP_DIR"/hrm_saas_backup_*.sql.gz 2>/dev/null | wc -l)
FILE_BACKUPS=$(ls -1 "$BACKUP_DIR"/hrm_saas_files_backup_*.tar.gz 2>/dev/null | wc -l)
CONFIG_BACKUPS=$(ls -1 "$BACKUP_DIR"/hrm_saas_config_backup_*.tar.gz 2>/dev/null | wc -l)

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_message "Backup inventory:"
log_message "- Database backups: $DATABASE_BACKUPS"
log_message "- File backups: $FILE_BACKUPS"
log_message "- Configuration backups: $CONFIG_BACKUPS"
log_message "- Total storage: $TOTAL_SIZE"

# Check for old backups
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "*.gz" -o -name "*.tar.gz" -mtime +30 | wc -l)
if [ "$OLD_BACKUPS" -gt 0 ]; then
    log_message "WARNING: Found $OLD_BACKUPS backups older than 30 days"
fi

log_message "Backup verification completed successfully"

# Send verification report
echo "Backup Verification Report - $(date +%Y-%m-%d)

Backup tested: $(basename "$RECENT_BACKUP")
Integrity check: PASSED
Restoration test: PASSED
Data verification: PASSED
Database tables: $TABLES_COUNT
Tenants: $TENANTS_COUNT
Users: $USERS_COUNT

Backup inventory:
- Database backups: $DATABASE_BACKUPS
- File backups: $FILE_BACKUPS
- Configuration backups: $CONFIG_BACKUPS
- Total storage: $TOTAL_SIZE

Status: All verification tests passed
" | mail -s "HRM SaaS Backup Verification Report - $(date +%Y-%m-%d)" admin@yourdomain.com

exit 0
```

## 🔄 Restoration Procedures

### Database Restoration

#### Full Database Restore
```bash
# Complete database restoration procedure
# Use when production database is corrupted or lost

# Step 1: Stop application services
pm2 stop hrm-saas-backend

# Step 2: Drop and recreate database
dropdb -U postgres hrm_saas
createdb -U postgres hrm_saas

# Step 3: Restore from latest backup
gunzip -c /home/hrm-saas/backups/hrm_saas_backup_YYYYMMDD_HHMMSS.sql.gz | \
psql -U postgres -d hrm_saas

# Step 4: Verify restoration
psql -U postgres -d hrm_saas -c "SELECT count(*) FROM tenants;"
psql -U postgres -d hrm_saas -c "SELECT count(*) FROM users;"

# Step 5: Start application services
pm2 start hrm-saas-backend

# Step 6: Verify application functionality
curl -f https://yourdomain.com/health
```

#### Point-in-Time Recovery
```bash
# Restore to specific point in time
# Use when you need to recover to before a specific incident

# Step 1: Identify backup point
# Find backup created before the incident time

# Step 2: Restore base backup
gunzip -c /home/hrm-saas/backups/hrm_saas_backup_YYYYMMDD_HHMMSS.sql.gz | \
psql -U postgres -d hrm_saas

# Step 3: Apply WAL files for point-in-time recovery
# (This requires WAL archiving to be enabled)

# Step 4: Verify restoration
psql -U postgres -d hrm_saas -c "SELECT now() as current_time;"

# Step 5: Test application
curl -f https://yourdomain.com/api/auth/test-db
```

#### Selective Table Restore
```bash
# Restore specific tables only
# Use when only specific data is corrupted

# Step 1: Export specific tables from backup
gunzip -c /home/hrm-saas/backups/hrm_saas_backup_YYYYMMDD_HHMMSS.sql.gz | \
psql -U postgres -d hrm_saas -c "\copy table_name FROM stdin;"

# Or use pg_restore for selective restoration
pg_restore -d hrm_saas -t table_name /path/to/backup.sql
```

### File Restoration

#### Application Files Restore
```bash
# Restore application files from backup
# Use when application files are corrupted

# Step 1: Stop services
pm2 stop hrm-saas-backend
sudo systemctl stop nginx

# Step 2: Backup current files (for reference)
sudo mv /var/www/hrm-saas /var/www/hrm-saas.backup.$(date +%Y%m%d_%H%M%S)

# Step 3: Restore files from backup
mkdir -p /var/www/hrm-saas
tar -xzf /home/hrm-saas/backups/hrm_saas_files_backup_YYYYMMDD_HHMMSS.tar.gz -C /

# Step 4: Restore backend application
cp -r /home/hrm-saas/apps/hrm-saas /home/hrm-saas/apps/hrm-saas.new
rm -rf /home/hrm-saas/apps/hrm-saas
mv /home/hrm-saas/apps/hrm-saas.new /home/hrm-saas/apps/hrm-saas

# Step 5: Restore configurations
cp /home/hrm-saas/config/hrm_saas_config_backup_YYYYMMDD_HHMMSS.tar.gz .
tar -xzf hrm_saas_config_backup_YYYYMMDD_HHMMSS.tar.gz
# Restore individual config files as needed

# Step 6: Start services
sudo systemctl start nginx
pm2 start hrm-saas-backend

# Step 7: Verify functionality
curl -f https://yourdomain.com
curl -f https://yourdomain.com/health
```

#### Configuration Restore
```bash
# Restore specific configuration files
# Use when configuration files are corrupted

# Step 1: Restore environment variables
cp /home/hrm-saas/config/YYYYMMDD_HHMMSS/.env /home/hrm-saas/apps/hrm-saas/backend/

# Step 2: Restore NGINX configuration
cp /home/hrm-saas/config/YYYYMMDD_HHMMSS/hrm-saas /etc/nginx/sites-available/
sudo nginx -t
sudo systemctl reload nginx

# Step 3: Restore PM2 configuration
cp /home/hrm-saas/config/YYYYMMDD_HHMMSS/ecosystem.config.js /home/hrm-saas/apps/hrm-saas/backend/
pm2 reload hrm-saas-backend

# Step 4: Restart services
pm2 restart hrm-saas-backend
sudo systemctl restart nginx
```

### Emergency Restoration

#### Disaster Recovery Procedure
```bash
# Complete system restoration from backups
# Use when entire server is compromised

# Phase 1: System Recovery
# 1. Provision new server
# 2. Install base system (OS, dependencies)
# 3. Set up monitoring and logging

# Phase 2: Application Recovery
# 1. Restore application files
# 2. Restore database
# 3. Restore configurations
# 4. Set up SSL certificates
# 5. Configure DNS (update to new server)

# Phase 3: Verification
# 1. Test all functionality
# 2. Verify data integrity
# 3. Test backup procedures
# 4. Monitor for issues

# Estimated RTO: 2-4 hours
# Estimated RPO: < 24 hours
```

#### Rollback Procedure
```bash
# Quick rollback to previous state
# Use when current deployment has issues

# Step 1: Identify previous good state
# Use backup created before current deployment

# Step 2: Stop current services
pm2 stop hrm-saas-backend

# Step 3: Restore from previous backup
gunzip -c /home/hrm-saas/backups/hrm_saas_backup_PREVIOUS.sql.gz | \
psql -U postgres -d hrm_saas

# Step 4: Restore application files
tar -xzf /home/hrm-saas/backups/hrm_saas_files_backup_PREVIOUS.tar.gz -C /

# Step 5: Start services
pm2 start hrm-saas-backend

# Step 6: Verify rollback
curl -f https://yourdomain.com/health

# Estimated RTO: 30-60 minutes
```

## 📊 Backup Monitoring

### Backup Health Checks

#### Daily Backup Verification
```bash
# Check backup completion and size
#!/bin/bash

BACKUP_DIR="/home/hrm-saas/backups"
LOG_FILE="/var/log/hrm-saas/backup-health.log"

# Check for today's backup
TODAY_BACKUP=$(ls -t "$BACKUP_DIR"/hrm_saas_backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$TODAY_BACKUP" ]; then
    echo "$(date): ERROR - No backup found for today" >> "$LOG_FILE"
    # Send alert
    exit 1
fi

# Check backup size (should be > 100KB for non-empty database)
BACKUP_SIZE=$(stat -c%s "$TODAY_BACKUP")
if [ "$BACKUP_SIZE" -lt 100000 ]; then
    echo "$(date): WARNING - Backup size unusually small: $BACKUP_SIZE bytes" >> "$LOG_FILE"
    # Send alert
fi

# Check backup age (should be created today)
BACKUP_DATE=$(stat -c %Y "$TODAY_BACKUP")
TODAY_EPOCH=$(date +%s)
AGE_HOURS=$(( (TODAY_EPOCH - BACKUP_DATE) / 3600 ))

if [ "$AGE_HOURS" -gt 25 ]; then
    echo "$(date): WARNING - Backup is older than 25 hours" >> "$LOG_FILE"
    # Send alert
fi

echo "$(date): Backup check passed - Size: $BACKUP_SIZE bytes, Age: $AGE_HOURS hours" >> "$LOG_FILE"
```

#### Weekly Backup Report
```bash
# Generate weekly backup report
#!/bin/bash

BACKUP_DIR="/home/hrm-saas/backups"
REPORT_FILE="/tmp/backup-report-$(date +%Y%W).txt"

cat > "$REPORT_FILE" << EOF
HRM SaaS Backup Report - Week $(date +%Y-W%V)

Database Backups:
$(ls -lh "$BACKUP_DIR"/hrm_saas_backup_*.sql.gz 2>/dev/null | tail -7 | awk '{print $9, $5}')

File Backups:
$(ls -lh "$BACKUP_DIR"/hrm_saas_files_backup_*.tar.gz 2>/dev/null | tail -4 | awk '{print $9, $5}')

Configuration Backups:
$(ls -lh "$BACKUP_DIR"/hrm_saas_config_backup_*.tar.gz 2>/dev/null | tail -7 | awk '{print $9, $5}')

Total Storage Used:
$(du -sh "$BACKUP_DIR")

Recent Backup Health:
$(find "$BACKUP_DIR" -name "*.gz" -o -name "*.tar.gz" | while read file; do
    if gunzip -t "$file" 2>/dev/null; then
        echo "✓ $(basename "$file") - Integrity OK"
    else
        echo "✗ $(basename "$file") - Integrity FAILED"
    fi
done)

Backup Retention Status:
- Database backups (>30 days): $(find "$BACKUP_DIR" -name "hrm_saas_backup_*.sql.gz" -mtime +30 | wc -l)
- File backups (>365 days): $(find "$BACKUP_DIR" -name "hrm_saas_files_backup_*.tar.gz" -mtime +365 | wc -l)
- Config backups (>30 days): $(find "$BACKUP_DIR" -name "hrm_saas_config_backup_*.tar.gz" -mtime +30 | wc -l)

Recommendations:
$(if [ $(find "$BACKUP_DIR" -name "*.gz" -o -name "*.tar.gz" -mtime +30 | wc -l) -gt 0 ]; then
    echo "- Clean up old backups per retention policy"
else
    echo "- All backups within retention policy"
fi)

EOF

# Send report
mail -s "HRM SaaS Weekly Backup Report - $(date +%Y-W%V)" admin@yourdomain.com < "$REPORT_FILE"
```

### Alert Configuration

#### Backup Failure Alerts
```bash
# Set up monitoring alerts for backup failures

# Cron job to check backup status
*/30 * * * * /scripts/backup-health-check.sh

# Alert conditions:
# - No backup created in 25 hours
# - Backup size < 100KB
# - Backup integrity check failed
# - Restoration test failed
```

#### Backup Success Notifications
```bash
# Optional success notifications
# Add to backup scripts:

# Send success notification
echo "Backup completed successfully
Date: $(date)
File: $(basename "$BACKUP_FILE")
Size: $BACKUP_SIZE
" | mail -s "HRM SaaS Backup Success - $(date +%Y-%m-%d)" admin@yourdomain.com
```

## 🎯 Backup Best Practices

### Security

#### Encryption
```bash
# Encrypt backups with GPG
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc --quiet --no-greeting --batch --yes --no-secmem-warning -c "$BACKUP_FILE"

# Decrypt when needed
gpg --quiet --no-greeting --batch --yes --decrypt "$BACKUP_FILE.gpg"
```

#### Access Control
```bash
# Restrict backup directory permissions
chmod 700 /home/hrm-saas/backups
chown hrm-saas:hrm-saas /home/hrm-saas/backups

# Secure backup transfer
scp -P 2222 -i /path/to/key "$BACKUP_FILE" backup-server:/secure/backup/location/
```

### Testing

#### Monthly Restoration Tests
```bash
# Schedule: First Sunday of each month
0 4 1-7 * 0 /scripts/backup-verification.sh

# Test scenarios:
# - Full database restoration
# - File restoration
# - Configuration restoration
# - Point-in-time recovery
```

#### Performance Testing
```bash
# Test backup and restoration performance
# Monitor:
# - Backup creation time
# - Compression ratio
# - Restoration time
# - Storage utilization
```

### Documentation

#### Backup Documentation
```bash
# Maintain backup documentation
# Include:
# - Backup procedures
# - Restoration procedures
# - Contact information
# - Testing schedules
# - Recent test results
```

## ✅ Backup Checklist

### Daily Tasks
- [ ] **Verify backup completion**
- [ ] **Check backup file size**
- [ ] **Verify backup integrity**
- [ ] **Monitor backup logs**
- [ ] **Check cloud upload status**

### Weekly Tasks
- [ ] **Run file backup**
- [ ] **Generate backup report**
- [ ] **Review backup storage usage**
- [ ] **Test backup integrity**
- [ ] **Update backup procedures if needed**

### Monthly Tasks
- [ ] **Full restoration test**
- [ ] **Point-in-time recovery test**
- [ ] **Backup performance review**
- [ ] **Storage cleanup**
- [ ] **Update documentation**

### Quarterly Tasks
- [ ] **Complete disaster recovery test**
- [ ] **Review and update retention policies**
- [ ] **Test backup procedures with team**
- [ ] **Review and update emergency contacts**
- [ ] **Assess backup storage needs**

## 🚨 Emergency Procedures

### Immediate Backup Actions
```bash
# When system is compromised:
# 1. Create immediate backup if possible
# 2. Secure current backup files
# 3. Notify team immediately
# 4. Begin restoration procedures

# Emergency backup command
pg_dump -U postgres hrm_saas > /tmp/emergency_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Critical Data Priorities
```bash
# Priority order for restoration:
# 1. Database (most critical)
# 2. User files and uploads
# 3. Configuration files
# 4. Application code
# 5. SSL certificates
```

---

**💡 Remember**: Backup is only as good as your last restoration test. Regular testing ensures your backups work when you need them most. Document everything and keep multiple copies in different locations.