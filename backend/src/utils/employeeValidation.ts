import Joi from 'joi';

// Base schemas
export const uuidSchema = Joi.string().uuid().required();

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().valid('first_name', 'last_name', 'employee_number', 'hire_date', 'status', 'department_id').optional(),
  sort_order: Joi.string().valid('asc', 'desc').default('asc'),
});

// Department validation schemas
export const createDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(1000).optional(),
  parent_department_id: uuidSchema.optional(),
  manager_id: uuidSchema.optional(),
  budget: Joi.number().min(0).optional(),
});

export const updateDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().max(1000).optional(),
  parent_department_id: uuidSchema.optional(),
  manager_id: uuidSchema.optional(),
  budget: Joi.number().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
});

// Employee validation schemas
export const addressSchema = Joi.object({
  street: Joi.string().trim().max(255).optional(),
  city: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  zip_code: Joi.string().trim().max(20).optional(),
  country: Joi.string().trim().max(100).optional(),
});

export const emergencyContactSchema = Joi.object({
  name: Joi.string().trim().max(255).optional(),
  relationship: Joi.string().trim().max(100).optional(),
  phone: Joi.string().trim().max(20).optional(),
  email: Joi.string().email().optional(),
});

export const createEmployeeSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).required(),
  last_name: Joi.string().trim().min(1).max(100).required(),
  middle_name: Joi.string().trim().max(100).optional(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().max(20).optional(),
  mobile: Joi.string().trim().max(20).optional(),
  date_of_birth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'separated').optional(),
  nationality: Joi.string().trim().max(100).optional(),
  national_id: Joi.string().trim().max(50).optional(),
  passport_number: Joi.string().trim().max(50).optional(),
  address: addressSchema.optional(),
  emergency_contact: emergencyContactSchema.optional(),
  department_id: uuidSchema.optional(),
  position: Joi.string().trim().max(255).optional(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern', 'consultant').default('full_time'),
  hire_date: Joi.date().max('now').required(),
  probation_end_date: Joi.date().greater(Joi.ref('hire_date')).optional(),
});

export const updateEmployeeSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).optional(),
  last_name: Joi.string().trim().min(1).max(100).optional(),
  middle_name: Joi.string().trim().max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().trim().max(20).optional(),
  mobile: Joi.string().trim().max(20).optional(),
  date_of_birth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').optional(),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'separated').optional(),
  nationality: Joi.string().trim().max(100).optional(),
  national_id: Joi.string().trim().max(50).optional(),
  passport_number: Joi.string().trim().max(50).optional(),
  address: addressSchema.optional(),
  emergency_contact: emergencyContactSchema.optional(),
  department_id: uuidSchema.optional(),
  position: Joi.string().trim().max(255).optional(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern', 'consultant').optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'terminated', 'pending').optional(),
  probation_end_date: Joi.date().optional(),
});

// Employee status change schemas
export const terminateEmployeeSchema = Joi.object({
  termination_date: Joi.date().max('now').required(),
  termination_reason: Joi.string().trim().min(1).max(500).required(),
});

export const activateEmployeeSchema = Joi.object({
  reason: Joi.string().trim().max(500).optional(),
});

export const suspendEmployeeSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).required(),
  suspension_end_date: Joi.date().min('now').optional(),
});

// Employee allowance schemas
export const createEmployeeAllowanceSchema = Joi.object({
  allowance_type: Joi.string().trim().min(1).max(100).required(),
  amount: Joi.number().positive().required(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'annually', 'one_time').default('monthly'),
  effective_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('effective_date')).optional(),
  is_taxable: Joi.boolean().default(true),
  description: Joi.string().trim().max(500).optional(),
});

export const updateEmployeeAllowanceSchema = Joi.object({
  allowance_type: Joi.string().trim().min(1).max(100).optional(),
  amount: Joi.number().positive().optional(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'annually', 'one_time').optional(),
  effective_date: Joi.date().optional(),
  end_date: Joi.date().greater(Joi.ref('effective_date')).optional(),
  is_taxable: Joi.boolean().optional(),
  description: Joi.string().trim().max(500).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
});

