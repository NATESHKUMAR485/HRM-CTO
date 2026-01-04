import Joi from 'joi';

// Leave Request Validators
export const createLeaveRequestSchema = Joi.object({
  leave_type_id: Joi.string().uuid().required().messages({
    'string.guid': 'Leave type ID must be a valid UUID',
    'any.required': 'Leave type ID is required'
  }),
  from_date: Joi.date().iso().required().messages({
    'date.base': 'From date must be a valid date',
    'any.required': 'From date is required'
  }),
  to_date: Joi.date().iso().min(Joi.ref('from_date')).required().messages({
    'date.base': 'To date must be a valid date',
    'date.min': 'To date must be after or equal to from date',
    'any.required': 'To date is required'
  }),
  half_day_type: Joi.string().valid('first_half', 'second_half').optional().messages({
    'any.only': 'Half day type must be either first_half or second_half'
  }),
  reason: Joi.string().max(1000).optional().messages({
    'string.max': 'Reason cannot exceed 1000 characters'
  }),
  emergency_contact: Joi.string().max(100).optional().messages({
    'string.max': 'Emergency contact cannot exceed 100 characters'
  }),
  is_retroactive: Joi.boolean().optional().default(false),
  retroactive_reason: Joi.string().max(500).when('is_retroactive', {
    is: true,
    then: Joi.required().messages({
      'any.required': 'Retroactive reason is required for retroactive requests'
    }),
    otherwise: Joi.optional()
  })
});

export const updateLeaveRequestSchema = Joi.object({
  from_date: Joi.date().iso().optional(),
  to_date: Joi.date().iso().min(Joi.ref('from_date')).optional().messages({
    'date.min': 'To date must be after or equal to from date'
  }),
  half_day_type: Joi.string().valid('first_half', 'second_half').optional(),
  reason: Joi.string().max(1000).optional().messages({
    'string.max': 'Reason cannot exceed 1000 characters'
  }),
  emergency_contact: Joi.string().max(100).optional().messages({
    'string.max': 'Emergency contact cannot exceed 100 characters'
  })
});

export const approveLeaveRequestSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject', 'forward').required().messages({
    'any.only': 'Action must be approve, reject, or forward',
    'any.required': 'Action is required'
  }),
  comments: Joi.string().max(1000).optional().messages({
    'string.max': 'Comments cannot exceed 1000 characters'
  }),
  forwarded_to_id: Joi.string().uuid().when('action', {
    is: 'forward',
    then: Joi.required().messages({
      'any.required': 'Forwarded to ID is required when action is forward'
    }),
    otherwise: Joi.optional()
  })
});

