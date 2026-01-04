#!/bin/bash

# HRM SaaS Upgrade Readiness Assessment Script
# Purpose: Assess when to upgrade from Free to Pro or Pro to Own Server
# Schedule: Weekly on Monday at 9:00 AM via cron
# Usage: ./upgrade_readiness.sh

set -e  # Exit on any error

# Configuration
LOG_FILE="${LOG_FILE:-/var/log/hrm-saas/upgrade-readiness.log}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Free tier thresholds (upgrade to Pro)
FREE_TIER_LIMITS=(
    "SUPABASE_STORAGE_MB:400:80"    # 80% of 500MB
    "VERCEL_BANDWIDTH_GB:80:80"     # 80% of 100GB
    "RENDER_USAGE_HOURS:600:80"     # 80% of 750 hours
    "RESPONSE_TIME_MS:400:1"        # Average > 400ms
    "ERROR_RATE_PERCENT:2:1"        # Error rate > 2%
    "USER_COMPLAINTS_PERCENT:5:1"   # > 5% users complain
)

# Pro tier thresholds (upgrade to Own Server)
PRO_TIER_LIMITS=(
    "SUPABASE_STORAGE_MB:6400:80"   # 80% of 8GB
    "VERCEL_BANDWIDTH_GB:800:80"    # 80% of 1TB
    "MONTHLY_COST_USD:100:1"        # Monthly cost > $100
    "RESPONSE_TIME_MS:300:1"        # Average > 300ms
    "CPU_USAGE_PERCENT:70:1"        # CPU > 70% consistently
    "MEMORY_USAGE_PERCENT:80:1"     # Memory > 80% consistently
)

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$LOG_FILE"
}

