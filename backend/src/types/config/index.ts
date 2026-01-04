// Configuration Management Types

export interface LeaveAttendanceConfig {
  id: string;
  tenant_id?: string;
  subscription_plan: 'free' | 'pro' | 'enterprise';
  leave_types_limit: number;
  custom_leave_types_allowed: boolean;
  accrual_frequencies: string[];
  max_approval_levels: number;
  attendance_recording_method: 'manual_hr' | 'employee_self' | 'biometric' | 'geo_tracking';
  attendance_employee_self_mark: boolean;
  attendance_biometric_integration: boolean;
  geo_tracking_enabled: boolean;
  multi_location_support: boolean;
  compliance_reporting: boolean;
  api_access_enabled: boolean;
  notification_channels: string[];
  report_formats: string[];
  custom_workflows_allowed: boolean;
  features: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CompanyLeavePolicy {
  id: string;
  tenant_id: string;
  policy_name: string;
  description?: string;
  leave_accrual_policy: LeaveAccrualPolicy;
  notice_period_policy: NoticePeriodPolicy;
  approval_workflow_policy: ApprovalWorkflowPolicy;
  probation_policy: ProbationPolicy;
  carry_over_policy: CarryOverPolicy;
  encashment_policy: EncashmentPolicy;
  retroactive_request_policy: RetroactiveRequestPolicy;
  max_consecutive_days_policy: MaxConsecutiveDaysPolicy;
  half_day_policy: HalfDayPolicy;
  auto_rejection_policy: AutoRejectionPolicy;
  location_specific_overrides: Record<string, any>;
  effective_from: Date;
  effective_to?: Date;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CompanyAttendancePolicy {
  id: string;
  tenant_id: string;
  policy_name: string;
  description?: string;
  recording_method: 'manual_hr' | 'employee_self' | 'biometric' | 'geo_tracking';
  grace_period_minutes: number;
  late_arrival_policy: LateArrivalPolicy;
  early_departure_policy: EarlyDeparturePolicy;
  overtime_policy: OvertimePolicy;
  break_policy: BreakPolicy;
  location_based_policy: LocationBasedPolicy;
  biometric_integration_policy: BiometricIntegrationPolicy;
  auto_deduction_policy: AutoDeductionPolicy;
  correction_request_policy: CorrectionRequestPolicy;
  geo_fencing_policy: GeoFencingPolicy;
  effective_from: Date;
  effective_to?: Date;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LocationPolicy {
  id: string;
  tenant_id: string;
  location_id: string;
  policy_type: 'leave' | 'attendance' | 'general';
  policy_data: Record<string, any>;
  effective_from: Date;
  effective_to?: Date;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  // Relations
  location?: Location;
}

export interface NotificationSettings {
  id: string;
  tenant_id: string;
  user_id?: string;
  notification_type: string;
  channels: NotificationChannel[];
  triggers: NotificationTrigger[];
  frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  thresholds: Record<string, any>;
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  // Relations
  user?: User;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app';
  is_enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationTrigger {
  event: string;
  conditions?: Record<string, any>;
  is_enabled: boolean;
}

export interface ApprovalWorkflow {
  id: string;
  tenant_id: string;
  workflow_name: string;
  workflow_type: 'leave_request' | 'attendance_correction' | 'leave_encashment' | 'custom';
  description?: string;
  levels: ApprovalWorkflowLevel[];
  conditions: ApprovalWorkflowCondition[];
  is_default: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalWorkflowLevel {
  level: number;
  approver_type: 'manager' | 'hr' | 'admin' | 'custom';
  approver_id?: string;
  approver_role?: string;
  is_required: boolean;
  can_forward: boolean;
  can_reject: boolean;
  auto_approve_conditions?: Record<string, any>;
}

export interface ApprovalWorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  skip_levels?: number;
}

export interface PayrollIntegration {
  id: string;
  tenant_id: string;
  integration_type: string;
  integration_name: string;
  configuration: Record<string, any>;
  api_credentials: Record<string, any>;
  sync_frequency: 'real_time' | 'daily' | 'weekly' | 'monthly';
  last_sync_date?: Date;
  sync_status: 'active' | 'inactive' | 'error' | 'pending';
  error_logs: PayrollSyncError[];
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PayrollSyncError {
  timestamp: Date;
  error_type: string;
  error_message: string;
  affected_records?: string[];
  retry_count: number;
}

export interface ComplianceRule {
  id: string;
  tenant_id: string;
  rule_name: string;
  rule_type: string;
  jurisdiction?: string;
  rule_description?: string;
  rule_config: Record<string, any>;
  violation_actions: ComplianceViolationAction[];
  effective_from: Date;
  effective_to?: Date;
  is_mandatory: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ComplianceViolationAction {
  action_type: 'warning' | 'alert' | 'block' | 'report';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notify_roles?: string[];
}

// Policy Sub-types
export interface LeaveAccrualPolicy {
  accrual_frequency: 'yearly' | 'monthly' | 'quarterly' | 'bi_annual';
  accrual_timing: 'start_of_year' | 'start_of_month' | 'progressive';
  prorate_on_join: boolean;
  prorate_on_exit: boolean;
  max_accrual_limit?: number;
  expiry_policy: 'never' | 'fixed_date' | 'rolling_months';
  expiry_months?: number;
  expiry_date?: string;
}

export interface NoticePeriodPolicy {
  minimum_notice_days: number;
  advance_notice_required: boolean;
  emergency_override: boolean;
  emergency_notice_hours?: number;
  weekend_notice_handling: 'add_to_notice' | 'ignore' | 'next_business_day';
  holiday_notice_handling: 'add_to_notice' | 'ignore' | 'next_business_day';
}

export interface ApprovalWorkflowPolicy {
  default_levels: number;
  max_levels: number;
  manager_approval_required: boolean;
  hr_approval_required: boolean;
  admin_approval_required: boolean;
  auto_approve_conditions?: Record<string, any>;
  escalation_policy: EscalationPolicy;
  approval_timeout_days?: number;
}

export interface EscalationPolicy {
  enabled: boolean;
  escalate_after_days: number;
  escalate_to_role: string;
  notify_original_approver: boolean;
  escalation_levels: string[];
}

export interface ProbationPolicy {
  restrict_leave_during_probation: boolean;
  probation_period_months: number;
  probation_exempt_leave_types: string[];
  allow_partial_accrual: boolean;
  full_rights_after_probation: boolean;
}

export interface CarryOverPolicy {
  allow_carry_over: boolean;
  max_carry_over_days: number;
  carry_over_expiry_months: number;
  carry_over_expiry_date?: string;
  prorate_carry_over: boolean;
  advance_carry_over_allowed: boolean;
}

export interface EncashmentPolicy {
  allow_encashment: boolean;
  min_days_for_encashment: number;
  max_days_for_encashment?: number;
  encashment_frequency: 'yearly' | 'bi_annual' | 'as_needed';
  encashment_rate: number;
  approval_required: boolean;
}

export interface RetroactiveRequestPolicy {
  allow_retroactive_requests: boolean;
  max_retroactive_days: number;
  require_senior_approval: boolean;
  payroll_impact_handling: 'deduct' | 'adjust_next_month' | 'manual_review';
}

export interface MaxConsecutiveDaysPolicy {
  max_consecutive_days: number;
  require_break_days: number;
  require_medical_certificate: boolean;
  medical_certificate_threshold_days: number;
}

export interface HalfDayPolicy {
  allow_half_day: boolean;
  half_day_calculation: 'full_day' | 'half_day' | 'based_on_hours';
  max_consecutive_half_days: number;
  require_advance_notice: boolean;
}

export interface AutoRejectionPolicy {
  enable_auto_rejection: boolean;
  rejection_conditions: AutoRejectionCondition[];
  notify_employee: boolean;
  notify_manager: boolean;
}

export interface AutoRejectionCondition {
  condition_type: 'insufficient_balance' | 'overlap' | 'notice_period' | 'probation' | 'max_consecutive';
  threshold?: number;
  message: string;
}

export interface LateArrivalPolicy {
  grace_period_minutes: number;
  late_threshold_minutes: number;
  late_counting_method: 'per_month' | 'per_quarter' | 'per_year';
  max_late_occurrences: number;
  late_action: 'none' | 'warning' | 'deduction' | 'meeting';
  late_deduction_per_occurrence?: number;
  consecutive_late_action: 'escalate' | 'deduction' | 'meeting';
}

export interface EarlyDeparturePolicy {
  grace_period_minutes: number;
  early_threshold_minutes: number;
  early_counting_method: 'per_month' | 'per_quarter' | 'per_year';
  max_early_occurrences: number;
  early_action: 'none' | 'warning' | 'deduction';
  early_deduction_per_occurrence?: number;
}

export interface OvertimePolicy {
  calculate_overtime: boolean;
  overtime_threshold_hours: number;
  overtime_rate_multiplier: number;
  overtime_approval_required: boolean;
  max_overtime_hours_per_day: number;
  max_overtime_hours_per_month: number;
  overtime_calculation_method: 'daily' | 'weekly' | 'monthly';
}

export interface BreakPolicy {
  required_break_duration: number;
  break_deduction_policy: 'deduct_full' | 'deduct_actual' | 'no_deduction';
  break_tracking_required: boolean;
  max_break_duration: number;
  unpaid_break_threshold: number;
}

export interface LocationBasedPolicy {
  enable_location_based_rules: boolean;
  default_location_policy: string;
  location_specific_rules: Record<string, any>;
  geo_fencing_required: boolean;
  remote_work_policy: 'allowed' | 'restricted' | 'not_allowed';
}

export interface BiometricIntegrationPolicy {
  enable_biometric: boolean;
  biometric_device_config: Record<string, any>;
  fallback_methods: string[];
  sync_frequency: 'real_time' | 'daily' | 'weekly';
  data_retention_days: number;
}

export interface AutoDeductionPolicy {
  enable_auto_deduction: boolean;
  deduction_calculation: 'daily_rate' | 'hourly_rate' | 'fixed_amount';
  deduction_triggers: string[];
  min_deduction_amount?: number;
  max_deduction_amount?: number;
  deduction_rounding: 'nearest' | 'up' | 'down';
}

export interface CorrectionRequestPolicy {
  allow_correction_requests: boolean;
  correction_request_window_days: number;
  require_approval: boolean;
  auto_approve_conditions?: Record<string, any>;
  max_corrections_per_month: number;
  require_attachment: boolean;
  attachment_types: string[];
}

export interface GeoFencingPolicy {
  enable_geo_fencing: boolean;
  allowed_locations: string[];
  location_radius_meters: number;
  require_check_in_at_location: boolean;
  allow_remote_check_in: boolean;
  geo_fence_violation_action: 'warn' | 'block' | 'require_approval';
}

// Request/Response types
export interface UpdateLeaveAttendanceConfigDto {
  subscription_plan?: 'free' | 'pro' | 'enterprise';
  leave_types_limit?: number;
  custom_leave_types_allowed?: boolean;
  accrual_frequencies?: string[];
  max_approval_levels?: number;
  attendance_recording_method?: 'manual_hr' | 'employee_self' | 'biometric' | 'geo_tracking';
  attendance_employee_self_mark?: boolean;
  attendance_biometric_integration?: boolean;
  geo_tracking_enabled?: boolean;
  multi_location_support?: boolean;
  compliance_reporting?: boolean;
  api_access_enabled?: boolean;
  notification_channels?: string[];
  report_formats?: string[];
  custom_workflows_allowed?: boolean;
  features?: Record<string, any>;
}

export interface CreateCompanyLeavePolicyDto {
  policy_name: string;
  description?: string;
  leave_accrual_policy: LeaveAccrualPolicy;
  notice_period_policy: NoticePeriodPolicy;
  approval_workflow_policy: ApprovalWorkflowPolicy;
  probation_policy: ProbationPolicy;
  carry_over_policy: CarryOverPolicy;
  encashment_policy: EncashmentPolicy;
  retroactive_request_policy: RetroactiveRequestPolicy;
  max_consecutive_days_policy: MaxConsecutiveDaysPolicy;
  half_day_policy: HalfDayPolicy;
  auto_rejection_policy: AutoRejectionPolicy;
  location_specific_overrides?: Record<string, any>;
  effective_from: string;
  effective_to?: string;
}

export interface UpdateCompanyLeavePolicyDto extends Partial<CreateCompanyLeavePolicyDto> {
  is_active?: boolean;
}

export interface CreateCompanyAttendancePolicyDto {
  policy_name: string;
  description?: string;
  recording_method: 'manual_hr' | 'employee_self' | 'biometric' | 'geo_tracking';
  grace_period_minutes?: number;
  late_arrival_policy: LateArrivalPolicy;
  early_departure_policy: EarlyDeparturePolicy;
  overtime_policy: OvertimePolicy;
  break_policy: BreakPolicy;
  location_based_policy: LocationBasedPolicy;
  biometric_integration_policy?: BiometricIntegrationPolicy;
  auto_deduction_policy?: AutoDeductionPolicy;
  correction_request_policy: CorrectionRequestPolicy;
  geo_fencing_policy?: GeoFencingPolicy;
  effective_from: string;
  effective_to?: string;
}

export interface UpdateCompanyAttendancePolicyDto extends Partial<CreateCompanyAttendancePolicyDto> {
  is_active?: boolean;
}

export interface CreateLocationPolicyDto {
  location_id: string;
  policy_type: 'leave' | 'attendance' | 'general';
  policy_data: Record<string, any>;
  effective_from: string;
  effective_to?: string;
}

export interface UpdateLocationPolicyDto extends Partial<CreateLocationPolicyDto> {
  is_active?: boolean;
}

export interface UpdateNotificationSettingsDto {
  notification_type: string;
  channels?: NotificationChannel[];
  triggers?: NotificationTrigger[];
  frequency?: 'immediate' | 'daily' | 'weekly' | 'monthly';
  thresholds?: Record<string, any>;
  is_enabled?: boolean;
}

export interface CreateApprovalWorkflowDto {
  workflow_name: string;
  workflow_type: 'leave_request' | 'attendance_correction' | 'leave_encashment' | 'custom';
  description?: string;
  levels: ApprovalWorkflowLevel[];
  conditions?: ApprovalWorkflowCondition[];
  is_default?: boolean;
}

export interface UpdateApprovalWorkflowDto extends Partial<CreateApprovalWorkflowDto> {
  is_active?: boolean;
}

export interface CreatePayrollIntegrationDto {
  integration_type: string;
  integration_name: string;
  configuration: Record<string, any>;
  api_credentials: Record<string, any>;
  sync_frequency?: 'real_time' | 'daily' | 'weekly' | 'monthly';
}

export interface UpdatePayrollIntegrationDto extends Partial<CreatePayrollIntegrationDto> {
  sync_status?: 'active' | 'inactive' | 'error' | 'pending';
  is_active?: boolean;
}

export interface CreateComplianceRuleDto {
  rule_name: string;
  rule_type: string;
  jurisdiction?: string;
  rule_description?: string;
  rule_config: Record<string, any>;
  violation_actions: ComplianceViolationAction[];
  effective_from: string;
  effective_to?: string;
  is_mandatory?: boolean;
}

export interface UpdateComplianceRuleDto extends Partial<CreateComplianceRuleDto> {
  is_active?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConfigSummary {
  subscription_plan: string;
  active_features: string[];
  configured_policies: {
    leave_policy: boolean;
    attendance_policy: boolean;
    notification_settings: boolean;
    approval_workflows: boolean;
    payroll_integrations: boolean;
    compliance_rules: boolean;
  };
  feature_availability: {
    [key: string]: boolean;
  };
  system_health: {
    last_policy_update: Date;
    sync_status: string;
    error_count: number;
  };
}

export interface PolicyComparison {
  policy_type: string;
  current_policy: any;
  proposed_policy: any;
  differences: {
    field: string;
    old_value: any;
    new_value: any;
    impact: 'low' | 'medium' | 'high';
  }[];
  warnings: string[];
  recommendations: string[];
}

export interface FeatureToggleStatus {
  feature_name: string;
  is_enabled: boolean;
  is_available: boolean;
  restrictions?: string[];
  subscription_required?: string;
}

// Simplified types for relations
export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  status: string;
}

export interface User {
  id: string;
  tenant_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
}