// Leave Allocation Validators
export const createLeaveAllocationSchema = Joi.object({
  employee_ids: Joi.array().items(
    Joi.string().uuid().messages({
      'string.guid': 'Employee ID must be a valid UUID'
    })
  ).min(1).required().messages({
    'array.min': 'At least one employee ID is required',
    'any.required': 'Employee IDs are required'
  }),
  leave_type_id: Joi.string().uuid().required().messages({
    'string.guid': 'Leave type ID must be a valid UUID',
    'any.required': 'Leave type ID is required'
  }),
  allocation_year: Joi.number().integer().min(2020).max(2100).required().messages({
    'number.min': 'Allocation year must be 2020 or later',
    'number.max': 'Allocation year cannot exceed 2100',
    'any.required': 'Allocation year is required'
  }),
  allocated_amount: Joi.number().positive().required().messages({
    'number.positive': 'Allocated amount must be greater than 0',
    'any.required': 'Allocated amount is required'
  }),
  effective_from: Joi.date().iso().required().messages({
    'date.base': 'Effective from date must be a valid date',
    'any.required': 'Effective from date is required'
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

export const updateLeaveAllocationSchema = Joi.object({
  allocated_amount: Joi.number().positive().optional().messages({
    'number.positive': 'Allocated amount must be greater than 0'
  }),
  effective_from: Joi.date().iso().optional(),
  effective_to: Joi.date().iso().min(Joi.ref('effective_from')).optional().messages({
    'date.min': 'Effective to date must be after effective from date'
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

// Leave Type Validators
export const createLeaveTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required'
  }),
  code: Joi.string().alphanum().min(2).max(10).required().messages({
    'string.alphanum': 'Code must contain only alphanumeric characters',
    'string.min': 'Code must be at least 2 characters',
    'string.max': 'Code cannot exceed 10 characters',
    'any.required': 'Code is required'
  }),
  description: Joi.string().max(500).optional().messages({
    'string.max': 'Description cannot exceed 500 characters'
  }),
  accrual_type: Joi.string().valid('yearly', 'monthly', 'quarterly').required().messages({
    'any.only': 'Accrual type must be yearly, monthly, or quarterly',
    'any.required': 'Accrual type is required'
  }),
  allocation_value: Joi.number().min(0).required().messages({
    'number.min': 'Allocation value cannot be negative',
    'any.required': 'Allocation value is required'
  }),
  carry_over_allowed: Joi.boolean().optional().default(false),
  max_carry_over: Joi.number().min(0).when('carry_over_allowed', {
    is: true,
    then: Joi.required().messages({
      'any.required': 'Max carry over is required when carry over is allowed'
    }),
    otherwise: Joi.optional()
  }),
  encashment_allowed: Joi.boolean().optional().default(false),
  encashment_rate: Joi.number().min(0).when('encashment_allowed', {
    is: true,
    then: Joi.required().messages({
      'any.required': 'Encashment rate is required when encashment is allowed'
    }),
    otherwise: Joi.optional()
  }),
  min_notice_days: Joi.number().integer().min(0).optional().default(0),
  max_consecutive_days: Joi.number().integer().min(1).optional(),
  approval_required: Joi.boolean().optional().default(true),
  approval_levels: Joi.number().integer().min(1).max(5).optional().default(1),
  probation_restriction: Joi.boolean().optional().default(true),
  half_day_allowed: Joi.boolean().optional().default(true),
  can_be_planned: Joi.boolean().optional().default(true),
  can_be_emergency: Joi.boolean().optional().default(true),
  requires_attachment: Joi.boolean().optional().default(false),
  color_code: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional().default('#3B82F6')
});

export const updateLeaveTypeSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  code: Joi.string().alphanum().min(2).max(10).optional(),
  description: Joi.string().max(500).optional(),
  accrual_type: Joi.string().valid('yearly', 'monthly', 'quarterly').optional(),
  allocation_value: Joi.number().min(0).optional(),
  carry_over_allowed: Joi.boolean().optional(),
  max_carry_over: Joi.number().min(0).optional(),
  encashment_allowed: Joi.boolean().optional(),
  encashment_rate: Joi.number().min(0).optional(),
  min_notice_days: Joi.number().integer().min(0).optional(),
  max_consecutive_days: Joi.number().integer().min(1).optional(),
  approval_required: Joi.boolean().optional(),
  approval_levels: Joi.number().integer().min(1).max(5).optional(),
  probation_restriction: Joi.boolean().optional(),
  half_day_allowed: Joi.boolean().optional(),
  can_be_planned: Joi.boolean().optional(),
  can_be_emergency: Joi.boolean().optional(),
  requires_attachment: Joi.boolean().optional(),
  color_code: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  status: Joi.string().valid('active', 'inactive').optional()
});

// Leave Encashment Validators
export const createLeaveEncashmentSchema = Joi.object({
  leave_type_id: Joi.string().uuid().required().messages({
    'string.guid': 'Leave type ID must be a valid UUID',
    'any.required': 'Leave type ID is required'
  }),
  requested_days: Joi.number().positive().required().messages({
    'number.positive': 'Requested days must be greater than 0',
    'any.required': 'Requested days is required'
  }),
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Reason cannot exceed 500 characters'
  })
});

export const updateLeaveEncashmentSchema = Joi.object({
  approved_days: Joi.number().min(0).optional(),
  daily_rate: Joi.number().positive().optional(),
  status: Joi.string().valid('approved', 'rejected', 'processed').optional(),
  rejection_reason: Joi.string().max(500).when('status', {
    is: 'rejected',
    then: Joi.required().messages({
      'any.required': 'Rejection reason is required when status is rejected'
    }),
    otherwise: Joi.optional()
  })
});

