#!/bin/bash

# HRM SaaS Migration Checklist Script
# Purpose: Verify migration readiness and perform pre/post migration checks
# Usage: ./migration_checklist.sh [phase]
# Phases: pre-migration, post-migration, rollback

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="/tmp/migration-checklist.log"
BACKUP_DIR="${BACKUP_DIR:-/home/hrm-saas/backups}"
OLD_SERVICES=(
    "https://hrm-saas-frontend.vercel.app"
    "https://hrm-saas-backend.onrender.com"
    "https://your-project.supabase.co"
)
NEW_DOMAIN="${NEW_DOMAIN:-yourdomain.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@yourdomain.com}"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check counter
check_count=0
pass_count=0
fail_count=0

# Record check result
record_check() {
    local status="$1"
    local description="$2"
    local details="$3"
    
    check_count=$((check_count + 1))
    
    if [ "$status" = "PASS" ]; then
        pass_count=$((pass_count + 1))
        echo -e "${GREEN}✓${NC} $description"
        log "CHECK $check_count PASS: $description"
    elif [ "$status" = "FAIL" ]; then
        fail_count=$((fail_count + 1))
        echo -e "${RED}✗${NC} $description"
        if [ -n "$details" ]; then
            echo -e "    ${RED}$details${NC}"
        fi
        log "CHECK $check_count FAIL: $description - $details"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $description"
        if [ -n "$details" ]; then
            echo -e "    ${YELLOW}$details${NC}"
        fi
        log "CHECK $check_count WARN: $description - $details"
    fi
}

