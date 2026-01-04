-- Leave & Attendance Management Module
-- Enable UUID extension (already enabled in previous migration)

-- =============================================
-- LEAVE MANAGEMENT TABLES
-- =============================================

-- 1. leave_types table
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description TEXT,
    accrual_type VARCHAR(50) NOT NULL DEFAULT 'yearly',
    allocation_value DECIMAL(8,2) NOT NULL DEFAULT 0,
    carry_over_allowed BOOLEAN DEFAULT false,
    max_carry_over DECIMAL(8,2) DEFAULT 0,
    encashment_allowed BOOLEAN DEFAULT false,
    encashment_rate DECIMAL(8,2) DEFAULT 0,
    min_notice_days INTEGER DEFAULT 0,
    max_consecutive_days INTEGER,
    approval_required BOOLEAN DEFAULT true,
    approval_levels INTEGER DEFAULT 1,
    probation_restriction BOOLEAN DEFAULT true,
    half_day_allowed BOOLEAN DEFAULT true,
    can_be_planned BOOLEAN DEFAULT true,
    can_be_emergency BOOLEAN DEFAULT true,
    requires_attachment BOOLEAN DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    color_code VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_leave_type_code_per_tenant UNIQUE(tenant_id, code),
    CONSTRAINT positive_allocation_value CHECK (allocation_value >= 0),
    CONSTRAINT positive_max_carry_over CHECK (max_carry_over >= 0),
    CONSTRAINT valid_approval_levels CHECK (approval_levels >= 1 AND approval_levels <= 5),
    CONSTRAINT valid_min_notice_days CHECK (min_notice_days >= 0)
);

-- 2. leave_allocations table
CREATE TABLE IF NOT EXISTS leave_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    allocation_year INTEGER NOT NULL,
    allocated_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    used_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    carried_over_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    encashed_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(8,2) GENERATED ALWAYS AS (allocated_amount + carried_over_amount - used_amount - encashed_amount) STORED,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_manual BOOLEAN DEFAULT false,
    allocated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_allocation_per_employee_leave_type_year UNIQUE(tenant_id, employee_id, leave_type_id, allocation_year),
    CONSTRAINT positive_allocated_amount CHECK (allocated_amount >= 0),
    CONSTRAINT positive_used_amount CHECK (used_amount >= 0),
    CONSTRAINT positive_carried_over_amount CHECK (carried_over_amount >= 0),
    CONSTRAINT positive_encashed_amount CHECK (encashed_amount >= 0),
    CONSTRAINT valid_effective_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- 3. leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL,
    half_day_type VARCHAR(20),
    reason TEXT,
    emergency_contact VARCHAR(100),
    attachment_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_approval_level INTEGER DEFAULT 1,
    approval_chain JSONB DEFAULT '[]'::jsonb,
    current_approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    resubmitted_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
    resubmission_count INTEGER DEFAULT 0,
    is_retroactive BOOLEAN DEFAULT false,
    retroactive_reason TEXT,
    payroll_processed BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_leave_dates CHECK (to_date >= from_date),
    CONSTRAINT positive_total_days CHECK (total_days > 0),
    CONSTRAINT valid_half_day_type CHECK (half_day_type IS NULL OR half_day_type IN ('first_half', 'second_half')),
    CONSTRAINT valid_approval_level CHECK (current_approval_level >= 1 AND current_approval_level <= 5)
);

-- 4. leave_transactions table
CREATE TABLE IF NOT EXISTS leave_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    previous_balance DECIMAL(8,2) NOT NULL,
    new_balance DECIMAL(8,2) NOT NULL,
    related_leave_request_id UUID REFERENCES leave_requests(id) ON DELETE SET NULL,
    allocation_id UUID REFERENCES leave_allocations(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    description TEXT,
    reference_id UUID,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. leave_attendance_audit_logs table
CREATE TABLE IF NOT EXISTS leave_attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    changes_summary TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ATTENDANCE MANAGEMENT TABLES
-- =============================================

-- 6. attendance_statuses table
CREATE TABLE IF NOT EXISTS attendance_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description TEXT,
    payroll_impact VARCHAR(50) NOT NULL,
    deduction_percentage DECIMAL(5,2) DEFAULT 0,
    color_code VARCHAR(7) DEFAULT '#10B981',
    icon VARCHAR(50),
    requires_check_in BOOLEAN DEFAULT false,
    requires_check_out BOOLEAN DEFAULT false,
    counts_as_present BOOLEAN DEFAULT false,
    is_system_default BOOLEAN DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_attendance_status_code_per_tenant UNIQUE(tenant_id, code),
    CONSTRAINT valid_deduction_percentage CHECK (deduction_percentage >= 0 AND deduction_percentage <= 100)
);

