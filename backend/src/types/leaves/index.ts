// Leave Management Types

export interface LeaveType {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string;
  accrual_type: 'yearly' | 'monthly' | 'quarterly';
  allocation_value: number;
  carry_over_allowed: boolean;
  max_carry_over: number;
  encashment_allowed: boolean;
  encashment_rate: number;
  min_notice_days: number;
  max_consecutive_days?: number;
  approval_required: boolean;
  approval_levels: number;
  probation_restriction: boolean;
  half_day_allowed: boolean;
  can_be_planned: boolean;
  can_be_emergency: boolean;
  requires_attachment: boolean;
  status: 'active' | 'inactive';
  color_code: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveAllocation {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type_id: string;
  allocation_year: number;
  allocated_amount: number;
  used_amount: number;
  carried_over_amount: number;
  encashed_amount: number;
  remaining_amount: number;
  effective_from: Date;
  effective_to?: Date;
  is_manual: boolean;
  allocated_by?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  // Relations
  leave_type?: LeaveType;
  employee?: Employee;
}

export interface LeaveRequest {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type_id: string;
  from_date: Date;
  to_date: Date;
  total_days: number;
  half_day_type?: 'first_half' | 'second_half';
  reason?: string;
  emergency_contact?: string;
  attachment_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  current_approval_level: number;
  approval_chain: ApprovalLevel[];
  current_approver_id?: string;
  rejection_reason?: string;
  resubmitted_request_id?: string;
  resubmission_count: number;
  is_retroactive: boolean;
  retroactive_reason?: string;
  payroll_processed: boolean;
  submitted_at: Date;
  approved_at?: Date;
  rejected_at?: Date;
  cancelled_at?: Date;
  created_at: Date;
  updated_at: Date;
  // Relations
  leave_type?: LeaveType;
  employee?: Employee;
}

export interface LeaveTransaction {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type_id: string;
  transaction_type: 'allocation' | 'usage' | 'carry_over' | 'encashment' | 'adjustment';
  amount: number;
  previous_balance: number;
  new_balance: number;
  related_leave_request_id?: string;
  allocation_id?: string;
  transaction_date: Date;
  effective_date: Date;
  description?: string;
  reference_id?: string;
  processed_by?: string;
  processed_at: Date;
  created_at: Date;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  allocated_amount: number;
  used_amount: number;
  carried_over_amount: number;
  encashed_amount: number;
  remaining_amount: number;
  pending_requests: number;
  leave_type?: LeaveType;
}

export interface ApprovalLevel {
  level: number;
  approver_id?: string;
  approver_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'forwarded';
  comments?: string;
  approved_at?: Date;
}

export interface LeaveEncashment {
  id: string;
  tenant_id: string;
  employee_id: string;
  leave_type_id: string;
  requested_days: number;
  approved_days: number;
  daily_rate: number;
  total_amount: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requested_at: Date;
  approved_at?: Date;
  approved_by?: string;
  processed_at?: Date;
  processed_by?: string;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// Employee type (simplified for relations)
export interface Employee {
  id: string;
  tenant_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string;
  position?: string;
  status: string;
  hire_date: Date;
}

// Request/Response types
export interface CreateLeaveRequestDto {
  leave_type_id: string;
  from_date: string;
  to_date: string;
  half_day_type?: 'first_half' | 'second_half';
  reason?: string;
  emergency_contact?: string;
  is_retroactive?: boolean;
  retroactive_reason?: string;
}

export interface UpdateLeaveRequestDto {
  from_date?: string;
  to_date?: string;
  half_day_type?: 'first_half' | 'second_half';
  reason?: string;
  emergency_contact?: string;
}

export interface ApproveLeaveRequestDto {
  action: 'approve' | 'reject' | 'forward';
  comments?: string;
  forwarded_to_id?: string;
}

export interface CreateLeaveAllocationDto {
  employee_ids: string[];
  leave_type_id: string;
  allocation_year: number;
  allocated_amount: number;
  effective_from: string;
  notes?: string;
}

export interface UpdateLeaveAllocationDto {
  allocated_amount?: number;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
}

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  description?: string;
  accrual_type: 'yearly' | 'monthly' | 'quarterly';
  allocation_value: number;
  carry_over_allowed: boolean;
  max_carry_over?: number;
  encashment_allowed: boolean;
  encashment_rate?: number;
  min_notice_days?: number;
  max_consecutive_days?: number;
  approval_required?: boolean;
  approval_levels?: number;
  probation_restriction?: boolean;
  half_day_allowed?: boolean;
  can_be_planned?: boolean;
  can_be_emergency?: boolean;
  requires_attachment?: boolean;
  color_code?: string;
}

export interface UpdateLeaveTypeDto extends Partial<CreateLeaveTypeDto> {
  status?: 'active' | 'inactive';
}

export interface LeaveRequestFilters {
  status?: string[];
  leave_type_id?: string;
  employee_id?: string;
  from_date?: string;
  to_date?: string;
  department_id?: string;
  location_id?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface LeaveBalanceFilters {
  employee_id?: string;
  leave_type_id?: string;
  year?: number;
}

export interface LeaveReportFilters {
  from_date?: string;
  to_date?: string;
  employee_ids?: string[];
  department_ids?: string[];
  location_ids?: string[];
  leave_type_ids?: string[];
  report_type: 'balance' | 'utilization' | 'compliance' | 'transactions';
  format?: 'csv' | 'excel' | 'pdf';
}

export interface CreateLeaveEncashmentDto {
  leave_type_id: string;
  requested_days: number;
  reason?: string;
}

export interface UpdateLeaveEncashmentDto {
  approved_days?: number;
  daily_rate?: number;
  status?: 'approved' | 'rejected' | 'processed';
  rejection_reason?: string;
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

export interface LeaveBalanceResponse {
  employee_id: string;
  employee_name: string;
  balances: LeaveBalance[];
  total_allocated: number;
  total_used: number;
  total_remaining: number;
}

export interface LeaveRequestSummary {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  cancelled_requests: number;
  total_days_requested: number;
  total_days_approved: number;
  pending_days: number;
}

export interface LeaveUtilizationReport {
  employee_id: string;
  employee_name: string;
  department_name?: string;
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  allocated: number;
  used: number;
  remaining: number;
  utilization_percentage: number;
  pending_requests: number;
}