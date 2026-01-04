// Attendance Management Types

export interface AttendanceStatus {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string;
  payroll_impact: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday' | 'weekly_off';
  deduction_percentage: number;
  color_code: string;
  icon?: string;
  requires_check_in: boolean;
  requires_check_out: boolean;
  counts_as_present: boolean;
  is_system_default: boolean;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceRecord {
  id: string;
  tenant_id: string;
  employee_id: string;
  attendance_date: Date;
  attendance_status_id: string;
  shift_id?: string;
  check_in_time?: Date;
  check_out_time?: Date;
  break_start_time?: Date;
  break_end_time?: Date;
  total_working_hours?: number;
  late_arrival: boolean;
  early_departure: boolean;
  overtime_hours: number;
  notes?: string;
  location_data: AttendanceLocation;
  correction_requested: boolean;
  correction_requested_at?: Date;
  correction_reason?: string;
  correction_approved?: boolean;
  correction_approved_by?: string;
  correction_approved_at?: Date;
  marked_by?: string;
  created_at: Date;
  updated_at: Date;
  // Relations
  attendance_status?: AttendanceStatus;
  employee?: Employee;
  shift_template?: ShiftTemplate;
}

export interface AttendanceLocation {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  device_info?: {
    device_id?: string;
    device_type?: string;
    browser?: string;
    os?: string;
  };
  geo_fence_id?: string;
  is_within_fence?: boolean;
}

export interface ShiftTemplate {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string;
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  break_duration: number; // minutes
  late_threshold_minutes: number;
  early_departure_threshold_minutes: number;
  total_hours: number;
  is_default: boolean;
  is_flexible: boolean;
  work_days: number[]; // 0=Sunday, 1=Monday, etc.
  timezone: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeShift {
  id: string;
  tenant_id: string;
  employee_id: string;
  shift_template_id: string;
  effective_from: Date;
  effective_to?: Date;
  assigned_by?: string;
  is_primary: boolean;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  // Relations
  shift_template?: ShiftTemplate;
  employee?: Employee;
}

export interface AttendanceGeolocation {
  id: string;
  tenant_id: string;
  attendance_record_id: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  device_info: AttendanceDeviceInfo;
  geo_fence_id?: string;
  is_within_fence?: boolean;
  created_at: Date;
}

export interface AttendanceDeviceInfo {
  device_id?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet' | 'biometric';
  browser?: string;
  os?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  attendance_record_id: string;
  requested_by: string;
  original_data: Partial<AttendanceRecord>;
  requested_data: Partial<AttendanceRecord>;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
  // Relations
  attendance_record?: AttendanceRecord;
  original_record?: AttendanceRecord;
}

// Request/Response types
export interface CreateAttendanceRecordDto {
  employee_id: string;
  attendance_date: string;
  attendance_status_id: string;
  shift_id?: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  notes?: string;
  location_data?: Partial<AttendanceLocation>;
}

export interface UpdateAttendanceRecordDto {
  attendance_status_id?: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  notes?: string;
  location_data?: Partial<AttendanceLocation>;
}

export interface RequestAttendanceCorrectionDto {
  attendance_record_id: string;
  requested_data: Partial<AttendanceRecord>;
  reason: string;
  attachment_url?: string;
}

export interface ApproveAttendanceCorrectionDto {
  action: 'approve' | 'reject';
  comments?: string;
  rejection_reason?: string;
}

export interface CreateShiftTemplateDto {
  name: string;
  code: string;
  description?: string;
  start_time: string;
  end_time: string;
  break_duration?: number;
  late_threshold_minutes?: number;
  early_departure_threshold_minutes?: number;
  is_default?: boolean;
  is_flexible?: boolean;
  work_days?: number[];
  timezone?: string;
}

export interface UpdateShiftTemplateDto extends Partial<CreateShiftTemplateDto> {
  status?: 'active' | 'inactive';
}

export interface CreateEmployeeShiftDto {
  employee_ids: string[];
  shift_template_id: string;
  effective_from: string;
  effective_to?: string;
  is_primary?: boolean;
}

export interface CreateAttendanceStatusDto {
  name: string;
  code: string;
  description?: string;
  payroll_impact: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday' | 'weekly_off';
  deduction_percentage?: number;
  color_code?: string;
  icon?: string;
  requires_check_in?: boolean;
  requires_check_out?: boolean;
  counts_as_present?: boolean;
}

export interface UpdateAttendanceStatusDto extends Partial<CreateAttendanceStatusDto> {
  status?: 'active' | 'inactive';
}

export interface AttendanceFilters {
  employee_id?: string[];
  attendance_date_from?: string;
  attendance_date_to?: string;
  attendance_status_id?: string[];
  shift_id?: string;
  department_id?: string;
  location_id?: string;
  late_arrival?: boolean;
  early_departure?: boolean;
  correction_requested?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface AttendanceReportFilters {
  from_date: string;
  to_date: string;
  employee_ids?: string[];
  department_ids?: string[];
  location_ids?: string[];
  attendance_status_ids?: string[];
  shift_ids?: string[];
  report_type: 'summary' | 'lates' | 'absences' | 'overtime' | 'department_summary';
  format?: 'csv' | 'excel' | 'pdf';
}

export interface BulkAttendanceDto {
  records: CreateAttendanceRecordDto[];
  marked_by: string;
  notes?: string;
}

export interface BulkAttendanceImportDto {
  file_url: string;
  file_type: 'csv' | 'excel';
  marked_by: string;
  notes?: string;
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

export interface AttendanceSummary {
  total_employees: number;
  present_today: number;
  absent_today: number;
  half_day_today: number;
  on_leave_today: number;
  late_arrivals: number;
  early_departures: number;
  attendance_percentage: number;
  overtime_hours: number;
}

export interface DepartmentAttendanceSummary {
  department_id: string;
  department_name: string;
  total_employees: number;
  present_count: number;
  absent_count: number;
  half_day_count: number;
  on_leave_count: number;
  attendance_percentage: number;
  late_arrivals: number;
}

export interface AttendanceStatistics {
  daily_average_attendance: number;
  monthly_attendance_percentage: number;
  total_late_arrivals: number;
  total_early_departures: number;
  total_overtime_hours: number;
  most_common_absence_reason: string;
  best_attendance_department: string;
  worst_attendance_department: string;
}

export interface AttendanceCalendar {
  date: string;
  attendance_records: AttendanceRecord[];
  summary: {
    present: number;
    absent: number;
    half_day: number;
    on_leave: number;
    holiday: number;
    weekly_off: number;
  };
}

export interface LateArrivalReport {
  employee_id: string;
  employee_name: string;
  department_name?: string;
  late_count: number;
  total_late_minutes: number;
  average_late_minutes: number;
  last_late_date?: Date;
  common_late_days: string[];
}

export interface AbsenceReport {
  employee_id: string;
  employee_name: string;
  department_name?: string;
  absence_count: number;
  absence_days: number;
  consecutive_absence_days: number;
  last_absence_date?: Date;
  absence_types: {
    sick: number;
    casual: number;
    unauthorized: number;
  };
}

export interface OvertimeReport {
  employee_id: string;
  employee_name: string;
  department_name?: string;
  total_overtime_hours: number;
  overtime_days: number;
  average_overtime_hours: number;
  max_overtime_day: string;
  overtime_rate: number;
  total_overtime_amount: number;
}

export interface AttendanceComplianceReport {
  employee_id: string;
  employee_name: string;
  department_name?: string;
  total_working_days: number;
  present_days: number;
  absent_days: number;
  attendance_percentage: number;
  late_arrival_count: number;
  early_departure_count: number;
  compliance_score: number;
  violations: string[];
}

export interface BulkAttendanceResponse {
  successful_records: number;
  failed_records: number;
  errors: {
    row: number;
    employee_id: string;
    error: string;
  }[];
}

export interface ShiftStatistics {
  total_shifts: number;
  active_shifts: number;
  default_shifts: number;
  flexible_shifts: number;
  average_shift_hours: number;
  most_used_shift: string;
  shift_distribution: {
    shift_name: string;
    employee_count: number;
    percentage: number;
  }[];
}