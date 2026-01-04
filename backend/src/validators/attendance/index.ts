import Joi from 'joi';

// Attendance Record Validators
export const createAttendanceRecordSchema = Joi.object({
  employee_id: Joi.string().uuid().required().messages({
    'string.guid': 'Employee ID must be a valid UUID',
    'any.required': 'Employee ID is required'
  }),
  attendance_date: Joi.date().iso().required().messages({
    'date.base': 'Attendance date must be a valid date',
    'any.required': 'Attendance date is required'
  }),
  attendance_status_id: Joi.string().uuid().required().messages({
    'string.guid': 'Attendance status ID must be a valid UUID',
    'any.required': 'Attendance status ID is required'
  }),
  shift_id: Joi.string().uuid().optional(),
  check_in_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Check in time must be in HH:MM format'
  }),
  check_out_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Check out time must be in HH:MM format'
  }),
  break_start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Break start time must be in HH:MM format'
  }),
  break_end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Break end time must be in HH:MM format'
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  }),
  location_data: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    accuracy: Joi.number().positive().optional(),
    address: Joi.string().max(500).optional(),
    device_info: Joi.object({
      device_id: Joi.string().max(100).optional(),
      device_type: Joi.string().valid('mobile', 'desktop', 'tablet', 'biometric').optional(),
      browser: Joi.string().max(100).optional(),
      os: Joi.string().max(100).optional()
    }).optional(),
    geo_fence_id: Joi.string().uuid().optional(),
    is_within_fence: Joi.boolean().optional()
  }).optional()
});

export const updateAttendanceRecordSchema = Joi.object({
  attendance_status_id: Joi.string().uuid().optional(),
  check_in_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Check in time must be in HH:MM format'
  }),
  check_out_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Check out time must be in HH:MM format'
  }),
  break_start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Break start time must be in HH:MM format'
  }),
  break_end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().messages({
    'string.pattern.base': 'Break end time must be in HH:MM format'
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  }),
  location_data: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    accuracy: Joi.number().positive().optional(),
    address: Joi.string().max(500).optional(),
    device_info: Joi.object({
      device_id: Joi.string().max(100).optional(),
      device_type: Joi.string().valid('mobile', 'desktop', 'tablet', 'biometric').optional(),
      browser: Joi.string().max(100).optional(),
      os: Joi.string().max(100).optional()
    }).optional(),
    geo_fence_id: Joi.string().uuid().optional(),
    is_within_fence: Joi.boolean().optional()
  }).optional()
});

// Attendance Correction Validators
export const requestAttendanceCorrectionSchema = Joi.object({
  attendance_record_id: Joi.string().uuid().required().messages({
    'string.guid': 'Attendance record ID must be a valid UUID',
    'any.required': 'Attendance record ID is required'
  }),
  requested_data: Joi.object({
    attendance_status_id: Joi.string().uuid().optional(),
    check_in_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    check_out_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    break_start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    break_end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    notes: Joi.string().max(1000).optional()
  }).min(1).required().messages({
    'object.min': 'At least one field must be provided for correction',
    'any.required': 'Requested data is required'
  }),
  reason: Joi.string().min(10).max(1000).required().messages({
    'string.min': 'Reason must be at least 10 characters',
    'string.max': 'Reason cannot exceed 1000 characters',
    'any.required': 'Reason is required for correction request'
  }),
  attachment_url: Joi.string().uri().optional().messages({
    'string.uri': 'Attachment URL must be a valid URL'
  })
});

export const approveAttendanceCorrectionSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required().messages({
    'any.only': 'Action must be approve or reject',
    'any.required': 'Action is required'
  }),
  comments: Joi.string().max(1000).optional().messages({
    'string.max': 'Comments cannot exceed 1000 characters'
  }),
  rejection_reason: Joi.string().max(500).when('action', {
    is: 'reject',
    then: Joi.required().messages({
      'any.required': 'Rejection reason is required when action is reject'
    }),
    otherwise: Joi.optional()
  })
});

// Shift Template Validators
export const createShiftTemplateSchema = Joi.object({
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
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Start time must be in HH:MM format',
    'any.required': 'Start time is required'
  }),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'End time must be in HH:MM format',
    'any.required': 'End time is required'
  }),
  break_duration: Joi.number().integer().min(0).max(480).optional().default(60).messages({
    'number.min': 'Break duration cannot be negative',
    'number.max': 'Break duration cannot exceed 480 minutes (8 hours)'
  }),
  late_threshold_minutes: Joi.number().integer().min(0).max(120).optional().default(0),
  early_departure_threshold_minutes: Joi.number().integer().min(0).max(120).optional().default(0),
  is_default: Joi.boolean().optional().default(false),
  is_flexible: Joi.boolean().optional().default(false),
  work_days: Joi.array().items(
    Joi.number().integer().min(0).max(6)
  ).min(1).optional().default([1, 2, 3, 4, 5]),
  timezone: Joi.string().optional().default('UTC')
});