# Send notification
send_notification() {
    local severity="$1"
    local title="$2"
    local message="$3"
    
    log_message "NOTIFICATION [$severity]: $title"
    log_message "$message"
    
    # Send to Slack if webhook is configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"📈 HRM SaaS Upgrade Assessment [$severity]: $title\\n$message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
    
    # Send email if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "HRM SaaS Upgrade Assessment [$severity]: $title" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Check Supabase storage usage
check_supabase_storage() {
    log_message "Checking Supabase storage usage..."
    
    # This would require Supabase API access or database query
    # For now, we'll provide a template for the user to implement
    
    # Example implementation with Supabase API:
    # STORAGE_USAGE=$(curl -s -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    #     "$SUPABASE_URL/storage/v1/bucket" | jq -r '.[0].size')
    # STORAGE_MB=$((STORAGE_USAGE / 1024 / 1024))
    
    # Placeholder - user needs to implement based on their setup
    log_message "Supabase storage check - Manual implementation required"
    log_message "Check Supabase dashboard → Storage for current usage"
    
    # Return a mock value for demonstration
    echo "250"  # MB
}

# Check Vercel bandwidth usage
check_vercel_bandwidth() {
    log_message "Checking Vercel bandwidth usage..."
    
    # This would require Vercel API access
    # For now, we'll provide a template
    
    log_message "Vercel bandwidth check - Manual implementation required"
    log_message "Check Vercel dashboard → Analytics → Bandwidth for current usage"
    
    # Return a mock value for demonstration
    echo "45"  # GB
}

# Check Render usage
check_render_usage() {
    log_message "Checking Render usage..."
    
    # This would require Render API access
    # For now, we'll provide a template
    
    log_message "Render usage check - Manual implementation required"
    log_message "Check Render dashboard → Service → Metrics for current usage"
    
    # Return a mock value for demonstration
    echo "350"  # hours
}

# Check response time
check_response_time() {
    log_message "Checking average response time..."
    
    # Calculate average response time from recent health checks
    if [ -f "/var/log/hrm-saas/health-check.log" ]; then
        # Extract response times from health check logs
        avg_time_ms=$(grep "Average response time" /var/log/hrm-saas/health-check.log | \
            tail -10 | awk '{print $4}' | awk -F'ms' '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
        
        if [ ! -z "$avg_time_ms" ] && [ "$avg_time_ms" != "0" ]; then
            log_message "Average response time: ${avg_time_ms}ms"
            echo "$avg_time_ms"
            return
        fi
    fi
    
    # Fallback: measure current response time
    response_time=$(curl -w "%{time_total}" -o /dev/null -s "https://yourdomain.com/health")
    response_time_ms=$(echo "$response_time * 1000" | bc)
    log_message "Current response time: ${response_time_ms}ms"
    echo "$response_time_ms"
}

# Check error rate
check_error_rate() {
    log_message "Checking error rate..."
    
    # Extract error rate from application metrics
    # This would depend on your monitoring setup
    
    log_message "Error rate check - Manual implementation required"
    log_message "Check application logs and monitoring for error rates"
    
    # Return a mock value for demonstration
    echo "1.2"  # percentage
}

# Check system resources (for own server)
check_system_resources() {
    log_message "Checking system resources..."
    
    # CPU usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | sed 's/us,//')
    log_message "CPU usage: ${cpu_usage}%"
    
    # Memory usage
    memory_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    log_message "Memory usage: ${memory_usage}%"
    
    echo "$cpu_usage $memory_usage"
}

# Check monthly costs
check_monthly_costs() {
    log_message "Checking monthly costs..."
    
    # This would require integration with billing APIs
    # For now, we'll provide a template
    
    log_message "Monthly cost check - Manual implementation required"
    log_message "Check billing dashboards for current monthly costs"
    
    # Return a mock value for demonstration
    echo "67"  # USD
}

# Assess free tier upgrade readiness
assess_free_tier_upgrade() {
    log_message "Assessing Free Tier upgrade readiness..."
    
    local upgrade_needed=0
    local assessment_results=()
    
    # Check storage
    storage_mb=$(check_supabase_storage)
    if [ $storage_mb -gt 400 ]; then
        assessment_results+=("Storage: ${storage_mb}MB/500MB (${storage_mb}% of limit) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Storage: ${storage_mb}MB/500MB ($((storage_mb * 100 / 500))% of limit) - OK")
    fi
    
    # Check bandwidth
    bandwidth_gb=$(check_vercel_bandwidth)
    if [ $bandwidth_gb -gt 80 ]; then
        assessment_results+=("Bandwidth: ${bandwidth_gb}GB/100GB (${bandwidth_gb}% of limit) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Bandwidth: ${bandwidth_gb}GB/100GB ($((bandwidth_gb * 100 / 100))% of limit) - OK")
    fi
    
    # Check Render usage
    render_hours=$(check_render_usage)
    if [ $render_hours -gt 600 ]; then
        assessment_results+=("Render: ${render_hours}h/750h (${render_hours}% of limit) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Render: ${render_hours}h/750h ($((render_hours * 100 / 750))% of limit) - OK")
    fi
    
    # Check response time
    response_time=$(check_response_time)
    if (( $(echo "$response_time > 400" | bc -l) )); then
        assessment_results+=("Response Time: ${response_time}ms (Target: <400ms) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Response Time: ${response_time}ms - OK")
    fi
    
    # Check error rate
    error_rate=$(check_error_rate)
    if (( $(echo "$error_rate > 2" | bc -l) )); then
        assessment_results+=("Error Rate: ${error_rate}% (Target: <2%) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Error Rate: ${error_rate}% - OK")
    fi
    
    # Display results
    log_message "Free Tier Assessment Results:"
    for result in "${assessment_results[@]}"; do
        log_message "  $result"
    done
    
    # Recommendation
    if [ $upgrade_needed -eq 0 ]; then
        log_message "RECOMMENDATION: No upgrade needed. Free tier performing well."
        send_notification "INFO" "Free Tier Assessment" "No upgrade needed. Free tier performing well. $upgrade_needed indicators suggest upgrade."
    elif [ $upgrade_needed -le 2 ]; then
        log_message "RECOMMENDATION: Consider upgrading to Pro tier. $upgrade_needed indicators suggest upgrade would be beneficial."
        send_notification "WARNING" "Free Tier Assessment" "Consider upgrading to Pro tier. $upgrade_needed indicators suggest upgrade would be beneficial."
    else
        log_message "RECOMMENDATION: Upgrade to Pro tier strongly recommended. $upgrade_needed indicators suggest upgrade necessary."
        send_notification "CRITICAL" "Free Tier Assessment" "Upgrade to Pro tier strongly recommended. $upgrade_needed indicators suggest upgrade necessary."
    fi
    
    return $upgrade_needed
}

# Assess Pro tier upgrade readiness
assess_pro_tier_upgrade() {
    log_message "Assessing Pro Tier upgrade readiness..."
    
    local upgrade_needed=0
    local assessment_results=()
    
    # Check storage (Pro tier has 8GB limit)
    storage_mb=$(check_supabase_storage)
    if [ $storage_mb -gt 6400 ]; then
        assessment_results+=("Storage: ${storage_mb}MB/8GB (${storage_mb}% of limit) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Storage: ${storage_mb}MB/8GB ($((storage_mb * 100 / 8192))% of limit) - OK")
    fi
    
    # Check bandwidth (Pro tier has 1TB limit)
    bandwidth_gb=$(check_vercel_bandwidth)
    if [ $bandwidth_gb -gt 800 ]; then
        assessment_results+=("Bandwidth: ${bandwidth_gb}GB/1TB (${bandwidth_gb}% of limit) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Bandwidth: ${bandwidth_gb}GB/1TB ($((bandwidth_gb * 100 / 1000))% of limit) - OK")
    fi
    
    # Check monthly costs
    monthly_cost=$(check_monthly_costs)
    if [ $monthly_cost -gt 100 ]; then
        assessment_results+=("Monthly Cost: $${monthly_cost} (Target: <$100) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Monthly Cost: $${monthly_cost} - OK")
    fi
    
    # Check response time
    response_time=$(check_response_time)
    if (( $(echo "$response_time > 300" | bc -l) )); then
        assessment_results+=("Response Time: ${response_time}ms (Target: <300ms) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Response Time: ${response_time}ms - OK")
    fi
    
    # Check system resources (if own server)
    resources=$(check_system_resources)
    cpu_usage=$(echo "$resources" | awk '{print $1}')
    memory_usage=$(echo "$resources" | awk '{print $2}')
    
    if (( $(echo "$cpu_usage > 70" | bc -l) )); then
        assessment_results+=("CPU Usage: ${cpu_usage}% (Target: <70%) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("CPU Usage: ${cpu_usage}% - OK")
    fi
    
    if [ $memory_usage -gt 80 ]; then
        assessment_results+=("Memory Usage: ${memory_usage}% (Target: <80%) - UPGRADE RECOMMENDED")
        upgrade_needed=$((upgrade_needed + 1))
    else
        assessment_results+=("Memory Usage: ${memory_usage}% - OK")
    fi
    
    # Display results
    log_message "Pro Tier Assessment Results:"
    for result in "${assessment_results[@]}"; do
        log_message "  $result"
    done
    
    # Recommendation
    if [ $upgrade_needed -eq 0 ]; then
        log_message "RECOMMENDATION: No upgrade needed. Pro tier performing well."
        send_notification "INFO" "Pro Tier Assessment" "No upgrade needed. Pro tier performing well."
    elif [ $upgrade_needed -le 2 ]; then
        log_message "RECOMMENDATION: Consider migrating to Own Server. $upgrade_needed indicators suggest migration would be beneficial."
        send_notification "WARNING" "Pro Tier Assessment" "Consider migrating to Own Server. $upgrade_needed indicators suggest migration would be beneficial."
    else
        log_message "RECOMMENDATION: Migrate to Own Server strongly recommended. $upgrade_needed indicators suggest migration necessary."
        send_notification "CRITICAL" "Pro Tier Assessment" "Migrate to Own Server strongly recommended. $upgrade_needed indicators suggest migration necessary."
    fi
    
    return $upgrade_needed
}

# Generate upgrade recommendation report
generate_report() {
    local free_tier_score=$1
    local pro_tier_score=$2
    
    local report_file="/tmp/upgrade-readiness-report-$(date +%Y%m%d).txt"
    
    cat > "$report_file" << EOF
HRM SaaS Upgrade Readiness Report
Generated: $(date)

FREE TIER ASSESSMENT
===================
Upgrade Indicators: $free_tier_score
Recommendation: $(if [ $free_tier_score -eq 0 ]; then echo "No upgrade needed"; elif [ $free_tier_score -le 2 ]; then echo "Consider Pro tier upgrade"; else echo "Upgrade to Pro tier strongly recommended"; fi)

PRO TIER ASSESSMENT
==================
Upgrade Indicators: $pro_tier_score
Recommendation: $(if [ $pro_tier_score -eq 0 ]; then echo "No upgrade needed"; elif [ $pro_tier_score -le 2 ]; then echo "Consider Own Server migration"; else echo "Migrate to Own Server strongly recommended"; fi)

CURRENT TIER RECOMMENDATIONS
===========================
$(if [ $free_tier_score -gt 2 ]; then
    echo "🚨 IMMEDIATE ACTION: Upgrade from Free to Pro tier"
    echo "   - Benefits: 10x bandwidth, 16x storage, better performance"
    echo "   - Cost: $67/month vs $0/month"
    echo "   - Implementation: See PRO_TIER_UPGRADE.md"
elif [ $pro_tier_score -gt 2 ]; then
    echo "⚠️  PLANNING NEEDED: Consider Own Server migration"
    echo "   - Benefits: Full control, cost savings at scale"
    echo "   - Cost: $30-60/month vs $67/month"
    echo "   - Implementation: See OWN_SERVER_SETUP.md"
else
    echo "✅ CURRENT TIER APPROPRIATE"
    echo "   - Performance meets requirements"
    echo "   - Costs within budget"
    echo "   - No immediate upgrade needed"
fi)

NEXT STEPS
==========
1. Review detailed assessment results above
2. Consider business requirements and budget
3. Plan upgrade timeline if recommended
4. Test upgrade procedures in staging environment
5. Monitor post-upgrade performance

For detailed upgrade procedures, see:
- PRO_TIER_UPGRADE.md
- OWN_SERVER_SETUP.md
- MIGRATION_GUIDE.md

EOF
    
    log_message "Upgrade readiness report generated: $report_file"
    
    # Send report via email if configured
    if [ -n "$ALERT_EMAIL" ]; then
        mail -s "HRM SaaS Upgrade Readiness Report - $(date +%Y-%m-%d)" "$ALERT_EMAIL" < "$report_file" 2>/dev/null || true
    fi
}

# Main assessment function
main() {
    log_message "Starting upgrade readiness assessment..."
    
    # Assess current tier (assume Free tier for demonstration)
    # In practice, you'd determine this from configuration
    CURRENT_TIER="free"
    
    if [ "$CURRENT_TIER" = "free" ]; then
        assess_free_tier_upgrade
        free_tier_score=$?
        
        assess_pro_tier_upgrade
        pro_tier_score=$?
        
        generate_report $free_tier_score $pro_tier_score
        
    elif [ "$CURRENT_TIER" = "pro" ]; then
        assess_pro_tier_upgrade
        pro_tier_score=$?
        
        generate_report 0 $pro_tier_score
        
    elif [ "$CURRENT_TIER" = "own_server" ]; then
        log_message "Already on own server - no upgrade path available"
        generate_report 0 0
    fi
    
    log_message "Upgrade readiness assessment completed"
    
    # Clean up old log entries
    tail -n 1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
    mv "${LOG_FILE}.tmp" "$LOG_FILE"
}

# Run main function
main "$@"