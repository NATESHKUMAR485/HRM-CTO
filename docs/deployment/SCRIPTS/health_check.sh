#!/bin/bash

# HRM SaaS Health Check Script
# Purpose: Monitor system and application health
# Schedule: Every 5 minutes via cron
# Usage: ./health_check.sh

set -e  # Exit on any error

# Configuration
API_URL="${API_URL:-https://yourdomain.com}"
BACKEND_URL="${BACKEND_URL:-https://your-backend.onrender.com}"
FRONTEND_URL="${FRONTEND_URL:-https://your-frontend.vercel.app}"
LOG_FILE="${LOG_FILE:-/var/log/hrm-saas/health-check.log}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-hrm_user}"
DB_NAME="${DB_NAME:-hrm_saas}"

# Health check thresholds
RESPONSE_TIME_THRESHOLD=2000  # milliseconds
ERROR_RATE_THRESHOLD=5  # percentage

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Send alert
send_alert() {
    local severity="$1"
    local message="$2"
    
    log_message "ALERT [$severity]: $message"
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 HRM SaaS Health Alert [$severity]: $message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
    
    # Send email if SMTP is configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "HRM SaaS Health Alert [$severity]" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Health check function
check_endpoint() {
    local url="$1"
    local name="$2"
    local expected_code="${3:-200}"
    
    # Get response code and time
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    response_time=$(curl -w "%{time_total}" -o /dev/null -s "$url")
    response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if [ "$response_code" -eq "$expected_code" ]; then
        log_message "$name - OK (HTTP $response_code, ${response_time_ms}ms)"
        return 0
    else
        log_message "$name - FAILED (HTTP $response_code, ${response_time_ms}ms)"
        return 1
    fi
}

# Database health check
check_database() {
    log_message "Checking database connection..."
    
    if command -v psql &> /dev/null; then
        # Test database connection
        if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -c "SELECT 1;" >/dev/null 2>&1; then
            log_message "Database - OK (Connection successful)"
            
            # Check connection count
            connection_count=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
            max_connections=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
            
            if [ ! -z "$connection_count" ] && [ ! -z "$max_connections" ]; then
                connection_percent=$((connection_count * 100 / max_connections))
                log_message "Database connections: $connection_count/$max_connections ($connection_percent%)"
                
                if [ $connection_percent -gt 80 ]; then
                    send_alert "WARNING" "High database connection usage: $connection_percent%"
                fi
            fi
            
            return 0
        else
            log_message "Database - FAILED (Connection failed)"
            send_alert "CRITICAL" "Database connection failed"
            return 1
        fi
    else
        log_message "Database - SKIPPED (psql not available)"
        return 0
    fi
}

# PM2 process check
check_pm2_processes() {
    log_message "Checking PM2 processes..."
    
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "online"; then
            log_message "PM2 processes - OK (Running)"
            
            # Check for any stopped processes
            stopped_processes=$(pm2 list | grep "stopped" | wc -l)
            if [ "$stopped_processes" -gt 0 ]; then
                send_alert "WARNING" "$stopped_processes PM2 processes stopped"
            fi
            
            # Check memory usage
            memory_usage=$(pm2 jlist | jq '.[0].monit.memory' 2>/dev/null | head -1)
            if [ ! -z "$memory_usage" ]; then
                memory_mb=$((memory_usage / 1024 / 1024))
                log_message "PM2 memory usage: ${memory_mb}MB"
                
                if [ $memory_mb -gt 1024 ]; then
                    send_alert "WARNING" " usage: ${memoryHigh PM2 memory_mb}MB"
                fi
            fi
            
            return 0
        else
            log_message "PM2 processes - FAILED (No processes running)"
            send_alert "CRITICAL" "No PM2 processes running"
            return 1
        fi
    else
        log_message "PM2 - SKIPPED (PM2 not available)"
        return 0
    fi
}

# System resource check
check_system_resources() {
    log_message "Checking system resources..."
    
    # CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | sed 's/us,//')
    if [ ! -z "$cpu_usage" ]; then
        log_message "CPU usage: ${cpu_usage}%"
        if (( $(echo "$cpu_usage > 80" | bc -l) )); then
            send_alert "WARNING" "High CPU usage: ${cpu_usage}%"
        fi
    fi
    
    # Memory usage
    memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    log_message "Memory usage: ${memory_usage}%"
    if [ $memory_usage -gt 85 ]; then
        send_alert "WARNING" "High memory usage: ${memory_usage}%"
    fi
    
    # Disk usage
    disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    log_message "Disk usage: ${disk_usage}%"
    if [ $disk_usage -gt 90 ]; then
        send_alert "CRITICAL" "High disk usage: ${disk_usage}%"
    fi
    
    # Load average
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log_message "Load average: $load_avg"
    
    if (( $(echo "$load_avg > 2.0" | bc -l) )); then
        send_alert "WARNING" "High load average: $load_avg"
    fi
}

# SSL certificate check
check_ssl_certificate() {
    log_message "Checking SSL certificate..."
    
    if command -v openssl &> /dev/null; then
        # Extract domain from API_URL
        domain=$(echo "$API_URL" | sed 's|https\?://||' | sed 's|/.*||')
        
        # Check certificate expiration
        cert_expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        
        if [ ! -z "$cert_expiry" ]; then
            cert_timestamp=$(date -d "$cert_expiry" +%s)
            current_timestamp=$(date +%s)
            days_until_expiry=$(( (cert_timestamp - current_timestamp) / 86400 ))
            
            log_message "SSL certificate expires in $days_until_expiry days"
            
            if [ $days_until_expiry -lt 7 ]; then
                send_alert "CRITICAL" "SSL certificate expires in $days_until_expiry days"
            elif [ $days_until_expiry -lt 30 ]; then
                send_alert "WARNING" "SSL certificate expires in $days_until_expiry days"
            fi
        fi
    else
        log_message "SSL - SKIPPED (openssl not available)"
    fi
}

# Performance check
check_performance() {
    log_message "Checking performance..."
    
    # Test multiple requests for average response time
    total_time=0
    success_count=0
    error_count=0
    
    for i in {1..5}; do
        response_time=$(curl -w "%{time_total}" -o /dev/null -s "$API_URL/health")
        if [ $? -eq 0 ]; then
            total_time=$(echo "$total_time + $response_time" | bc)
            success_count=$((success_count + 1))
        else
            error_count=$((error_count + 1))
        fi
        sleep 1
    done
    
    if [ $success_count -gt 0 ]; then
        avg_time=$(echo "scale=2; $total_time / $success_count" | bc)
        avg_time_ms=$(echo "$avg_time * 1000" | bc)
        
        log_message "Average response time (5 requests): ${avg_time_ms}ms"
        
        if (( $(echo "$avg_time_ms > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
            send_alert "WARNING" "High response time: ${avg_time_ms}ms"
        fi
    fi
    
    error_rate=$((error_count * 100 / 5))
    if [ $error_rate -gt 0 ]; then
        log_message "Error rate: ${error_rate}%"
        if [ $error_rate -gt $ERROR_RATE_THRESHOLD ]; then
            send_alert "WARNING" "High error rate: ${error_rate}%"
        fi
    fi
}

# Main health check
main() {
    log_message "Starting health check..."
    
    failed_checks=0
    total_checks=0
    
    # API health check
    total_checks=$((total_checks + 1))
    if ! check_endpoint "$API_URL" "API Health"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Backend health check (if different from API)
    if [ "$API_URL" != "$BACKEND_URL" ]; then
        total_checks=$((total_checks + 1))
        if ! check_endpoint "$BACKEND_URL" "Backend Direct"; then
            failed_checks=$((failed_checks + 1))
        fi
    fi
    
    # Frontend health check
    total_checks=$((total_checks + 1))
    if ! check_endpoint "$FRONTEND_URL" "Frontend"; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # Database check
    total_checks=$((total_checks + 1))
    if ! check_database; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # PM2 processes check
    total_checks=$((total_checks + 1))
    if ! check_pm2_processes; then
        failed_checks=$((failed_checks + 1))
    fi
    
    # System resources check
    total_checks=$((total_checks + 1))
    check_system_resources
    
    # SSL certificate check
    total_checks=$((total_checks + 1))
    check_ssl_certificate
    
    # Performance check
    total_checks=$((total_checks + 1))
    check_performance
    
    # Summary
    success_rate=$(( (total_checks - failed_checks) * 100 / total_checks ))
    log_message "Health check completed: $success_rate% success rate ($((total_checks - failed_checks))/$total_checks checks passed)"
    
    if [ $failed_checks -gt 0 ]; then
        send_alert "INFO" "Health check completed with $failed_checks failures out of $total_checks checks"
    fi
    
    # Clean old log entries (keep last 1000 lines)
    if [ -f "$LOG_FILE" ]; then
        tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
}

# Run main function
main "$@"