export const updateShiftTemplateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  code: Joi.string().alphanum().min(2).max(10).optional(),
  description: Joi.string().max(500).optional(),
  start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  break_duration: Joi.number().integer().min(0).max(480).optional(),
  late_threshold_minutes: Joi.number().integer().min(0).max(120).optional(),
  early_departure_threshold_minutes: Joi.number().integer().min(0).max(120).optional(),
  is_default: Joi.boolean().optional(),
  is_flexible: Joi.boolean().optional(),
  work_days: Joi.array().items(
    Joi.number().integer().min(0).max(6)
  ).min(1).optional(),
  timezone: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
});

// Employee Shift Validators
export const createEmployeeShiftSchema = Joi.object({
  employee_ids: Joi.array().items(
    Joi.string().uuid().messages({
      'string.guid': 'Employee ID must be a valid UUID'
    })
  ).min(1).required().messages({
    'array.min': 'At least one employee ID is required',
    'any.required': 'Employee IDs are required'
  }),
  shift_template_id: Joi.string().uuid().required().messages({
    'string.guid': 'Shift template ID must be a valid UUID',
    'any.required': 'Shift template ID is required'
  }),
  effective_from: Joi.date().iso().required().messages({
    'date.base': 'Effective from date must be a valid date',
    'any.required': 'Effective from date is required'
  }),
  effective_to: Joi.date().iso().min(Joi.ref('effective_from')).optional().messages({
    'date.min': 'Effective to date must be after effective from date'
  }),
  is_primary: Joi.boolean().optional().default(false)
});

// Attendance Status Validators
export const createAttendanceStatusSchema = Joi.object({
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
  payroll_impact: Joi.string().valid('present', 'absent', 'half_day', 'leave', 'holiday', 'weekly_off').required().messages({
    'any.only': 'Payroll impact must be present, absent, half_day, leave, holiday, or weekly_off',
    'any.required': 'Payroll impact is required'
  }),
  deduction_percentage: Joi.number().min(0).max(100).optional().default(0),
  color_code: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional().default('#10B981'),
  icon: Joi.string().max(50).optional(),
  requires_check_in: Joi.boolean().optional().default(false),
  requires_check_out: Joi.boolean().optional().default(false),
  counts_as_present: Joi.boolean().optional().default(false)
});

export const updateAttendanceStatusSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  code: Joi.string().alphanum().min(2).max(10).optional(),
  description: Joi.string().max(500).optional(),
  payroll_impact: Joi.string().valid('present', 'absent', 'half_day', 'leave', 'holiday', 'weekly_off').optional(),
  deduction_percentage: Joi.number().min(0).max(100).optional(),
  color_code: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  icon: Joi.string().max(50).optional(),
  requires_check_in: Joi.boolean().optional(),
  requires_check_out: Joi.boolean().optional(),
  counts_as_present: Joi.boolean().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
});

// Filter Validators
export const attendanceFiltersSchema = Joi.object({
  employee_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ).optional(),
  attendance_date_from: Joi.date().iso().optional(),
  attendance_date_to: Joi.date().iso().optional(),
  attendance_status_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ).optional(),
  shift_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ).optional(),
  department_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ).optional(),
  location_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.array().items(Joi.string().uuid())
  ).optional(),
  late_arrival: Joi.boolean().optional(),
  early_departure: Joi.boolean().optional(),
  correction_requested: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  sort_by: Joi.string().valid('attendance_date', 'check_in_time', 'total_working_hours', 'created_at').optional().default('attendance_date'),
  sort_order: Joi.string().valid('ASC', 'DESC').optional().default('DESC')
});

export const attendanceReportFiltersSchema = Joi.object({
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
  attendance_status_ids: Joi.array().items(Joi.string().uuid()).optional(),
  shift_ids: Joi.array().items(Joi.string().uuid()).optional(),
  report_type: Joi.string().valid('summary', 'lates', 'absences', 'overtime', 'department_summary').required().messages({
    'any.only': 'Report type must be summary, lates, absences, overtime, or department_summary',
    'any.required': 'Report type is required'
  }),
  format: Joi.string().valid('csv', 'excel', 'pdf').optional().default('csv')
});

