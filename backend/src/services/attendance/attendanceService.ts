import { pool } from '../../config/database';
import { AttendanceRecord, AttendanceStatus, ShiftTemplate, EmployeeShift, AttendanceGeolocation } from '../../types/attendance';
import { validateTimeRange, validateWorkingHours, validateAttendanceDate, validateShiftTimes, validateLateArrival, validateEarlyDeparture } from '../../validators/attendance';
import { v4 as uuidv4 } from 'uuid';

export class AttendanceService {

  // =============================================
  // ATTENDANCE RECORDS MANAGEMENT
  // =============================================

  async getAttendanceRecords(tenantId: string, filters: any = {}): Promise<{ data: AttendanceRecord[]; total: number }> {
    const {
      employee_id,
      attendance_date_from,
      attendance_date_to,
      attendance_status_id,
      shift_id,
      department_id,
      location_id,
      late_arrival,
      early_departure,
      correction_requested,
      page = 1,
      limit = 20,
      sort_by = 'attendance_date',
      sort_order = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT ar.*, 
        ast.name as attendance_status_name, ast.code as attendance_status_code,
        st.name as shift_name, st.code as shift_code,
        e.first_name, e.last_name, e.employee_number,
        d.name as department_name
      FROM attendance_records ar
      JOIN attendance_statuses ast ON ar.attendance_status_id = ast.id
      JOIN employees e ON ar.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shift_templates st ON ar.shift_id = st.id
      WHERE ar.tenant_id = $1
    `;

    const values: any[] = [tenantId];
    let paramCount = 2;

    if (employee_id) {
      if (Array.isArray(employee_id)) {
        query += ` AND ar.employee_id = ANY($${paramCount})`;
        values.push(employee_id);
      } else {
        query += ` AND ar.employee_id = $${paramCount}`;
        values.push(employee_id);
      }
      paramCount++;
    }

    if (attendance_date_from) {
      query += ` AND ar.attendance_date >= $${paramCount}`;
      values.push(attendance_date_from);
      paramCount++;
    }

    if (attendance_date_to) {
      query += ` AND ar.attendance_date <= $${paramCount}`;
      values.push(attendance_date_to);
      paramCount++;
    }

    if (attendance_status_id) {
      if (Array.isArray(attendance_status_id)) {
        query += ` AND ar.attendance_status_id = ANY($${paramCount})`;
        values.push(attendance_status_id);
      } else {
        query += ` AND ar.attendance_status_id = $${paramCount}`;
        values.push(attendance_status_id);
      }
      paramCount++;
    }

    if (shift_id) {
      if (Array.isArray(shift_id)) {
        query += ` AND ar.shift_id = ANY($${paramCount})`;
        values.push(shift_id);
      } else {
        query += ` AND ar.shift_id = $${paramCount}`;
        values.push(shift_id);
      }
      paramCount++;
    }

    if (late_arrival !== undefined) {
      query += ` AND ar.late_arrival = $${paramCount}`;
      values.push(late_arrival);
      paramCount++;
    }

    if (early_departure !== undefined) {
      query += ` AND ar.early_departure = $${paramCount}`;
      values.push(early_departure);
      paramCount++;
    }

    if (correction_requested !== undefined) {
      query += ` AND ar.correction_requested = $${paramCount}`;
      values.push(correction_requested);
      paramCount++;
    }

    query += ` ORDER BY ar.${sort_by} ${sort_order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM attendance_records ar
      WHERE ar.tenant_id = $1
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, [tenantId])
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async getAttendanceRecordById(tenantId: string, recordId: string): Promise<AttendanceRecord | null> {
    const query = `
      SELECT ar.*, 
        ast.name as attendance_status_name, ast.code as attendance_status_code,
        st.name as shift_name, st.code as shift_code,
        e.first_name, e.last_name, e.employee_number,
        d.name as department_name
      FROM attendance_records ar
      JOIN attendance_statuses ast ON ar.attendance_status_id = ast.id
      JOIN employees e ON ar.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shift_templates st ON ar.shift_id = st.id
      WHERE ar.tenant_id = $1 AND ar.id = $2
    `;

    const result = await pool.query(query, [tenantId, recordId]);
    return result.rows[0] || null;
  }

  async createAttendanceRecord(tenantId: string, recordData: any, markedBy: string): Promise<AttendanceRecord> {
    const {
      employee_id,
      attendance_date,
      attendance_status_id,
      shift_id,
      check_in_time,
      check_out_time,
      break_start_time,
      break_end_time,
      notes,
      location_data
    } = recordData;

    // Validate attendance date
    const dateValidation = validateAttendanceDate(attendance_date);
    if (dateValidation) {
      throw new Error(dateValidation);
    }

    // Validate time ranges
    const timeValidation = validateTimeRange(check_in_time, check_out_time, break_start_time, break_end_time);
    if (timeValidation) {
      throw new Error(timeValidation);
    }

    // Validate working hours
    const workingHoursValidation = validateWorkingHours(check_in_time, check_out_time);
    if (workingHoursValidation) {
      throw new Error(workingHoursValidation);
    }

    // Check for existing record
    const existingQuery = `
      SELECT id FROM attendance_records 
      WHERE tenant_id = $1 AND employee_id = $2 AND attendance_date = $3
    `;

    const existing = await pool.query(existingQuery, [tenantId, employee_id, attendance_date]);
    if (existing.rows.length > 0) {
      throw new Error('Attendance record already exists for this employee and date');
    }

    // Calculate late arrival and early departure
    let lateArrival = false;
    let earlyDeparture = false;
    
    if (shift_id && check_in_time) {
      const shift = await this.getShiftTemplateById(tenantId, shift_id);
      if (shift) {
        lateArrival = validateLateArrival(check_in_time, shift.start_time, shift.late_threshold_minutes);
        earlyDeparture = validateEarlyDeparture(check_out_time || '', shift.end_time, shift.early_departure_threshold_minutes);
      }
    }

    const id = uuidv4();

    const query = `
      INSERT INTO attendance_records (
        id, tenant_id, employee_id, attendance_date, attendance_status_id,
        shift_id, check_in_time, check_out_time, break_start_time, break_end_time,
        late_arrival, early_departure, notes, location_data, marked_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *
    `;

    const values = [
      id, tenantId, employee_id, attendance_date, attendance_status_id,
      shift_id, check_in_time, check_out_time, break_start_time, break_end_time,
      lateArrival, earlyDeparture, notes, JSON.stringify(location_data || {}), markedBy
    ];

    const result = await pool.query(query, values);

    // Save geolocation data if provided
    if (location_data?.latitude && location_data?.longitude) {
      await this.saveAttendanceGeolocation(tenantId, id, location_data);
    }

    // Log audit trail
    await this.logAudit(tenantId, markedBy, 'CREATE', 'attendance_records', id, null, result.rows[0]);

    return result.rows[0];
  }

  async updateAttendanceRecord(tenantId: string, recordId: string, recordData: any, updatedBy: string): Promise<AttendanceRecord> {
    const current = await this.getAttendanceRecordById(tenantId, recordId);
    if (!current) {
      throw new Error('Attendance record not found');
    }

    const {
      attendance_status_id,
      check_in_time,
      check_out_time,
      break_start_time,
      break_end_time,
      notes,
      location_data
    } = recordData;

    // Validate time ranges if times are provided
    const timeValidation = validateTimeRange(check_in_time, check_out_time, break_start_time, break_end_time);
    if (timeValidation) {
      throw new Error(timeValidation);
    }

    // Recalculate late arrival and early departure if times changed
    let lateArrival = current.late_arrival;
    let earlyDeparture = current.early_departure;

    if (check_in_time || check_out_time || current.shift_id) {
      const shift = current.shift_id ? await this.getShiftTemplateById(tenantId, current.shift_id) : null;
      
      if (shift && check_in_time) {
        lateArrival = validateLateArrival(check_in_time, shift.start_time, shift.late_threshold_minutes);
      }
      
      if (shift && check_out_time) {
        earlyDeparture = validateEarlyDeparture(check_out_time, shift.end_time, shift.early_departure_threshold_minutes);
      }
    }

    const query = `
      UPDATE attendance_records SET
        attendance_status_id = $1, check_in_time = $2, check_out_time = $3,
        break_start_time = $4, break_end_time = $5, late_arrival = $6,
        early_departure = $7, notes = $8, location_data = $9, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $10 AND id = $11
      RETURNING *
    `;

    const values = [
      attendance_status_id || current.attendance_status_id,
      check_in_time || current.check_in_time,
      check_out_time || current.check_out_time,
      break_start_time || current.break_start_time,
      break_end_time || current.break_end_time,
      lateArrival,
      earlyDeparture,
      notes || current.notes,
      JSON.stringify(location_data || current.location_data || {}),
      tenantId,
      recordId
    ];

    const result = await pool.query(query, values);

    // Update geolocation data if provided
    if (location_data?.latitude && location_data?.longitude) {
      await this.saveAttendanceGeolocation(tenantId, recordId, location_data);
    }

    // Log audit trail
    await this.logAudit(tenantId, updatedBy, 'UPDATE', 'attendance_records', recordId, current, result.rows[0]);

    return result.rows[0];
  }

  async requestAttendanceCorrection(tenantId: string, correctionData: any, requestedBy: string): Promise<any> {
    const { attendance_record_id, requested_data, reason, attachment_url } = correctionData;

    // Get the current record
    const currentRecord = await this.getAttendanceRecordById(tenantId, attendance_record_id);
    if (!currentRecord) {
      throw new Error('Attendance record not found');
    }

    // Check if correction is already requested
    if (currentRecord.correction_requested) {
      throw new Error('Correction request already exists for this record');
    }

    // Update the record to mark correction as requested
    await pool.query(`
      UPDATE attendance_records SET
        correction_requested = true, correction_requested_at = CURRENT_TIMESTAMP,
        correction_reason = $1
      WHERE tenant_id = $2 AND id = $3
    `, [reason, tenantId, attendance_record_id]);

    // Log audit trail
    await this.logAudit(tenantId, requestedBy, 'CORRECTION_REQUEST', 'attendance_records', attendance_record_id, currentRecord, {
      ...currentRecord,
      correction_requested: true,
      correction_reason: reason
    });

    return { message: 'Correction request submitted successfully' };
  }

  async approveAttendanceCorrection(tenantId: string, recordId: string, approverId: string, action: 'approve' | 'reject', comments?: string, rejectionReason?: string): Promise<AttendanceRecord> {
    const current = await this.getAttendanceRecordById(tenantId, recordId);
    if (!current) {
      throw new Error('Attendance record not found');
    }

    if (!current.correction_requested) {
      throw new Error('No correction request found for this record');
    }

    const updateData: any = {
      correction_approved: action === 'approve',
      correction_approved_by: approverId,
      correction_approved_at: new Date(),
      correction_requested: false
    };

    if (action === 'reject') {
      updateData.correction_reason = rejectionReason;
    }

    const query = `
      UPDATE attendance_records SET
        correction_approved = $1, correction_approved_by = $2,
        correction_approved_at = $3, correction_requested = $4,
        correction_reason = $5, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $6 AND id = $7
      RETURNING *
    `;

    const values = [
      action === 'approve',
      approverId,
      new Date(),
      false,
      rejectionReason,
      tenantId,
      recordId
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, approverId, `CORRECTION_${action.toUpperCase()}`, 'attendance_records', recordId, current, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // ATTENDANCE STATUSES MANAGEMENT
  // =============================================

  async getAttendanceStatuses(tenantId: string, filters: any = {}): Promise<{ data: AttendanceStatus[]; total: number }> {
    const { status = 'active' } = filters;

    const query = `
      SELECT * FROM attendance_statuses 
      WHERE tenant_id = $1 AND status = $2
      ORDER BY name ASC
    `;

    const result = await pool.query(query, [tenantId, status]);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async createAttendanceStatus(tenantId: string, statusData: any, createdBy: string): Promise<AttendanceStatus> {
    const id = uuidv4();
    const query = `
      INSERT INTO attendance_statuses (
        id, tenant_id, name, code, description, payroll_impact,
        deduction_percentage, color_code, icon, requires_check_in,
        requires_check_out, counts_as_present
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *
    `;

    const values = [
      id, tenantId, statusData.name, statusData.code, statusData.description,
      statusData.payroll_impact, statusData.deduction_percentage || 0,
      statusData.color_code || '#10B981', statusData.icon, statusData.requires_check_in || false,
      statusData.requires_check_out || false, statusData.counts_as_present || false
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'attendance_statuses', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // SHIFT TEMPLATES MANAGEMENT
  // =============================================

  async getShiftTemplates(tenantId: string, filters: any = {}): Promise<{ data: ShiftTemplate[]; total: number }> {
    const { status = 'active' } = filters;

    const query = `
      SELECT * FROM shift_templates 
      WHERE tenant_id = $1 AND status = $2
      ORDER BY name ASC
    `;

    const result = await pool.query(query, [tenantId, status]);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async getShiftTemplateById(tenantId: string, shiftId: string): Promise<ShiftTemplate | null> {
    const query = `
      SELECT * FROM shift_templates 
      WHERE tenant_id = $1 AND id = $2
    `;

    const result = await pool.query(query, [tenantId, shiftId]);
    return result.rows[0] || null;
  }

  async createShiftTemplate(tenantId: string, shiftData: any, createdBy: string): Promise<ShiftTemplate> {
    // Validate shift times
    const timeValidation = validateShiftTimes(shiftData.start_time, shiftData.end_time);
    if (timeValidation) {
      throw new Error(timeValidation);
    }

    const id = uuidv4();
    const query = `
      INSERT INTO shift_templates (
        id, tenant_id, name, code, description, start_time, end_time,
        break_duration, late_threshold_minutes, early_departure_threshold_minutes,
        is_default, is_flexible, work_days, timezone
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    const values = [
      id, tenantId, shiftData.name, shiftData.code, shiftData.description,
      shiftData.start_time, shiftData.end_time, shiftData.break_duration || 60,
      shiftData.late_threshold_minutes || 0, shiftData.early_departure_threshold_minutes || 0,
      shiftData.is_default || false, shiftData.is_flexible || false,
      shiftData.work_days || [1, 2, 3, 4, 5], shiftData.timezone || 'UTC'
    ];

    const result = await pool.query(query, values);

    // If marked as default, unset other defaults
    if (shiftData.is_default) {
      await pool.query(`
        UPDATE shift_templates SET is_default = false
        WHERE tenant_id = $1 AND id != $2 AND is_default = true
      `, [tenantId, id]);
    }

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'shift_templates', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // EMPLOYEE SHIFTS MANAGEMENT
  // =============================================

  async getEmployeeShifts(tenantId: string, filters: any = {}): Promise<{ data: EmployeeShift[]; total: number }> {
    const { employee_id, shift_template_id, status = 'active' } = filters;

    let query = `
      SELECT es.*, 
        st.name as shift_name, st.code as shift_code,
        e.first_name, e.last_name, e.employee_number
      FROM employee_shifts es
      JOIN shift_templates st ON es.shift_template_id = st.id
      JOIN employees e ON es.employee_id = e.id
      WHERE es.tenant_id = $1 AND es.status = $2
    `;

    const values: any[] = [tenantId, status];
    let paramCount = 3;

    if (employee_id) {
      query += ` AND es.employee_id = $${paramCount}`;
      values.push(employee_id);
      paramCount++;
    }

    if (shift_template_id) {
      query += ` AND es.shift_template_id = $${paramCount}`;
      values.push(shift_template_id);
      paramCount++;
    }

    query += ' ORDER BY es.effective_from DESC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async createEmployeeShift(tenantId: string, shiftData: any, assignedBy: string): Promise<EmployeeShift[]> {
    const { employee_ids, shift_template_id, effective_from, effective_to, is_primary } = shiftData;

    const employeeShifts: EmployeeShift[] = [];

    for (const employeeId of employee_ids) {
      const id = uuidv4();

      // Check for existing active shift
      const existingQuery = `
        SELECT * FROM employee_shifts
        WHERE tenant_id = $1 AND employee_id = $2 AND status = 'active'
      `;

      const existing = await pool.query(existingQuery, [tenantId, employeeId]);

      if (existing.rows.length > 0) {
        // Deactivate existing shifts if this is primary
        if (is_primary) {
          await pool.query(`
            UPDATE employee_shifts SET status = 'inactive'
            WHERE tenant_id = $1 AND employee_id = $2 AND status = 'active'
          `, [tenantId, employeeId]);
        }
      }

      const query = `
        INSERT INTO employee_shifts (
          id, tenant_id, employee_id, shift_template_id, effective_from,
          effective_to, assigned_by, is_primary
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *
      `;

      const result = await pool.query(query, [
        id, tenantId, employeeId, shift_template_id, effective_from,
        effective_to, assignedBy, is_primary || false
      ]);

      employeeShifts.push(result.rows[0]);
    }

    return employeeShifts;
  }

  // =============================================
  // ATTENDANCE REPORTS
  // =============================================

  async getAttendanceSummary(tenantId: string, date: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN ast.payroll_impact = 'present' THEN 1 END) as present_today,
        COUNT(CASE WHEN ast.payroll_impact = 'absent' THEN 1 END) as absent_today,
        COUNT(CASE WHEN ast.payroll_impact = 'half_day' THEN 1 END) as half_day_today,
        COUNT(CASE WHEN ast.payroll_impact = 'leave' THEN 1 END) as on_leave_today,
        COUNT(CASE WHEN ar.late_arrival = true THEN 1 END) as late_arrivals,
        COUNT(CASE WHEN ar.early_departure = true THEN 1 END) as early_departures,
        ROUND(
          (COUNT(CASE WHEN ast.payroll_impact = 'present' THEN 1 END) * 100.0) / 
          NULLIF(COUNT(*), 0), 2
        ) as attendance_percentage,
        COALESCE(SUM(ar.overtime_hours), 0) as overtime_hours
      FROM employees e
      LEFT JOIN attendance_records ar ON e.id = ar.employee_id AND ar.attendance_date = $2
      LEFT JOIN attendance_statuses ast ON ar.attendance_status_id = ast.id
      WHERE e.tenant_id = $1 AND e.status = 'active'
    `;

    const result = await pool.query(query, [tenantId, date]);
    return result.rows[0];
  }

  async getDepartmentAttendanceSummary(tenantId: string, fromDate: string, toDate: string): Promise<any[]> {
    const query = `
      SELECT 
        d.id as department_id,
        d.name as department_name,
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(CASE WHEN ast.payroll_impact = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN ast.payroll_impact = 'absent' THEN 1 END) as absent_count,
        COUNT(CASE WHEN ast.payroll_impact = 'half_day' THEN 1 END) as half_day_count,
        COUNT(CASE WHEN ast.payroll_impact = 'leave' THEN 1 END) as on_leave_count,
        ROUND(
          (COUNT(CASE WHEN ast.payroll_impact = 'present' THEN 1 END) * 100.0) / 
          NULLIF(COUNT(*), 0), 2
        ) as attendance_percentage,
        COUNT(CASE WHEN ar.late_arrival = true THEN 1 END) as late_arrivals
      FROM departments d
      JOIN employees e ON d.id = e.department_id
      LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
        AND ar.attendance_date BETWEEN $2 AND $3
      LEFT JOIN attendance_statuses ast ON ar.attendance_status_id = ast.id
      WHERE d.tenant_id = $1 AND d.status = 'active' AND e.status = 'active'
      GROUP BY d.id, d.name
      ORDER BY d.name ASC
    `;

    const result = await pool.query(query, [tenantId, fromDate, toDate]);
    return result.rows;
  }

  async getLateArrivalReport(tenantId: string, fromDate: string, toDate: string): Promise<any[]> {
    const query = `
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        d.name as department_name,
        COUNT(ar.id) as late_count,
        SUM(EXTRACT(EPOCH FROM (ar.check_in_time - st.start_time))/60) as total_late_minutes,
        AVG(EXTRACT(EPOCH FROM (ar.check_in_time - st.start_time))/60) as average_late_minutes,
        MAX(ar.attendance_date) as last_late_date
      FROM employees e
      JOIN attendance_records ar ON e.id = ar.employee_id
      JOIN shift_templates st ON ar.shift_id = st.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.tenant_id = $1 
        AND ar.attendance_date BETWEEN $2 AND $3
        AND ar.late_arrival = true
        AND ar.check_in_time IS NOT NULL
      GROUP BY e.id, e.first_name, e.last_name, d.name
      ORDER BY late_count DESC
    `;

    const result = await pool.query(query, [tenantId, fromDate, toDate]);
    return result.rows;
  }

  async getAbsenceReport(tenantId: string, fromDate: string, toDate: string): Promise<any[]> {
    const query = `
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        d.name as department_name,
        COUNT(ar.id) as absence_count,
        COUNT(*) as absence_days,
        -- This would need more complex logic for consecutive days
        0 as consecutive_absence_days,
        MAX(ar.attendance_date) as last_absence_date,
        -- Absence type breakdown would require joining with leave requests
        '{}'::jsonb as absence_types
      FROM employees e
      JOIN attendance_records ar ON e.id = ar.employee_id
      JOIN attendance_statuses ast ON ar.attendance_status_id = ast.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.tenant_id = $1 
        AND ar.attendance_date BETWEEN $2 AND $3
        AND ast.payroll_impact = 'absent'
      GROUP BY e.id, e.first_name, e.last_name, d.name
      ORDER BY absence_count DESC
    `;

    const result = await pool.query(query, [tenantId, fromDate, toDate]);
    return result.rows;
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  async bulkCreateAttendanceRecords(tenantId: string, records: any[], markedBy: string): Promise<{ successful: number; failed: number; errors: any[] }> {
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < records.length; i++) {
      try {
        await this.createAttendanceRecord(tenantId, records[i], markedBy);
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          row: i + 1,
          employee_id: records[i].employee_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed, errors };
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async saveAttendanceGeolocation(tenantId: string, recordId: string, locationData: any): Promise<void> {
    const id = uuidv4();
    
    await pool.query(`
      INSERT INTO attendance_geolocation (
        id, tenant_id, attendance_record_id, latitude, longitude,
        accuracy, address, device_info, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id, tenantId, recordId, locationData.latitude, locationData.longitude,
      locationData.accuracy, locationData.address, JSON.stringify(locationData.device_info || {}), new Date()
    ]);
  }

  private async logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, oldValues: any, newValues: any): Promise<void> {
    const id = uuidv4();
    
    await pool.query(`
      INSERT INTO leave_attendance_audit_logs (
        id, tenant_id, user_id, action, entity_type, entity_id,
        old_values, new_values, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id, tenantId, userId, action, entityType, entityId,
      JSON.stringify(oldValues), JSON.stringify(newValues), new Date()
    ]);
  }
}