-- 7. attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    attendance_status_id UUID NOT NULL REFERENCES attendance_statuses(id) ON DELETE RESTRICT,
    shift_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
    check_in_time TIME,
    check_out_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    total_working_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE 
            WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL THEN
                EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
            ELSE NULL
        END
    ) STORED,
    late_arrival BOOLEAN DEFAULT false,
    early_departure BOOLEAN DEFAULT false,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    location_data JSONB DEFAULT '{}'::jsonb,
    correction_requested BOOLEAN DEFAULT false,
    correction_requested_at TIMESTAMP WITH TIME ZONE,
    correction_reason TEXT,
    correction_approved BOOLEAN,
    correction_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    correction_approved_at TIMESTAMP WITH TIME ZONE,
    marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_attendance_record_per_employee_date UNIQUE(tenant_id, employee_id, attendance_date),
    CONSTRAINT valid_working_hours CHECK (total_working_hours IS NULL OR total_working_hours >= 0),
    CONSTRAINT valid_overtime_hours CHECK (overtime_hours >= 0),
    CONSTRAINT valid_check_times CHECK (
        check_out_time IS NULL OR 
        check_in_time IS NULL OR 
        check_out_time > check_in_time
    )
);

-- 8. shift_templates table
CREATE TABLE IF NOT EXISTS shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INTEGER DEFAULT 60,
    late_threshold_minutes INTEGER DEFAULT 0,
    early_departure_threshold_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - (break_duration::decimal / 60)
    ) STORED,
    is_default BOOLEAN DEFAULT false,
    is_flexible BOOLEAN DEFAULT false,
    work_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_shift_template_code_per_tenant UNIQUE(tenant_id, code),
    CONSTRAINT valid_shift_times CHECK (end_time > start_time),
    CONSTRAINT positive_break_duration CHECK (break_duration >= 0),
    CONSTRAINT positive_late_threshold CHECK (late_threshold_minutes >= 0),
    CONSTRAINT positive_early_threshold CHECK (early_departure_threshold_minutes >= 0)
);

-- 9. employee_shifts table
CREATE TABLE IF NOT EXISTS employee_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_template_id UUID NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    effective_to DATE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_employee_shift_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- =============================================
-- CALENDAR & HOLIDAY TABLES
-- =============================================

-- 10. holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    holiday_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern VARCHAR(100),
    location_specific BOOLEAN DEFAULT false,
    location_id UUID,
    is_optional BOOLEAN DEFAULT false,
    holiday_type VARCHAR(50) NOT NULL DEFAULT 'national',
    color_code VARCHAR(7) DEFAULT '#EF4444',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_holiday_per_location_date UNIQUE(tenant_id, location_id, holiday_date)
);

-- 11. company_weekly_offs table
CREATE TABLE IF NOT EXISTS company_weekly_offs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id UUID,
    day_of_week INTEGER NOT NULL,
    is_half_day BOOLEAN DEFAULT false,
    half_day_start_time TIME,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CONSTRAINT unique_weekly_off_per_location_day UNIQUE(tenant_id, location_id, day_of_week),
    CONSTRAINT valid_half_day_start_time CHECK (
        NOT is_half_day OR half_day_start_time IS NOT NULL
    )
);

-- =============================================
-- CONFIGURATION TABLES
-- =============================================

-- 12. leave_attendance_config table
CREATE TABLE IF NOT EXISTS leave_attendance_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'free',
    leave_types_limit INTEGER DEFAULT 3,
    custom_leave_types_allowed BOOLEAN DEFAULT false,
    accrual_frequencies TEXT[] DEFAULT ARRAY['yearly'],
    max_approval_levels INTEGER DEFAULT 1,
    attendance_recording_method VARCHAR(50) DEFAULT 'manual_hr',
    attendance_employee_self_mark BOOLEAN DEFAULT false,
    attendance_biometric_integration BOOLEAN DEFAULT false,
    geo_tracking_enabled BOOLEAN DEFAULT false,
    multi_location_support BOOLEAN DEFAULT false,
    compliance_reporting BOOLEAN DEFAULT false,
    api_access_enabled BOOLEAN DEFAULT false,
    notification_channels TEXT[] DEFAULT ARRAY['email'],
    report_formats TEXT[] DEFAULT ARRAY['csv'],
    custom_workflows_allowed BOOLEAN DEFAULT false,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. company_leave_policies table