// Employee deduction schemas
export const createEmployeeDeductionSchema = Joi.object({
  deduction_type: Joi.string().trim().min(1).max(100).required(),
  amount: Joi.number().positive().required(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'annually', 'one_time').default('monthly'),
  effective_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('effective_date')).optional(),
  description: Joi.string().trim().max(500).optional(),
});

export const updateEmployeeDeductionSchema = Joi.object({
  deduction_type: Joi.string().trim().min(1).max(100).optional(),
  amount: Joi.number().positive().optional(),
  frequency: Joi.string().valid('monthly', 'quarterly', 'annually', 'one_time').optional(),
  effective_date: Joi.date().optional(),
  end_date: Joi.date().greater(Joi.ref('effective_date')).optional(),
  description: Joi.string().trim().max(500).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
});

// Employee bank details schemas (unencrypted for input)
export const createEmployeeBankDetailsSchema = Joi.object({
  bank_name: Joi.string().trim().min(1).max(255).required(),
  account_number: Joi.string().trim().min(1).max(100).required(),
  account_holder_name: Joi.string().trim().min(1).max(255).required(),
  routing_number: Joi.string().trim().max(50).optional(),
  swift_code: Joi.string().trim().max(20).optional(),
  bank_address: addressSchema.optional(),
  is_primary: Joi.boolean().default(true),
});

// Employee tax info schemas (unencrypted for input)
export const createEmployeeTaxInfoSchema = Joi.object({
  tax_filing_status: Joi.string().trim().min(1).max(50).required(),
  tax_id: Joi.string().trim().max(100).optional(),
  withholding_rate: Joi.number().min(0).max(1).default(0),
  additional_withholding: Joi.number().min(0).default(0),
  dependents_count: Joi.number().integer().min(0).default(0),
  tax_exemptions: Joi.array().items(Joi.string()).default([]),
  tax_state: Joi.string().trim().max(100).optional(),
  tax_country: Joi.string().trim().max(100).default('United States'),
  effective_date: Joi.date().default('now'),
});

// Employee skill schemas
export const createEmployeeSkillSchema = Joi.object({
  skill_name: Joi.string().trim().min(1).max(255).required(),
  proficiency_level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').required(),
  years_of_experience: Joi.number().integer().min(0).default(0),
  certification_required: Joi.boolean().default(false),
  last_used_date: Joi.date().max('now').optional(),
  notes: Joi.string().trim().max(1000).optional(),
});

export const updateEmployeeSkillSchema = Joi.object({
  skill_name: Joi.string().trim().min(1).max(255).optional(),
  proficiency_level: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional(),
  years_of_experience: Joi.number().integer().min(0).optional(),
  certification_required: Joi.boolean().optional(),
  last_used_date: Joi.date().max('now').optional(),
  notes: Joi.string().trim().max(1000).optional(),
});

// Employee certification schemas
export const createEmployeeCertificationSchema = Joi.object({
  certification_name: Joi.string().trim().min(1).max(255).required(),
  issuing_organization: Joi.string().trim().min(1).max(255).required(),
  certificate_number: Joi.string().trim().max(100).optional(),
  issue_date: Joi.date().max('now').required(),
  expiry_date: Joi.date().greater(Joi.ref('issue_date')).optional(),
  verification_status: Joi.string().valid('pending', 'verified', 'rejected').default('pending'),
  document_url: Joi.string().uri().optional(),
});

export const updateEmployeeCertificationSchema = Joi.object({
  certification_name: Joi.string().trim().min(1).max(255).optional(),
  issuing_organization: Joi.string().trim().min(1).max(255).optional(),
  certificate_number: Joi.string().trim().max(100).optional(),
  issue_date: Joi.date().max('now').optional(),
  expiry_date: Joi.date().optional(),
  verification_status: Joi.string().valid('pending', 'verified', 'rejected').optional(),
  document_url: Joi.string().uri().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
});

