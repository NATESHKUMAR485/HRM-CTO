#!/bin/bash

# HRM SaaS Daily Backup Script
# Purpose: Automated daily database and file backups
# Schedule: Daily at 2:00 AM via cron
# Usage: ./backup.sh

set -e  # Exit on any error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/home/hrm-saas/backups}"
DB_NAME="${DB_NAME:-hrm_saas}"
DB_USER="${DB_USER:-hrm_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CLOUD_STORAGE_BUCKET="${CLOUD_STORAGE_BUCKET:-}"
LOG_FILE="${LOG_FILE:-/var/log/hrm-saas/backup.log}"
SMTP_HOST="${SMTP_HOST:-}"
SMTP_USER="${SMTP_USER:-}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"

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

# Send email notification
send_email() {
    local subject="$1"
    local body="$2"
    
    if [ -n "$SMTP_HOST" ] && [ -n "$SMTP_USER" ]; then
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Start backup process
log_message "Starting daily backup process"

# Create database backup
log_message "Creating database backup: $BACKUP_FILE"

if pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" \
    --verbose --clean --if-exists --create --no-owner --no-privileges \
    > "$BACKUP_FILE"; then
    log_message "Database backup created successfully"
else
    log_message "ERROR: Database backup failed"
    send_email "HRM SaaS Backup Failed" "Database backup failed at $(date)"
    exit 1
fi

# Compress backup
log_message "Compressing backup file"
if gzip "$BACKUP_FILE"; then
    log_message "Backup compressed successfully"
else
    log_message "ERROR: Backup compression failed"
    send_email "HRM SaaS Backup Failed" "Backup compression failed at $(date)"
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
    send_email "HRM SaaS Backup Failed" "Backup integrity check failed at $(date)"
    exit 1
fi

# Upload to cloud storage (if configured)
if [ -n "$CLOUD_STORAGE_BUCKET" ] && command -v aws &> /dev/null; then
    log_message "Uploading backup to cloud storage"
    if aws s3 cp "$BACKUP_FILE_GZ" "s3://$CLOUD_STORAGE_BUCKET/database/" --server-side-encryption AES256; then
        log_message "Backup uploaded to cloud storage successfully"
    else
        log_message "WARNING: Cloud upload failed, backup available locally"
    fi
elif [ -n "$CLOUD_STORAGE_BUCKET" ]; then
    log_message "WARNING: AWS CLI not found, skipping cloud upload"
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
if [ -n "$SMTP_HOST" ]; then
    send_email "HRM SaaS Daily Backup Completed" "Daily backup completed successfully
Date: $(date)
File: $BACKUP_FILE_GZ
Size: $BACKUP_SIZE
Total backups: $TOTAL_BACKUPS
Total storage: $TOTAL_SIZE
Status: SUCCESS"
fi

# Backup file information for other scripts
echo "$BACKUP_FILE_GZ" > "$BACKUP_DIR/latest_backup.txt"
echo "$TIMESTAMP" > "$BACKUP_DIR/latest_backup_timestamp.txt"

exit 0