// Filter Validators
export const leaveRequestFiltersSchema = Joi.object({
  status: Joi.alternatives().try(
    Joi.string().valid('pending', 'approved', 'rejected', 'cancelled'),
    Joi.array().items(Joi.string().valid('pending', 'approved', 'rejected', 'cancelled'))
  ).optional(),
  leave_type_id: Joi.string().uuid().optional(),
  employee_id: Joi.string().uuid().optional(),
  from_date: Joi.date().iso().optional(),
  to_date: Joi.date().iso().optional(),
  department_id: Joi.string().uuid().optional(),
  location_id: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  sort_by: Joi.string().valid('submitted_at', 'from_date', 'to_date', 'total_days', 'created_at').optional().default('submitted_at'),
  sort_order: Joi.string().valid('ASC', 'DESC').optional().default('DESC')
});

export const leaveBalanceFiltersSchema = Joi.object({
  employee_id: Joi.string().uuid().optional(),
  leave_type_id: Joi.string().uuid().optional(),
  year: Joi.number().integer().min(2020).max(2100).optional()
});

export const leaveReportFiltersSchema = Joi.object({
  from_date: Joi.date().iso().required().messages({
    'date.base': 'From date must be a valid date',
    'any.required': 'From date is required'
  }),
  to_date: Joi.date().iso().min(Joi.ref('from_date')).required().messages({
    'date.base': 'To date must be a valid date',
    'date.min': 'To date must be after from date',
    'any.required': 'To date is required'
  }),
  employee_ids: Joi.array().items(Joi.string().uuid()).optional(),
  department_ids: Joi.array().items(Joi.string().uuid()).optional(),
  location_ids: Joi.array().items(Joi.string().uuid()).optional(),
  leave_type_ids: Joi.array().items(Joi.string().uuid()).optional(),
  report_type: Joi.string().valid('balance', 'utilization', 'compliance', 'transactions').required().messages({
    'any.only': 'Report type must be balance, utilization, compliance, or transactions',
    'any.required': 'Report type is required'
  }),
  format: Joi.string().valid('csv', 'excel', 'pdf').optional().default('csv')
});

// Bulk Operations Validators
export const bulkLeaveAllocationSchema = Joi.object({
  allocations: Joi.array().items(createLeaveAllocationSchema).min(1).required().messages({
    'array.min': 'At least one allocation is required',
    'any.required': 'Allocations are required'
  })
});

export const bulkLeaveStatusUpdateSchema = Joi.object({
  request_ids: Joi.array().items(Joi.string().uuid()).min(1).required().messages({
    'array.min': 'At least one request ID is required',
    'any.required': 'Request IDs are required'
  }),
  status: Joi.string().valid('approved', 'rejected', 'cancelled').required().messages({
    'any.only': 'Status must be approved, rejected, or cancelled',
    'any.required': 'Status is required'
  }),
  comments: Joi.string().max(1000).optional()
});

// Validation helpers
export const validateDateRange = (fromDate: string, toDate: string) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (from > to) {
    return 'From date must be before or equal to to date';
  }

  if (from < new Date(today.getFullYear() - 1, 0, 1)) {
    return 'From date cannot be more than 1 year in the past';
  }

  if (to > new Date(today.getFullYear() + 1, 11, 31)) {
    return 'To date cannot be more than 1 year in the future';
  }

  return null;
};

export const validateLeaveBalance = (allocated: number, used: number, requested: number, carriedOver: number = 0) => {
  const available = allocated + carriedOver - used;
  if (requested > available) {
    return `Insufficient leave balance. Available: ${available} days, Requested: ${requested} days`;
  }
  return null;
};

export const validateWorkingDays = (fromDate: string, toDate: string, employeeId: string, excludeLeave: boolean = true) => {
  // This would integrate with the holiday/working days calculation service
  // For now, return a placeholder validation
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  
  if (diffDays > 365) {
    return 'Leave period cannot exceed 365 days';
  }

  return null;
};