// Employee document schemas
export const createEmployeeDocumentSchema = Joi.object({
  document_type: Joi.string().trim().min(1).max(100).required(),
  file_name: Joi.string().trim().min(1).max(255).required(),
  file_path: Joi.string().trim().min(1).required(),
  file_size: Joi.number().positive().required(),
  mime_type: Joi.string().trim().min(1).max(100).required(),
  tags: Joi.array().items(Joi.string()).default([]),
  description: Joi.string().trim().max(1000).optional(),
});

// Employee benefit schemas
export const createEmployeeBenefitSchema = Joi.object({
  benefit_type: Joi.string().trim().min(1).max(100).required(),
  benefit_name: Joi.string().trim().min(1).max(255).required(),
  provider: Joi.string().trim().max(255).optional(),
  plan_details: Joi.object().default({}),
  coverage_start_date: Joi.date().required(),
  coverage_end_date: Joi.date().greater(Joi.ref('coverage_start_date')).optional(),
  employee_contribution: Joi.number().min(0).default(0),
  employer_contribution: Joi.number().min(0).default(0),
  enrollment_status: Joi.string().valid('enrolled', 'declined', 'pending', 'waived').default('enrolled'),
});

export const updateEmployeeBenefitSchema = Joi.object({
  benefit_type: Joi.string().trim().min(1).max(100).optional(),
  benefit_name: Joi.string().trim().min(1).max(255).optional(),
  provider: Joi.string().trim().max(255).optional(),
  plan_details: Joi.object().optional(),
  coverage_start_date: Joi.date().optional(),
  coverage_end_date: Joi.date().optional(),
  employee_contribution: Joi.number().min(0).optional(),
  employer_contribution: Joi.number().min(0).optional(),
  enrollment_status: Joi.string().valid('enrolled', 'declined', 'pending', 'waived').optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
});

// Employee salary history schemas
export const createEmployeeSalaryHistorySchema = Joi.object({
  base_salary: Joi.number().positive().required(),
  currency: Joi.string().trim().length(3).default('USD'),
  effective_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('effective_date')).optional(),
  change_reason: Joi.string().trim().max(255).optional(),
  change_type: Joi.string().valid('increase', 'decrease', 'promotion', 'demotion').default('increase'),
});

export const salaryChangeRequestSchema = Joi.object({
  base_salary: Joi.number().positive().required(),
  currency: Joi.string().trim().length(3).default('USD'),
  effective_date: Joi.date().min('now').required(),
  change_reason: Joi.string().trim().min(1).max(255).required(),
  change_type: Joi.string().valid('increase', 'decrease', 'promotion', 'demotion').default('increase'),
  approval_notes: Joi.string().trim().max(1000).optional(),
});

export const approvalSchema = Joi.object({
  approval_notes: Joi.string().trim().max(1000).optional(),
});

// Employee search filters schema
export const employeeSearchFiltersSchema = Joi.object({
  search: Joi.string().trim().max(255).optional(),
  department_id: uuidSchema.optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'terminated', 'pending').optional(),
  employment_type: Joi.string().valid('full_time', 'part_time', 'contract', 'intern', 'consultant').optional(),
  hire_date_from: Joi.date().optional(),
  hire_date_to: Joi.date().optional(),
  salary_min: Joi.number().min(0).optional(),
  salary_max: Joi.number().min(0).optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  location: Joi.string().trim().max(100).optional(),
});

// Bulk operations schema
export const bulkOperationSchema = Joi.object({
  employee_ids: Joi.array().items(uuidSchema).min(1).required(),
  action: Joi.string().valid('update_status', 'transfer_department', 'update_employment_type').required(),
  parameters: Joi.object().optional(),
});

export const bulkImportSchema = Joi.object({
  data: Joi.array().items(createEmployeeSchema).min(1).required(),
  update_existing: Joi.boolean().default(false),
});

// Employment history schema
export const employmentHistoryEventSchema = Joi.object({
  event_type: Joi.string().valid('hire', 'transfer', 'promotion', 'demotion', 'suspension', 'termination', 'probation_completion').required(),
  event_date: Joi.date().max('now').required(),
  reason: Joi.string().trim().max(1000).optional(),
  new_value: Joi.object().optional(),
});