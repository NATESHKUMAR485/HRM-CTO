import { Request } from 'express';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  HR_MANAGER = 'hr_manager',
  EMPLOYEE = 'employee',
}

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  subscription_plan: SubscriptionPlan;
  status: TenantStatus;
  created_at: Date;
  updated_at: Date;
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  features_enabled: {
    payroll?: boolean;
    attendance?: boolean;
    leave?: boolean;
    recruitment?: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenant_id: string | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: string;
  tenant_id: string | null;
  name: string;
  permissions: Record<string, boolean>;
  created_at: Date;
  updated_at: Date;
}

export interface UserRoleMapping {
  id: string;
  user_id: string;
  role_id: string;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  changes: Record<string, any>;
  ip_address: string;
  created_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  tenantId: string | null;
  email: string;
  role: UserRole;
}

export interface RequestContext {
  userId: string;
  tenantId: string | null;
  role: UserRole;
  ipAddress: string;
}

export interface AuthenticatedRequest extends Request {
  context?: RequestContext;
  tenant?: Tenant;
}

// Employee Management Types

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  CONSULTANT = 'consultant',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING = 'pending',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  SEPARATED = 'separated',
}

export enum SkillProficiency {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum EnrollmentStatus {
  ENROLLED = 'enrolled',
  DECLINED = 'declined',
  PENDING = 'pending',
  WAIVED = 'waived',
}

export enum SalaryChangeType {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  PROMOTION = 'promotion',
  DEMOTION = 'demotion',
}

export enum EmploymentEventType {
  HIRE = 'hire',
  TRANSFER = 'transfer',
  PROMOTION = 'promotion',
  DEMOTION = 'demotion',
  SUSPENSION = 'suspension',
  TERMINATION = 'termination',
  PROBATION_COMPLETION = 'probation_completion',
}

export interface Department {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  parent_department_id?: string;
  manager_id?: string;
  budget?: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface Employee {
  id: string;
  tenant_id: string;
  employee_number: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  date_of_birth?: Date;
  gender?: Gender;
  marital_status?: MaritalStatus;
  nationality?: string;
  national_id?: string;
  passport_number?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
  };
  emergency_contact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    email?: string;
  };
  photo_url?: string;
  department_id?: string;
  position?: string;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  hire_date: Date;
  probation_end_date?: Date;
  termination_date?: Date;
  termination_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeAllowance {
  id: string;
  tenant_id: string;
  employee_id: string;
  allowance_type: string;
  amount: number;
  frequency: string;
  effective_date: Date;
  end_date?: Date;
  is_taxable: boolean;
  description?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeDeduction {
  id: string;
  tenant_id: string;
  employee_id: string;
  deduction_type: string;
  amount: number;
  frequency: string;
  effective_date: Date;
  end_date?: Date;
  description?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeBankDetails {
  id: string;
  tenant_id: string;
  employee_id: string;
  bank_name: string;
  account_number_encrypted: string;
  account_holder_name: string;
  routing_number?: string;
  swift_code?: string;
  bank_address?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
  };
  is_primary: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeTaxInfo {
  id: string;
  tenant_id: string;
  employee_id: string;
  tax_filing_status: string;
  tax_id_encrypted?: string;
  withholding_rate: number;
  additional_withholding: number;
  dependents_count: number;
  tax_exemptions: any[];
  tax_state?: string;
  tax_country: string;
  effective_date: Date;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeSkill {
  id: string;
  tenant_id: string;
  employee_id: string;
  skill_name: string;
  proficiency_level: SkillProficiency;
  years_of_experience: number;
  certification_required: boolean;
  last_used_date?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeCertification {
  id: string;
  tenant_id: string;
  employee_id: string;
  certification_name: string;
  issuing_organization: string;
  certificate_number?: string;
  issue_date: Date;
  expiry_date?: Date;
  verification_status: VerificationStatus;
  document_url?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeDocument {
  id: string;
  tenant_id: string;
  employee_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  version: number;
  is_latest_version: boolean;
  uploaded_by?: string;
  tags: string[];
  description?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeBenefit {
  id: string;
  tenant_id: string;
  employee_id: string;
  benefit_type: string;
  benefit_name: string;
  provider?: string;
  plan_details: Record<string, any>;
  coverage_start_date: Date;
  coverage_end_date?: Date;
  employee_contribution: number;
  employer_contribution: number;
  enrollment_status: EnrollmentStatus;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeSalaryHistory {
  id: string;
  tenant_id: string;
  employee_id: string;
  base_salary: number;
  currency: string;
  effective_date: Date;
  end_date?: Date;
  change_reason?: string;
  change_type: SalaryChangeType;
  approved_by?: string;
  approval_date?: Date;
  approval_notes?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeEmploymentHistory {
  id: string;
  tenant_id: string;
  employee_id: string;
  event_type: EmploymentEventType;
  event_date: Date;
  previous_value: Record<string, any>;
  new_value: Record<string, any>;
  reason?: string;
  initiated_by?: string;
  approved_by?: string;
  approval_date?: Date;
  approval_notes?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeAuditLog {
  id: string;
  tenant_id: string;
  employee_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  changed_by?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface EmployeeSearchFilters {
  search?: string;
  department_id?: string;
  status?: EmployeeStatus;
  employment_type?: EmploymentType;
  hire_date_from?: Date;
  hire_date_to?: Date;
  salary_min?: number;
  salary_max?: number;
  skills?: string[];
  location?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
}

export interface ExpiringCertification {
  employee_id: string;
  employee_name: string;
  certification_name: string;
  expiry_date: Date;
  days_until_expiry: number;
}