// Bulk Operations Validators
export const bulkAttendanceSchema = Joi.object({
  records: Joi.array().items(createAttendanceRecordSchema).min(1).required().messages({
    'array.min': 'At least one attendance record is required',
    'any.required': 'Records are required'
  }),
  marked_by: Joi.string().uuid().required().messages({
    'string.guid': 'Marked by must be a valid UUID',
    'any.required': 'Marked by is required'
  }),
  notes: Joi.string().max(500).optional()
});

export const bulkAttendanceImportSchema = Joi.object({
  file_url: Joi.string().uri().required().messages({
    'string.uri': 'File URL must be a valid URL',
    'any.required': 'File URL is required'
  }),
  file_type: Joi.string().valid('csv', 'excel').required().messages({
    'any.only': 'File type must be csv or excel',
    'any.required': 'File type is required'
  }),
  marked_by: Joi.string().uuid().required().messages({
    'string.guid': 'Marked by must be a valid UUID',
    'any.required': 'Marked by is required'
  }),
  notes: Joi.string().max(500).optional()
});

// Validation helpers
export const validateTimeRange = (checkIn?: string, checkOut?: string, breakStart?: string, breakEnd?: string) => {
  if (checkIn && checkOut) {
    const inTime = new Date(`2000-01-01T${checkIn}:00`);
    const outTime = new Date(`2000-01-01T${checkOut}:00`);
    
    if (outTime <= inTime) {
      return 'Check out time must be after check in time';
    }
  }

  if (breakStart && breakEnd) {
    const startTime = new Date(`2000-01-01T${breakStart}:00`);
    const endTime = new Date(`2000-01-01T${breakEnd}:00`);
    
    if (endTime <= startTime) {
      return 'Break end time must be after break start time';
    }
  }

  if (checkIn && breakStart && breakEnd) {
    const inTime = new Date(`2000-01-01T${checkIn}:00`);
    const breakStartTime = new Date(`2000-01-01T${breakStart}:00`);
    const breakEndTime = new Date(`2000-01-01T${breakEnd}:00`);
    
    if (breakStartTime <= inTime) {
      return 'Break start time must be after check in time';
    }
    
    if (breakEndTime <= breakStartTime) {
      return 'Break end time must be after break start time';
    }
  }

  if (checkOut && breakEnd) {
    const outTime = new Date(`2000-01-01T${checkOut}:00`);
    const breakEndTime = new Date(`2000-01-01T${breakEnd}:00`);
    
    if (breakEndTime >= outTime) {
      return 'Break end time must be before check out time';
    }
  }

  return null;
};

export const validateWorkingHours = (checkIn?: string, checkOut?: string, breakDuration: number = 60) => {
  if (!checkIn || !checkOut) {
    return null;
  }

  const inTime = new Date(`2000-01-01T${checkIn}:00`);
  const outTime = new Date(`2000-01-01T${checkOut}:00`);
  
  const totalMinutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
  const workingMinutes = totalMinutes - breakDuration;
  
  if (workingMinutes < 0) {
    return 'Working hours cannot be negative';
  }
  
  if (workingMinutes > 24 * 60) {
    return 'Working hours cannot exceed 24 hours';
  }

  return null;
};

export const validateAttendanceDate = (attendanceDate: string) => {
  const date = new Date(attendanceDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const maxPastDate = new Date(today);
  maxPastDate.setDate(maxPastDate.getDate() - 90); // 90 days max in past
  
  if (date > today) {
    return 'Cannot mark attendance for future dates';
  }
  
  if (date < maxPastDate) {
    return 'Cannot mark attendance more than 90 days in the past';
  }

  return null;
};

export const validateShiftTimes = (startTime: string, endTime: string) => {
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  
  if (end <= start) {
    return 'End time must be after start time';
  }
  
  const hoursDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (hoursDiff < 1) {
    return 'Shift duration must be at least 1 hour';
  }
  
  if (hoursDiff > 16) {
    return 'Shift duration cannot exceed 16 hours';
  }

  return null;
};

export const validateLateArrival = (checkInTime: string, shiftStartTime: string, thresholdMinutes: number = 0) => {
  const checkIn = new Date(`2000-01-01T${checkInTime}:00`);
  const shiftStart = new Date(`2000-01-01T${shiftStartTime}:00`);
  
  const diffMinutes = (checkIn.getTime() - shiftStart.getTime()) / (1000 * 60);
  
  return diffMinutes > thresholdMinutes;
};

export const validateEarlyDeparture = (checkOutTime: string, shiftEndTime: string, thresholdMinutes: number = 0) => {
  const checkOut = new Date(`2000-01-01T${checkOutTime}:00`);
  const shiftEnd = new Date(`2000-01-01T${shiftEndTime}:00`);
  
  const diffMinutes = (shiftEnd.getTime() - checkOut.getTime()) / (1000 * 60);
  
  return diffMinutes > thresholdMinutes;
};