// Holiday & Calendar Management Types

export interface Holiday {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  holiday_date: Date;
  is_recurring: boolean;
  recurring_pattern?: string;
  location_specific: boolean;
  location_id?: string;
  is_optional: boolean;
  holiday_type: 'national' | 'regional' | 'company' | 'religious' | 'other';
  color_code: string;
  created_by?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
  // Relations
  location?: Location;
  creator?: User;
}

export interface WeeklyOff {
  id: string;
  tenant_id: string;
  location_id?: string;
  day_of_week: number; // 0=Sunday, 1=Monday, etc.
  is_half_day: boolean;
  half_day_start_time?: string; // HH:mm format
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  // Relations
  location?: Location;
  creator?: User;
}

export interface Location {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  address: LocationAddress;
  timezone: string;
  geo_coordinates: GeoCoordinates;
  working_hours: WorkingHours;
  contact_info: LocationContactInfo;
  is_head_office: boolean;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface LocationAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  landmark?: string;
}

export interface GeoCoordinates {
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
}

export interface WorkingHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  is_working_day: boolean;
  start_time?: string; // HH:mm format
  end_time?: string; // HH:mm format
  break_duration?: number; // minutes
}

export interface LocationContactInfo {
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_contact?: string;
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

// Request/Response types
export interface CreateHolidayDto {
  name: string;
  description?: string;
  holiday_date: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
  location_specific?: boolean;
  location_id?: string;
  is_optional?: boolean;
  holiday_type?: 'national' | 'regional' | 'company' | 'religious' | 'other';
  color_code?: string;
}

export interface UpdateHolidayDto extends Partial<CreateHolidayDto> {
  status?: 'active' | 'inactive';
}

export interface BulkHolidayDto {
  holidays: CreateHolidayDto[];
}

export interface CreateLocationDto {
  name: string;
  code: string;
  address?: Partial<LocationAddress>;
  timezone?: string;
  geo_coordinates?: Partial<GeoCoordinates>;
  working_hours?: Partial<WorkingHours>;
  contact_info?: Partial<LocationContactInfo>;
  is_head_office?: boolean;
}

export interface UpdateLocationDto extends Partial<CreateLocationDto> {
  status?: 'active' | 'inactive';
}

export interface UpdateWeeklyOffDto {
  day_of_week: number;
  is_half_day?: boolean;
  half_day_start_time?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateWeeklyOffDto {
  location_id?: string;
  weekly_offs: {
    day_of_week: number;
    is_half_day?: boolean;
    half_day_start_time?: string;
    description?: string;
  }[];
}

export interface HolidayFilters {
  year?: number;
  month?: number;
  location_id?: string;
  holiday_type?: string;
  is_recurring?: boolean;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface LocationFilters {
  status?: string;
  is_head_office?: boolean;
  timezone?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface WeeklyOffFilters {
  location_id?: string;
  day_of_week?: number;
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
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

export interface HolidayCalendar {
  year: number;
  month: number;
  holidays: Holiday[];
  weekly_offs: WeeklyOff[];
  working_days: number;
  total_holidays: number;
  total_weekly_offs: number;
  working_days_per_week: number;
}

export interface WorkingDaysCalculation {
  from_date: string;
  to_date: string;
  total_days: number;
  working_days: number;
  holidays: number;
  weekly_offs: number;
  excluded_dates: string[];
  excluded_reasons: ('holiday' | 'weekly_off')[];
}

export interface HolidaySummary {
  total_holidays: number;
  national_holidays: number;
  regional_holidays: number;
  company_holidays: number;
  religious_holidays: number;
  optional_holidays: number;
  recurring_holidays: number;
  location_specific_holidays: number;
}

export interface LocationSummary {
  total_locations: number;
  active_locations: number;
  head_office_count: number;
  locations_by_timezone: {
    timezone: string;
    count: number;
  }[];
  locations_by_country: {
    country: string;
    count: number;
  }[];
}

export interface WeeklyOffSummary {
  total_weekly_offs: number;
  active_weekly_offs: number;
  half_day_offs: number;
  full_day_offs: number;
  weekly_off_distribution: {
    day_of_week: number;
    day_name: string;
    count: number;
  }[];
  locations_with_weekly_offs: number;
}

export interface HolidayComplianceReport {
  year: number;
  total_working_days: number;
  total_holidays: number;
  total_weekly_offs: number;
  actual_working_days: number;
  compliance_requirements: {
    minimum_holidays: number;
    mandatory_weekly_offs: number;
    compliance_percentage: number;
    is_compliant: boolean;
  };
  violations: string[];
  recommendations: string[];
}

export interface UpcomingHoliday {
  holiday_id: string;
  name: string;
  date: Date;
  type: string;
  is_optional: boolean;
  days_until: number;
  affects_locations: string[];
}

export interface HolidayImpactAnalysis {
  date: string;
  affected_employees: number;
  affected_departments: number;
  affected_locations: string[];
  estimated_productivity_impact: number;
  recommended_actions: string[];
}

export interface BulkHolidayResponse {
  successful_holidays: number;
  failed_holidays: number;
  errors: {
    row: number;
    name: string;
    error: string;
  }[];
  created_holiday_ids: string[];
}