CREATE TABLE IF NOT EXISTS company_leave_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    policy_name VARCHAR(255) NOT NULL,
    description TEXT,
    leave_accrual_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    notice_period_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    approval_workflow_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    probation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    carry_over_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    encashment_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    retroactive_request_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    max_consecutive_days_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    half_day_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    auto_rejection_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    location_specific_overrides JSONB DEFAULT '{}'::jsonb,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. company_attendance_policies table
CREATE TABLE IF NOT EXISTS company_attendance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    policy_name VARCHAR(255) NOT NULL,
    description TEXT,
    recording_method VARCHAR(50) NOT NULL DEFAULT 'manual_hr',
    grace_period_minutes INTEGER DEFAULT 0,
    late_arrival_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    early_departure_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    overtime_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    break_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    location_based_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    biometric_integration_policy JSONB DEFAULT '{}'::jsonb,
    auto_deduction_policy JSONB DEFAULT '{}'::jsonb,
    correction_request_policy JSONB DEFAULT '{}'::jsonb,
    geo_fencing_policy JSONB DEFAULT '{}'::jsonb,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. location_policies table
CREATE TABLE IF NOT EXISTS location_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id UUID NOT NULL,
    policy_type VARCHAR(50) NOT NULL,
    policy_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NOTIFICATION & AUDIT TABLES
-- =============================================

-- 16. notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
    frequency VARCHAR(50) DEFAULT 'immediate',
    thresholds JSONB DEFAULT '{}'::jsonb,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ADDITIONAL SUPPORT TABLES
-- =============================================

-- 17. locations table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    address JSONB DEFAULT '{}'::jsonb,
    timezone VARCHAR(50) DEFAULT 'UTC',
    geo_coordinates JSONB DEFAULT '{}'::jsonb,
    working_hours JSONB DEFAULT '{}'::jsonb,
    contact_info JSONB DEFAULT '{}'::jsonb,
    is_head_office BOOLEAN DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_location_code_per_tenant UNIQUE(tenant_id, code)
);

-- 18. approval_workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_name VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,
    description TEXT,
    levels JSONB NOT NULL DEFAULT '[]'::jsonb,
    conditions JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. payroll_integrations table
CREATE TABLE IF NOT EXISTS payroll_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    integration_type VARCHAR(100) NOT NULL,
    integration_name VARCHAR(255) NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    api_credentials JSONB DEFAULT '{}'::jsonb,
    sync_frequency VARCHAR(50) DEFAULT 'daily',
    last_sync_date TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'inactive',
    error_logs JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. compliance_rules table
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(100) NOT NULL,
    jurisdiction VARCHAR(100),
    rule_description TEXT,
    rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    violation_actions JSONB DEFAULT '[]'::jsonb,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_mandatory BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. leave_balance_history table
CREATE TABLE IF NOT EXISTS leave_balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    balance_date DATE NOT NULL,
    allocated_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    used_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    carried_over_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    encashed_amount DECIMAL(8,2) NOT NULL DEFAULT 0,
    remaining_amount DECIMAL(8,2) GENERATED ALWAYS AS (allocated_amount + carried_over_amount - used_amount - encashed_amount) STORED,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_balance_history_per_employee_leave_date UNIQUE(tenant_id, employee_id, leave_type_id, balance_date)
);