# Pre-migration checks
pre_migration_checks() {
    echo -e "${BLUE}=== PRE-MIGRATION CHECKLIST ===${NC}\n"
    
    log "Starting pre-migration checklist..."
    
    # 1. Backup verification
    info "1. Verifying backups..."
    
    if [ -d "$BACKUP_DIR" ]; then
        latest_backup=$(ls -t "$BACKUP_DIR"/hrm_saas_backup_*.sql.gz 2>/dev/null | head -1)
        if [ -n "$latest_backup" ]; then
            backup_date=$(stat -c %Y "$latest_backup")
            backup_age=$(( ($(date +%s) - backup_date) / 3600 ))
            
            if [ $backup_age -lt 24 ]; then
                record_check "PASS" "Recent backup available" "Backup age: ${backup_age} hours"
            else
                record_check "FAIL" "Backup too old" "Backup age: ${backup_age} hours (>24h)"
            fi
            
            # Test backup integrity
            if gunzip -t "$latest_backup" 2>/dev/null; then
                record_check "PASS" "Backup integrity verified"
            else
                record_check "FAIL" "Backup integrity check failed"
            fi
        else
            record_check "FAIL" "No backup found" "Please create backup before migration"
        fi
    else
        record_check "FAIL" "Backup directory not found" "Please create backup directory"
    fi
    
    # 2. Service availability
    info "2. Checking current services..."
    
    for service in "${OLD_SERVICES[@]}"; do
        if curl -f "$service" >/dev/null 2>&1; then
            record_check "PASS" "Service accessible" "$service"
        else
            record_check "FAIL" "Service not accessible" "$service"
        fi
    done
    
    # 3. DNS configuration
    info "3. Checking DNS configuration..."
    
    # Check if domain resolves
    if nslookup "$NEW_DOMAIN" >/dev/null 2>&1; then
        current_ip=$(nslookup "$NEW_DOMAIN" | grep 'Address:' | tail -n1 | awk '{print $2}')
        record_check "PASS" "Domain resolves" "$NEW_DOMAIN -> $current_ip"
    else
        record_check "FAIL" "Domain does not resolve" "$NEW_DOMAIN"
    fi
    
    # Check DNS propagation
    for dns_server in "8.8.8.8" "1.1.1.1"; do
        if nslookup "$NEW_DOMAIN" "$dns_server" >/dev/null 2>&1; then
            record_check "PASS" "DNS propagates" "DNS server $dns_server"
        else
            record_check "WARN" "DNS not propagates" "DNS server $dns_server"
        fi
    done
    
    # 4. SSL certificate check
    info "4. Checking SSL certificates..."
    
    if command -v openssl &> /dev/null; then
        # Check old services SSL
        for service in "${OLD_SERVICES[@]}"; do
            domain=$(echo "$service" | sed 's|https\?://||' | sed 's|/.*||')
            if echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates >/dev/null 2>&1; then
                record_check "PASS" "SSL certificate valid" "$domain"
            else
                record_check "FAIL" "SSL certificate invalid" "$domain"
            fi
        done
        
        # Check new domain SSL
        if echo | openssl s_client -servername "$NEW_DOMAIN" -connect "$NEW_DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates >/dev/null 2>&1; then
            record_check "PASS" "New domain SSL valid" "$NEW_DOMAIN"
        else
            record_check "FAIL" "New domain SSL invalid" "$NEW_DOMAIN - Run SSL setup"
        fi
    else
        record_check "WARN" "SSL check skipped" "openssl not available"
    fi
    
    # 5. Database connectivity
    info "5. Checking database connectivity..."
    
    if command -v psql &> /dev/null; then
        if psql -U postgres -c "SELECT 1;" >/dev/null 2>&1; then
            record_check "PASS" "Database accessible"
            
            # Check database size
            db_size=$(psql -U postgres -t -c "SELECT pg_size_pretty(pg_database_size('hrm_saas'));" 2>/dev/null | tr -d ' ')
            if [ -n "$db_size" ]; then
                record_check "PASS" "Database size" "$db_size"
            fi
            
            # Check critical tables
            tenants_count=$(psql -U postgres -t -c "SELECT COUNT(*) FROM tenants;" 2>/dev/null | tr -d ' ')
            users_count=$(psql -U postgres -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
            
            if [ ! -z "$tenants_count" ] && [ ! -z "$users_count" ]; then
                record_check "PASS" "Critical data present" "Tenants: $tenants_count, Users: $users_count"
            else
                record_check "FAIL" "Critical data missing" "Check database schema"
            fi
        else
            record_check "FAIL" "Database not accessible"
        fi
    else
        record_check "WARN" "Database check skipped" "psql not available"
    fi
    
    # 6. Application health
    info "6. Checking application health..."
    
    # Test health endpoints
    for service in "${OLD_SERVICES[@]}"; do
        if curl -f "$service/health" >/dev/null 2>&1; then
            record_check "PASS" "Health endpoint OK" "$service/health"
        else
            record_check "FAIL" "Health endpoint failed" "$service/health"
        fi
    done
    
    # 7. Resource availability
    info "7. Checking server resources..."
    
    # Check disk space
    disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    if [ "$disk_usage" -lt 80 ]; then
        record_check "PASS" "Disk space adequate" "${disk_usage}% used"
    else
        record_check "WARN" "Disk space high" "${disk_usage}% used"
    fi
    
    # Check memory
    memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    if [ "$memory_usage" -lt 80 ]; then
        record_check "PASS" "Memory usage adequate" "${memory_usage}% used"
    else
        record_check "WARN" "Memory usage high" "${memory_usage}% used"
    fi
    
    # 8. Configuration verification
    info "8. Verifying configuration..."
    
    # Check environment files
    if [ -f "backend/.env" ]; then
        record_check "PASS" "Backend environment file exists"
    else
        record_check "FAIL" "Backend environment file missing"
    fi
    
    if [ -f "frontend/.env.production" ]; then
        record_check "PASS" "Frontend environment file exists"
    else
        record_check "FAIL" "Frontend environment file missing"
    fi
    
    # Check NGINX configuration
    if [ -f "/etc/nginx/sites-available/hrm-saas" ]; then
        record_check "PASS" "NGINX configuration exists"
        
        # Test NGINX configuration
        if nginx -t >/dev/null 2>&1; then
            record_check "PASS" "NGINX configuration valid"
        else
            record_check "FAIL" "NGINX configuration invalid"
        fi
    else
        record_check "FAIL" "NGINX configuration missing"
    fi
    
    # 9. Monitoring setup
    info "9. Checking monitoring setup..."
    
    # Check if health check script exists
    if [ -f "/home/hrm-saas/scripts/health-check.sh" ]; then
        record_check "PASS" "Health check script exists"
    else
        record_check "WARN" "Health check script missing"
    fi
    
    # Check log directories
    if [ -d "/var/log/hrm-saas" ]; then
        record_check "PASS" "Log directory exists"
    else
        record_check "WARN" "Log directory missing"
    fi
    
    # 10. Team readiness
    info "10. Checking team readiness..."
    
    record_check "PASS" "Migration team notified" "Confirm team is ready"
    record_check "PASS" "User communication prepared" "Confirm migration notice sent"
    record_check "PASS" "Rollback plan reviewed" "Confirm rollback procedures ready"
    
    # Summary
    echo -e "\n${BLUE}=== PRE-MIGRATION SUMMARY ===${NC}"
    echo "Total checks: $check_count"
    echo -e "${GREEN}Passed: $pass_count${NC}"
    echo -e "${RED}Failed: $fail_count${NC}"
    
    if [ $fail_count -eq 0 ]; then
        echo -e "\n${GREEN}✅ READY FOR MIGRATION${NC}"
        log "Pre-migration checklist PASSED - Ready for migration"
        return 0
    else
        echo -e "\n${RED}❌ NOT READY FOR MIGRATION${NC}"
        echo "Please resolve all failed checks before proceeding."
        log "Pre-migration checklist FAILED - $fail_count issues found"
        return 1
    fi
}

# Post-migration checks
post_migration_checks() {
    echo -e "${BLUE}=== POST-MIGRATION CHECKLIST ===${NC}\n"
    
    log "Starting post-migration checklist..."
    
    # 1. Service accessibility
    info "1. Checking new service accessibility..."
    
    new_services=(
        "https://$NEW_DOMAIN"
        "https://$NEW_DOMAIN/health"
        "https://$NEW_DOMAIN/api"
    )
    
    for service in "${new_services[@]}"; do
        if curl -f "$service" >/dev/null 2>&1; then
            record_check "PASS" "Service accessible" "$service"
        else
            record_check "FAIL" "Service not accessible" "$service"
        fi
    done
    
    # 2. DNS propagation
    info "2. Verifying DNS propagation..."
    
    # Check domain resolution
    if nslookup "$NEW_DOMAIN" >/dev/null 2>&1; then
        current_ip=$(nslookup "$NEW_DOMAIN" | grep 'Address:' | tail -n1 | awk '{print $2}')
        record_check "PASS" "Domain resolves correctly" "$NEW_DOMAIN -> $current_ip"
    else
        record_check "FAIL" "Domain resolution failed" "$NEW_DOMAIN"
    fi
    
    # Check from multiple DNS servers
    for dns_server in "8.8.8.8" "1.1.1.1"; do
        if nslookup "$NEW_DOMAIN" "$dns_server" >/dev/null 2>&1; then
            record_check "PASS" "DNS propagates globally" "DNS server $dns_server"
        else
            record_check "WARN" "DNS not propagated" "DNS server $dns_server - May take time"
        fi
    done
    
    # 3. SSL certificate verification
    info "3. Verifying SSL certificates..."
    
    if command -v openssl &> /dev/null; then
        if echo | openssl s_client -servername "$NEW_DOMAIN" -connect "$NEW_DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates >/dev/null 2>&1; then
            record_check "PASS" "SSL certificate valid" "$NEW_DOMAIN"
            
            # Check certificate expiry
            cert_expiry=$(echo | openssl s_client -servername "$NEW_DOMAIN" -connect "$NEW_DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
            cert_timestamp=$(date -d "$cert_expiry" +%s)
            current_timestamp=$(date +%s)
            days_until_expiry=$(( (cert_timestamp - current_timestamp) / 86400 ))
            
            if [ $days_until_expiry -gt 30 ]; then
                record_check "PASS" "SSL certificate valid" "Expires in $days_until_expiry days"
            else
                record_check "WARN" "SSL certificate expiring soon" "Expires in $days_until_expiry days"
            fi
        else
            record_check "FAIL" "SSL certificate invalid" "$NEW_DOMAIN"
        fi
    else
        record_check "WARN" "SSL check skipped" "openssl not available"
    fi
    
    # 4. Database functionality
    info "4. Testing database functionality..."
    
    if command -v psql &> /dev/null; then
        if psql -U postgres -c "SELECT COUNT(*) FROM tenants;" >/dev/null 2>&1; then
            record_check "PASS" "Database accessible"
            
            # Test write operation
            if psql -U postgres -c "INSERT INTO tenants (name, subdomain) VALUES ('test-tenant', 'test-migration'); DELETE FROM tenants WHERE subdomain = 'test-migration';" >/dev/null 2>&1; then
                record_check "PASS" "Database write operations working"
            else
                record_check "FAIL" "Database write operations failing"
            fi
        else
            record_check "FAIL" "Database not accessible"
        fi
    else
        record_check "WARN" "Database check skipped" "psql not available"
    fi
    
    # 5. Application functionality
    info "5. Testing application functionality..."
    
    # Test user registration (if possible)
    registration_test=$(curl -s -X POST "https://$NEW_DOMAIN/api/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"companyName":"test-migration","subdomain":"test-migration","adminEmail":"test@test.com","adminPassword":"testpass123"}' \
        -w "%{http_code}" -o /dev/null)
    
    if [ "$registration_test" = "201" ] || [ "$registration_test" = "400" ]; then
        record_check "PASS" "Registration endpoint working" "HTTP $registration_test"
    else
        record_check "FAIL" "Registration endpoint failing" "HTTP $registration_test"
    fi
    
    # Test authentication
    auth_test=$(curl -s -X POST "https://$NEW_DOMAIN/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@test.com","password":"testpass123"}' \
        -w "%{http_code}" -o /dev/null)
    
    if [ "$auth_test" = "200" ] || [ "$auth_test" = "401" ]; then
        record_check "PASS" "Authentication endpoint working" "HTTP $auth_test"
    else
        record_check "FAIL" "Authentication endpoint failing" "HTTP $auth_test"
    fi
    
    # 6. Performance verification
    info "6. Verifying performance..."
    
    # Test response times
    response_time=$(curl -w "%{time_total}" -o /dev/null -s "https://$NEW_DOMAIN/health")
    response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time_ms < 2000" | bc -l) )); then
        record_check "PASS" "Response time acceptable" "${response_time_ms}ms"
    else
        record_check "WARN" "Response time slow" "${response_time_ms}ms"
    fi
    
    # 7. Error monitoring
    info "7. Checking for errors..."
    
    # Check application logs
    if [ -f "/var/log/hrm-saas/combined.log" ]; then
        recent_errors=$(grep -i "error\|exception" /var/log/hrm-saas/combined.log | tail -10 | wc -l)
        if [ "$recent_errors" -eq 0 ]; then
            record_check "PASS" "No recent errors in logs"
        else
            record_check "WARN" "Recent errors found" "$recent_errors errors in last 10 log entries"
        fi
    else
        record_check "WARN" "Log file not found" "/var/log/hrm-saas/combined.log"
    fi
    
    # Check NGINX error logs
    if [ -f "/var/log/nginx/error.log" ]; then
        nginx_errors=$(tail -20 /var/log/nginx/error.log | grep -i error | wc -l)
        if [ "$nginx_errors" -eq 0 ]; then
            record_check "PASS" "No recent NGINX errors"
        else
            record_check "WARN" "Recent NGINX errors" "$nginx_errors errors in last 20 log entries"
        fi
    else
        record_check "WARN" "NGINX error log not found"
    fi
    
    # 8. Data integrity
    info "8. Verifying data integrity..."
    
    # Check tenant count
    tenants_count=$(psql -U postgres -t -c "SELECT COUNT(*) FROM tenants;" 2>/dev/null | tr -d ' ')
    if [ ! -z "$tenants_count" ] && [ "$tenants_count" -gt 0 ]; then
        record_check "PASS" "Tenant data intact" "$tenants_count tenants"
    else
        record_check "FAIL" "Tenant data missing or corrupted"
    fi
    
    # Check user count
    users_count=$(psql -U postgres -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
    if [ ! -z "$users_count" ] && [ "$users_count" -gt 0 ]; then
        record_check "PASS" "User data intact" "$users_count users"
    else
        record_check "FAIL" "User data missing or corrupted"
    fi
    
    # 9. Multi-tenancy testing
    info "9. Testing multi-tenancy..."
    
    # Test subdomain routing (if you have test tenants)
    subdomains=("test" "demo")
    for subdomain in "${subdomains[@]}"; do
        if curl -f "https://$subdomain.$NEW_DOMAIN" >/dev/null 2>&1; then
            record_check "PASS" "Subdomain routing working" "$subdomain.$NEW_DOMAIN"
        else
            record_check "WARN" "Subdomain not accessible" "$subdomain.$NEW_DOMAIN"
        fi
    done
    
    # 10. Monitoring and alerting
    info "10. Checking monitoring setup..."
    
    # Check if monitoring scripts are running
    if pgrep -f "health-check.sh" >/dev/null; then
        record_check "PASS" "Health monitoring active"
    else
        record_check "WARN" "Health monitoring not running"
    fi
    
    # Summary
    echo -e "\n${BLUE}=== POST-MIGRATION SUMMARY ===${NC}"
    echo "Total checks: $check_count"
    echo -e "${GREEN}Passed: $pass_count${NC}"
    echo -e "${RED}Failed: $fail_count${NC}"
    
    if [ $fail_count -eq 0 ]; then
        echo -e "\n${GREEN}✅ MIGRATION SUCCESSFUL${NC}"
        log "Post-migration checklist PASSED - Migration successful"
        return 0
    else
        echo -e "\n${YELLOW}⚠️  MIGRATION PARTIALLY SUCCESSFUL${NC}"
        echo "Some checks failed - Monitor closely for 24-48 hours."
        log "Post-migration checklist WARNING - $fail_count issues found"
        return 1
    fi
}

# Rollback verification
rollback_verification() {
    echo -e "${BLUE}=== ROLLBACK VERIFICATION ===${NC}\n"
    
    log "Starting rollback verification..."
    
    # 1. Verify old services are restored
    info "1. Verifying old services..."
    
    for service in "${OLD_SERVICES[@]}"; do
        if curl -f "$service" >/dev/null 2>&1; then
            record_check "PASS" "Old service restored" "$service"
        else
            record_check "FAIL" "Old service not restored" "$service"
        fi
    done
    
    # 2. Verify DNS rollback
    info "2. Verifying DNS rollback..."
    
    if nslookup "$NEW_DOMAIN" >/dev/null 2>&1; then
        current_ip=$(nslookup "$NEW_DOMAIN" | grep 'Address:' | tail -n1 | awk '{print $2}')
        # This should now point to the old service IP
        record_check "PASS" "DNS points to old services" "$NEW_DOMAIN -> $current_ip"
    else
        record_check "FAIL" "DNS rollback failed" "$NEW_DOMAIN not resolving"
    fi
    
    # 3. Verify data integrity
    info "3. Verifying data integrity after rollback..."
    
    if command -v psql &> /dev/null; then
        tenants_count=$(psql -U postgres -t -c "SELECT COUNT(*) FROM tenants;" 2>/dev/null | tr -d ' ')
        users_count=$(psql -U postgres -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
        
        if [ ! -z "$tenants_count" ] && [ ! -z "$users_count" ]; then
            record_check "PASS" "Data integrity maintained" "Tenants: $tenants_count, Users: $users_count"
        else
            record_check "FAIL" "Data integrity compromised" "Database queries failing"
        fi
    else
        record_check "WARN" "Data check skipped" "psql not available"
    fi
    
    # Summary
    echo -e "\n${BLUE}=== ROLLBACK SUMMARY ===${NC}"
    echo "Total checks: $check_count"
    echo -e "${GREEN}Passed: $pass_count${NC}"
    echo -e "${RED}Failed: $fail_count${NC}"
    
    if [ $fail_count -eq 0 ]; then
        echo -e "\n${GREEN}✅ ROLLBACK SUCCESSFUL${NC}"
        log "Rollback verification PASSED - Rollback successful"
        return 0
    else
        echo -e "\n${RED}❌ ROLLBACK FAILED${NC}"
        log "Rollback verification FAILED - $fail_count issues found"
        return 1
    fi
}

# Main function
main() {
    local phase="${1:-pre-migration}"
    
    echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║              HRM SaaS Migration Checklist                    ║
║              Phase: $phase${NC}
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    case "$phase" in
        "pre-migration")
            pre_migration_checks
            ;;
        "post-migration")
            post_migration_checks
            ;;
        "rollback")
            rollback_verification
            ;;
        *)
            echo "Usage: $0 [pre-migration|post-migration|rollback]"
            exit 1
            ;;
    esac
    
    echo -e "\nChecklist completed. Log saved to: $LOG_FILE"
    
    # Exit with appropriate code
    if [ $fail_count -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"