-- 22. attendance_geolocation table
CREATE TABLE IF NOT EXISTS attendance_geolocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    attendance_record_id UUID NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(8,2),
    address TEXT,
    device_info JSONB DEFAULT '{}'::jsonb,
    geo_fence_id UUID,
    is_within_fence BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 23. system_notifications table
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    channels JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 24. leave_encashments table
CREATE TABLE IF NOT EXISTS leave_encashments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    requested_days DECIMAL(8,2) NOT NULL,
    approved_days DECIMAL(8,2) NOT NULL,
    daily_rate DECIMAL(8,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_requested_days CHECK (requested_days > 0),
    CONSTRAINT positive_approved_days CHECK (approved_days >= 0),
    CONSTRAINT positive_daily_rate CHECK (daily_rate > 0),
    CONSTRAINT positive_total_amount CHECK (total_amount >= 0)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Leave Management indexes
CREATE INDEX idx_leave_types_tenant_id ON leave_types(tenant_id);
CREATE INDEX idx_leave_types_status ON leave_types(status);
CREATE INDEX idx_leave_types_code ON leave_types(tenant_id, code);

CREATE INDEX idx_leave_allocations_tenant_id ON leave_allocations(tenant_id);
CREATE INDEX idx_leave_allocations_employee_id ON leave_allocations(employee_id);
CREATE INDEX idx_leave_allocations_leave_type_id ON leave_allocations(leave_type_id);
CREATE INDEX idx_leave_allocations_year ON leave_allocations(allocation_year);
CREATE INDEX idx_leave_allocations_status ON leave_allocations(status);

CREATE INDEX idx_leave_requests_tenant_id ON leave_requests(tenant_id);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(from_date, to_date);
CREATE INDEX idx_leave_requests_current_approver ON leave_requests(current_approver_id);
CREATE INDEX idx_leave_requests_submitted_at ON leave_requests(submitted_at);

CREATE INDEX idx_leave_transactions_tenant_id ON leave_transactions(tenant_id);
CREATE INDEX idx_leave_transactions_employee_id ON leave_transactions(employee_id);
CREATE INDEX idx_leave_transactions_leave_type_id ON leave_transactions(leave_type_id);
CREATE INDEX idx_leave_transactions_date ON leave_transactions(transaction_date);
CREATE INDEX idx_leave_transactions_type ON leave_transactions(transaction_type);

CREATE INDEX idx_audit_logs_tenant_id ON leave_attendance_audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON leave_attendance_audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON leave_attendance_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON leave_attendance_audit_logs(created_at);

-- Attendance Management indexes
CREATE INDEX idx_attendance_statuses_tenant_id ON attendance_statuses(tenant_id);
CREATE INDEX idx_attendance_statuses_code ON attendance_statuses(tenant_id, code);

CREATE INDEX idx_attendance_records_tenant_id ON attendance_records(tenant_id);
CREATE INDEX idx_attendance_records_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(attendance_status_id);
CREATE INDEX idx_attendance_records_shift_id ON attendance_records(shift_id);
CREATE INDEX idx_attendance_records_marked_by ON attendance_records(marked_by);
CREATE INDEX idx_attendance_records_created_at ON attendance_records(created_at);

CREATE INDEX idx_shift_templates_tenant_id ON shift_templates(tenant_id);
CREATE INDEX idx_shift_templates_code ON shift_templates(tenant_id, code);
CREATE INDEX idx_shift_templates_status ON shift_templates(status);

CREATE INDEX idx_employee_shifts_tenant_id ON employee_shifts(tenant_id);
CREATE INDEX idx_employee_shifts_employee_id ON employee_shifts(employee_id);
CREATE INDEX idx_employee_shifts_shift_template_id ON employee_shifts(shift_template_id);
CREATE INDEX idx_employee_shifts_dates ON employee_shifts(effective_from, effective_to);

-- Holiday Management indexes
CREATE INDEX idx_holidays_tenant_id ON holidays(tenant_id);
CREATE INDEX idx_holidays_date ON holidays(holiday_date);
CREATE INDEX idx_holidays_location_id ON holidays(location_id);
CREATE INDEX idx_holidays_status ON holidays(status);

CREATE INDEX idx_weekly_offs_tenant_id ON company_weekly_offs(tenant_id);
CREATE INDEX idx_weekly_offs_location_id ON company_weekly_offs(location_id);
CREATE INDEX idx_weekly_offs_day ON company_weekly_offs(day_of_week);

-- Configuration indexes
CREATE INDEX idx_leave_attendance_config_tenant_id ON leave_attendance_config(tenant_id);
CREATE INDEX idx_leave_attendance_config_subscription ON leave_attendance_config(subscription_plan);

CREATE INDEX idx_leave_policies_tenant_id ON company_leave_policies(tenant_id);
CREATE INDEX idx_leave_policies_active ON company_leave_policies(is_active);
CREATE INDEX idx_leave_policies_dates ON company_leave_policies(effective_from, effective_to);

CREATE INDEX idx_attendance_policies_tenant_id ON company_attendance_policies(tenant_id);
CREATE INDEX idx_attendance_policies_active ON company_attendance_policies(is_active);
CREATE INDEX idx_attendance_policies_dates ON company_attendance_policies(effective_from, effective_to);

CREATE INDEX idx_location_policies_tenant_id ON location_policies(tenant_id);
CREATE INDEX idx_location_policies_location_id ON location_policies(location_id);
CREATE INDEX idx_location_policies_type ON location_policies(policy_type);

-- Notification indexes
CREATE INDEX idx_notification_settings_tenant_id ON notification_settings(tenant_id);
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_notification_settings_type ON notification_settings(notification_type);

CREATE INDEX idx_locations_tenant_id ON locations(tenant_id);
CREATE INDEX idx_locations_code ON locations(tenant_id, code);
CREATE INDEX idx_locations_status ON locations(status);

CREATE INDEX idx_approval_workflows_tenant_id ON approval_workflows(tenant_id);
CREATE INDEX idx_approval_workflows_type ON approval_workflows(workflow_type);
CREATE INDEX idx_approval_workflows_active ON approval_workflows(is_active);

CREATE INDEX idx_payroll_integrations_tenant_id ON payroll_integrations(tenant_id);
CREATE INDEX idx_payroll_integrations_type ON payroll_integrations(integration_type);
CREATE INDEX idx_payroll_integrations_status ON payroll_integrations(sync_status);

CREATE INDEX idx_compliance_rules_tenant_id ON compliance_rules(tenant_id);
CREATE INDEX idx_compliance_rules_type ON compliance_rules(rule_type);
CREATE INDEX idx_compliance_rules_jurisdiction ON compliance_rules(jurisdiction);
CREATE INDEX idx_compliance_rules_active ON compliance_rules(is_active);

CREATE INDEX idx_leave_balance_history_tenant_id ON leave_balance_history(tenant_id);
CREATE INDEX idx_leave_balance_history_employee_id ON leave_balance_history(employee_id);
CREATE INDEX idx_leave_balance_history_leave_type_id ON leave_balance_history(leave_type_id);
CREATE INDEX idx_leave_balance_history_date ON leave_balance_history(balance_date);

CREATE INDEX idx_attendance_geolocation_tenant_id ON attendance_geolocation(tenant_id);
CREATE INDEX idx_attendance_geolocation_record_id ON attendance_geolocation(attendance_record_id);

CREATE INDEX idx_system_notifications_tenant_id ON system_notifications(tenant_id);
CREATE INDEX idx_system_notifications_recipient_id ON system_notifications(recipient_id);
CREATE INDEX idx_system_notifications_type ON system_notifications(notification_type);
CREATE INDEX idx_system_notifications_status ON system_notifications(status);
CREATE INDEX idx_system_notifications_scheduled_at ON system_notifications(scheduled_at);

CREATE INDEX idx_leave_encashments_tenant_id ON leave_encashments(tenant_id);
CREATE INDEX idx_leave_encashments_employee_id ON leave_encashments(employee_id);
CREATE INDEX idx_leave_encashments_leave_type_id ON leave_encashments(leave_type_id);
CREATE INDEX idx_leave_encashments_status ON leave_encashments(status);
CREATE INDEX idx_leave_encashments_requested_at ON leave_encashments(requested_at);

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign key constraints
ALTER TABLE leave_requests 
ADD CONSTRAINT fk_leave_requests_current_approver 
FOREIGN KEY (current_approver_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE leave_requests 
ADD CONSTRAINT fk_leave_requests_resubmitted 
FOREIGN KEY (resubmitted_request_id) REFERENCES leave_requests(id) ON DELETE SET NULL;

ALTER TABLE leave_transactions 
ADD CONSTRAINT fk_leave_transactions_processed_by 
FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE holidays 
ADD CONSTRAINT fk_holidays_location_id 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE company_weekly_offs 
ADD CONSTRAINT fk_weekly_offs_location_id 
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;

ALTER TABLE employee_shifts 
ADD CONSTRAINT fk_employee_shifts_employee_id 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE employee_shifts 
ADD CONSTRAINT fk_employee_shifts_shift_template 
FOREIGN KEY (shift_template_id) REFERENCES shift_templates(id) ON DELETE CASCADE;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_allocations_updated_at BEFORE UPDATE ON leave_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_statuses_updated_at BEFORE UPDATE ON attendance_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_shifts_updated_at BEFORE UPDATE ON employee_shifts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON holidays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_offs_updated_at BEFORE UPDATE ON company_weekly_offs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_attendance_config_updated_at BEFORE UPDATE ON leave_attendance_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_policies_updated_at BEFORE UPDATE ON company_leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_policies_updated_at BEFORE UPDATE ON company_attendance_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_policies_updated_at BEFORE UPDATE ON location_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_integrations_updated_at BEFORE UPDATE ON payroll_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_rules_updated_at BEFORE UPDATE ON compliance_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_notifications_updated_at BEFORE UPDATE ON system_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_encashments_updated_at BEFORE UPDATE ON leave_encashments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to calculate leave balance
CREATE OR REPLACE FUNCTION calculate_leave_balance(
    p_tenant_id UUID,
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    allocated_amount DECIMAL(8,2),
    used_amount DECIMAL(8,2),
    carried_over_amount DECIMAL(8,2),
    encashed_amount DECIMAL(8,2),
    remaining_amount DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(la.allocated_amount), 0) as allocated_amount,
        COALESCE(SUM(la.used_amount), 0) as used_amount,
        COALESCE(SUM(la.carried_over_amount), 0) as carried_over_amount,
        COALESCE(SUM(la.encashed_amount), 0) as encashed_amount,
        COALESCE(SUM(la.allocated_amount + la.carried_over_amount - la.used_amount - la.encashed_amount), 0) as remaining_amount
    FROM leave_allocations la
    WHERE la.tenant_id = p_tenant_id
    AND la.employee_id = p_employee_id
    AND la.leave_type_id = p_leave_type_id
    AND la.effective_from <= p_as_of_date
    AND (la.effective_to IS NULL OR la.effective_to >= p_as_of_date)
    AND la.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to check for overlapping leave requests
CREATE OR REPLACE FUNCTION check_overlapping_leaves(
    p_tenant_id UUID,
    p_employee_id UUID,
    p_from_date DATE,
    p_to_date DATE,
    p_exclude_request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    overlapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO overlapping_count
    FROM leave_requests lr
    WHERE lr.tenant_id = p_tenant_id
    AND lr.employee_id = p_employee_id
    AND lr.status IN ('approved', 'pending')
    AND lr.id != p_exclude_request_id
    AND (
        (lr.from_date <= p_from_date AND lr.to_date >= p_from_date) OR
        (lr.from_date <= p_to_date AND lr.to_date >= p_to_date) OR
        (lr.from_date >= p_from_date AND lr.to_date <= p_to_date)
    );
    
    RETURN overlapping_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get working days between dates (excluding weekends and holidays)
CREATE OR REPLACE FUNCTION get_working_days(
    p_tenant_id UUID,
    p_from_date DATE,
    p_to_date DATE,
    p_location_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    current_date DATE;
    working_days INTEGER := 0;
    day_of_week INTEGER;
    is_holiday BOOLEAN;
    is_weekly_off BOOLEAN;
BEGIN
    current_date := p_from_date;
    
    WHILE current_date <= p_to_date LOOP
        -- Check if it's a weekend (Saturday=6, Sunday=0)
        day_of_week := EXTRACT(dow FROM current_date);
        
        -- Check if it's a weekly off
        SELECT EXISTS(
            SELECT 1 FROM company_weekly_offs cwo
            WHERE cwo.tenant_id = p_tenant_id
            AND cwo.location_id = p_location_id
            AND cwo.day_of_week = day_of_week
            AND cwo.is_active = true
        ) INTO is_weekly_off;
        
        -- Check if it's a holiday
        SELECT EXISTS(
            SELECT 1 FROM holidays h
            WHERE h.tenant_id = p_tenant_id
            AND h.holiday_date = current_date
            AND (h.location_id IS NULL OR h.location_id = p_location_id)
            AND h.status = 'active'
        ) INTO is_holiday;
        
        -- Count as working day if not weekend, holiday, or weekly off
        IF NOT is_weekly_off AND NOT is_holiday THEN
            working_days := working_days + 1;
        END IF;
        
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN working_days;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DEFAULT DATA
-- =============================================

-- Insert default attendance statuses
INSERT INTO attendance_statuses (tenant_id, name, code, description, payroll_impact, deduction_percentage, color_code, icon, requires_check_in, requires_check_out, counts_as_present, is_system_default) 
SELECT 
    t.id,
    status_data.name,
    status_data.code,
    status_data.description,
    status_data.payroll_impact,
    status_data.deduction_percentage,
    status_data.color_code,
    status_data.icon,
    status_data.requires_check_in,
    status_data.requires_check_out,
    status_data.counts_as_present,
    status_data.is_system_default
FROM tenants t
CROSS JOIN (
    VALUES 
        ('Present', 'PRESENT', 'Employee is present', 'present', 0, '#10B981', 'user-check', true, true, true, true),
        ('Absent', 'ABSENT', 'Employee is absent', 'absent', 100, '#EF4444', 'user-x', false, false, false, true),
        ('Half Day', 'HALF_DAY', 'Employee worked half day', 'half_day', 50, '#F59E0B', 'user-minus', true, true, true, true),
        ('Work From Home', 'WFH', 'Employee working from home', 'present', 0, '#10B981', 'home', false, false, true, true),
        ('On Leave', 'LEAVE', 'Employee on approved leave', 'leave', 0, '#3B82F6', 'calendar', false, false, true, true),
        ('Holiday', 'HOLIDAY', 'Company holiday', 'holiday', 0, '#8B5CF6', 'calendar', false, false, true, true),
        ('Weekly Off', 'WEEKLY_OFF', 'Company weekly off', 'weekly_off', 0, '#6B7280', 'calendar', false, false, true, true)
) AS status_data(name, code, description, payroll_impact, deduction_percentage, color_code, icon, requires_check_in, requires_check_out, counts_as_present, is_system_default)
WHERE NOT EXISTS (
    SELECT 1 FROM attendance_statuses ast 
    WHERE ast.tenant_id = t.id AND ast.code = status_data.code
);

-- Insert default leave types
INSERT INTO leave_types (tenant_id, name, code, description, accrual_type, allocation_value, carry_over_allowed, max_carry_over, encashment_allowed, approval_required, approval_levels, status)
SELECT 
    t.id,
    leave_type_data.name,
    leave_type_data.code,
    leave_type_data.description,
    leave_type_data.accrual_type,
    leave_type_data.allocation_value,
    leave_type_data.carry_over_allowed,
    leave_type_data.max_carry_over,
    leave_type_data.encashment_allowed,
    leave_type_data.approval_required,
    leave_type_data.approval_levels,
    leave_type_data.status
FROM tenants t
CROSS JOIN (
    VALUES 
        ('Sick Leave', 'SL', 'Leave for medical reasons', 'yearly', 12, true, 3, false, true, 1, 'active'),
        ('Casual Leave', 'CL', 'Leave for personal reasons', 'yearly', 12, true, 5, true, 20, true, 1, 'active'),
        ('Annual Leave', 'AL', 'Annual vacation leave', 'yearly', 15, true, 10, true, 25, true, 2, 'active'),
        ('Maternity Leave', 'ML', 'Leave for maternity', 'yearly', 90, false, 0, false, false, true, 2, 'active'),
        ('Paternity Leave', 'PL', 'Leave for paternity', 'yearly', 5, false, 0, false, false, true, 1, 'active')
) AS leave_type_data(name, code, description, accrual_type, allocation_value, carry_over_allowed, max_carry_over, encashment_allowed, approval_required, approval_levels, status)
WHERE NOT EXISTS (
    SELECT 1 FROM leave_types lt 
    WHERE lt.tenant_id = t.id AND lt.code = leave_type_data.code
);

-- Insert default shift template
INSERT INTO shift_templates (tenant_id, name, code, description, start_time, end_time, break_duration, late_threshold_minutes, is_default, status)
SELECT 
    t.id,
    'Standard Office Hours',
    'STD',
    'Standard 9 AM to 6 PM office shift',
    '09:00'::time,
    '18:00'::time,
    60,
    15,
    true,
    'active'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM shift_templates st 
    WHERE st.tenant_id = t.id AND st.is_default = true
);

-- Create default weekly offs (Saturday and Sunday)
INSERT INTO company_weekly_offs (tenant_id, day_of_week, description, is_active)
SELECT 
    t.id,
    weekly_off_data.day_of_week,
    weekly_off_data.description,
    true
FROM tenants t
CROSS JOIN (
    VALUES 
        (0, 'Sunday'),
        (6, 'Saturday')
) AS weekly_off_data(day_of_week, description)
WHERE NOT EXISTS (
    SELECT 1 FROM company_weekly_offs cwo 
    WHERE cwo.tenant_id = t.id AND cwo.day_of_week = weekly_off_data.day_of_week
);