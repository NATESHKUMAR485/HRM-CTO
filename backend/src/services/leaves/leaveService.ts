import { pool } from '../../config/database';
import { LeaveType, LeaveAllocation, LeaveRequest, LeaveBalance, LeaveTransaction, LeaveEncashment } from '../../types/leaves';
import { validateDateRange, validateLeaveBalance, validateWorkingDays } from '../../validators/leaves';
import { v4 as uuidv4 } from 'uuid';

export class LeaveService {
  
  // =============================================
  // LEAVE TYPES MANAGEMENT
  // =============================================

  async getLeaveTypes(tenantId: string, filters: any = {}): Promise<{ data: LeaveType[]; total: number }> {
    const { page = 1, limit = 20, status = 'active' } = filters;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM leave_types 
      WHERE tenant_id = $1 AND status = $2
      ORDER BY name ASC
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM leave_types 
      WHERE tenant_id = $1 AND status = $2
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, [tenantId, status, limit, offset]),
      pool.query(countQuery, [tenantId, status])
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async getLeaveTypeById(tenantId: string, leaveTypeId: string): Promise<LeaveType | null> {
    const query = `
      SELECT * FROM leave_types 
      WHERE tenant_id = $1 AND id = $2
    `;

    const result = await pool.query(query, [tenantId, leaveTypeId]);
    return result.rows[0] || null;
  }

  async createLeaveType(tenantId: string, leaveTypeData: any, createdBy: string): Promise<LeaveType> {
    const id = uuidv4();
    const query = `
      INSERT INTO leave_types (
        id, tenant_id, name, code, description, accrual_type, allocation_value,
        carry_over_allowed, max_carry_over, encashment_allowed, encashment_rate,
        min_notice_days, max_consecutive_days, approval_required, approval_levels,
        probation_restriction, half_day_allowed, can_be_planned, can_be_emergency,
        requires_attachment, color_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *
    `;

    const values = [
      id, tenantId, leaveTypeData.name, leaveTypeData.code, leaveTypeData.description,
      leaveTypeData.accrual_type, leaveTypeData.allocation_value, leaveTypeData.carry_over_allowed,
      leaveTypeData.max_carry_over || 0, leaveTypeData.encashment_allowed, leaveTypeData.encashment_rate || 0,
      leaveTypeData.min_notice_days || 0, leaveTypeData.max_consecutive_days, leaveTypeData.approval_required,
      leaveTypeData.approval_levels || 1, leaveTypeData.probation_restriction, leaveTypeData.half_day_allowed,
      leaveTypeData.can_be_planned, leaveTypeData.can_be_emergency, leaveTypeData.requires_attachment,
      leaveTypeData.color_code || '#3B82F6'
    ];

    const result = await pool.query(query, values);
    
    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'leave_types', id, null, result.rows[0]);
    
    return result.rows[0];
  }

  async updateLeaveType(tenantId: string, leaveTypeId: string, leaveTypeData: any, updatedBy: string): Promise<LeaveType> {
    // Get current data for audit log
    const current = await this.getLeaveTypeById(tenantId, leaveTypeId);
    if (!current) {
      throw new Error('Leave type not found');
    }

    const query = `
      UPDATE leave_types SET
        name = $1, code = $2, description = $3, accrual_type = $4, allocation_value = $5,
        carry_over_allowed = $6, max_carry_over = $7, encashment_allowed = $8, encashment_rate = $9,
        min_notice_days = $10, max_consecutive_days = $11, approval_required = $12, approval_levels = $13,
        probation_restriction = $14, half_day_allowed = $15, can_be_planned = $16, can_be_emergency = $17,
        requires_attachment = $18, color_code = $19, status = $20, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $21 AND id = $22
      RETURNING *
    `;

    const values = [
      leaveTypeData.name, leaveTypeData.code, leaveTypeData.description, leaveTypeData.accrual_type,
      leaveTypeData.allocation_value, leaveTypeData.carry_over_allowed, leaveTypeData.max_carry_over,
      leaveTypeData.encashment_allowed, leaveTypeData.encashment_rate, leaveTypeData.min_notice_days,
      leaveTypeData.max_consecutive_days, leaveTypeData.approval_required, leaveTypeData.approval_levels,
      leaveTypeData.probation_restriction, leaveTypeData.half_day_allowed, leaveTypeData.can_be_planned,
      leaveTypeData.can_be_emergency, leaveTypeData.requires_attachment, leaveTypeData.color_code,
      leaveTypeData.status, tenantId, leaveTypeId
    ];

    const result = await pool.query(query, values);
    
    // Log audit trail
    await this.logAudit(tenantId, updatedBy, 'UPDATE', 'leave_types', leaveTypeId, current, result.rows[0]);
    
    return result.rows[0];
  }

  // =============================================
  // LEAVE BALANCE MANAGEMENT
  // =============================================

  async getLeaveBalance(tenantId: string, employeeId: string, filters: any = {}): Promise<LeaveBalance[]> {
    const { year = new Date().getFullYear(), leave_type_id } = filters;

    let query = `
      SELECT 
        lt.id as leave_type_id,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.*,
        COALESCE(SUM(la.allocated_amount), 0) as allocated_amount,
        COALESCE(SUM(la.used_amount), 0) as used_amount,
        COALESCE(SUM(la.carried_over_amount), 0) as carried_over_amount,
        COALESCE(SUM(la.encashed_amount), 0) as encashed_amount,
        COALESCE(SUM(la.allocated_amount + la.carried_over_amount - la.used_amount - la.encashed_amount), 0) as remaining_amount,
        COALESCE(SUM(lr.total_days), 0) as pending_requests
      FROM leave_types lt
      LEFT JOIN leave_allocations la ON lt.id = la.leave_type_id 
        AND la.employee_id = $1 
        AND la.allocation_year = $2 
        AND la.status = 'active'
      LEFT JOIN leave_requests lr ON lt.id = lr.leave_type_id 
        AND lr.employee_id = $1 
        AND lr.status = 'pending'
      WHERE lt.tenant_id = $3 AND lt.status = 'active'
    `;

    const values = [employeeId, year, tenantId];

    if (leave_type_id) {
      query += ' AND lt.id = $4';
      values.push(leave_type_id);
    }

    query += `
      GROUP BY lt.id, lt.name, lt.code
      ORDER BY lt.name ASC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  async calculateLeaveBalance(tenantId: string, employeeId: string, leaveTypeId: string, asOfDate: Date = new Date()): Promise<{
    allocated_amount: number;
    used_amount: number;
    carried_over_amount: number;
    encashed_amount: number;
    remaining_amount: number;
  }> {
    const query = `
      SELECT 
        COALESCE(SUM(la.allocated_amount), 0) as allocated_amount,
        COALESCE(SUM(la.used_amount), 0) as used_amount,
        COALESCE(SUM(la.carried_over_amount), 0) as carried_over_amount,
        COALESCE(SUM(la.encashed_amount), 0) as encashed_amount,
        COALESCE(SUM(la.allocated_amount + la.carried_over_amount - la.used_amount - la.encashed_amount), 0) as remaining_amount
      FROM leave_allocations la
      WHERE la.tenant_id = $1
        AND la.employee_id = $2
        AND la.leave_type_id = $3
        AND la.effective_from <= $4
        AND (la.effective_to IS NULL OR la.effective_to >= $4)
        AND la.status = 'active'
    `;

    const result = await pool.query(query, [tenantId, employeeId, leaveTypeId, asOfDate]);
    return result.rows[0] || {
      allocated_amount: 0,
      used_amount: 0,
      carried_over_amount: 0,
      encashed_amount: 0,
      remaining_amount: 0
    };
  }

  // =============================================
  // LEAVE REQUESTS MANAGEMENT
  // =============================================

  async getLeaveRequests(tenantId: string, filters: any = {}): Promise<{ data: LeaveRequest[]; total: number }> {
    const {
      status,
      leave_type_id,
      employee_id,
      from_date,
      to_date,
      department_id,
      location_id,
      page = 1,
      limit = 20,
      sort_by = 'submitted_at',
      sort_order = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT lr.*, 
        lt.name as leave_type_name, lt.code as leave_type_code,
        e.first_name, e.last_name, e.employee_number,
        d.name as department_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE lr.tenant_id = $1
    `;

    const values: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      if (Array.isArray(status)) {
        query += ` AND lr.status = ANY($${paramCount})`;
        values.push(status);
      } else {
        query += ` AND lr.status = $${paramCount}`;
        values.push(status);
      }
      paramCount++;
    }

    if (leave_type_id) {
      query += ` AND lr.leave_type_id = $${paramCount}`;
      values.push(leave_type_id);
      paramCount++;
    }

    if (employee_id) {
      query += ` AND lr.employee_id = $${paramCount}`;
      values.push(employee_id);
      paramCount++;
    }

    if (from_date) {
      query += ` AND lr.from_date >= $${paramCount}`;
      values.push(from_date);
      paramCount++;
    }

    if (to_date) {
      query += ` AND lr.to_date <= $${paramCount}`;
      values.push(to_date);
      paramCount++;
    }

    query += ` ORDER BY lr.${sort_by} ${sort_order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM leave_requests lr
      WHERE lr.tenant_id = $1
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

  async getLeaveRequestById(tenantId: string, requestId: string): Promise<LeaveRequest | null> {
    const query = `
      SELECT lr.*, 
        lt.name as leave_type_name, lt.code as leave_type_code,
        e.first_name, e.last_name, e.employee_number,
        d.name as department_name
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE lr.tenant_id = $1 AND lr.id = $2
    `;

    const result = await pool.query(query, [tenantId, requestId]);
    return result.rows[0] || null;
  }

  async createLeaveRequest(tenantId: string, requestData: any, employeeId: string): Promise<LeaveRequest> {
    const { leave_type_id, from_date, to_date, half_day_type, reason, emergency_contact, is_retroactive, retroactive_reason } = requestData;

    // Validate dates
    const dateValidation = validateDateRange(from_date, to_date);
    if (dateValidation) {
      throw new Error(dateValidation);
    }

    // Get leave type to check restrictions
    const leaveType = await this.getLeaveTypeById(tenantId, leave_type_id);
    if (!leaveType) {
      throw new Error('Leave type not found');
    }

    // Calculate total days
    const totalDays = this.calculateTotalDays(from_date, to_date, half_day_type);

    // Check leave balance
    const balance = await this.calculateLeaveBalance(tenantId, employeeId, leave_type_id);
    const balanceValidation = validateLeaveBalance(balance.allocated_amount, balance.used_amount, totalDays, balance.carried_over_amount);
    if (balanceValidation) {
      throw new Error(balanceValidation);
    }

    // Check for overlapping requests
    const overlappingCheck = await this.checkOverlappingLeaves(tenantId, employeeId, from_date, to_date);
    if (overlappingCheck) {
      throw new Error('Leave request overlaps with existing approved leave');
    }

    // Check working days
    const workingDaysValidation = validateWorkingDays(from_date, to_date, employeeId);
    if (workingDaysValidation) {
      throw new Error(workingDaysValidation);
    }

    const id = uuidv4();
    const approvalChain = this.buildApprovalChain(leaveType, employeeId);

    const query = `
      INSERT INTO leave_requests (
        id, tenant_id, employee_id, leave_type_id, from_date, to_date, total_days,
        half_day_type, reason, emergency_contact, status, current_approval_level,
        approval_chain, is_retroactive, retroactive_reason, submitted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `;

    const values = [
      id, tenantId, employeeId, leave_type_id, from_date, to_date, totalDays,
      half_day_type, reason, emergency_contact, 'pending', 1,
      JSON.stringify(approvalChain), is_retroactive, retroactive_reason, new Date()
    ];

    const result = await pool.query(query, values);

    // Log transaction
    await this.createLeaveTransaction(tenantId, employeeId, leave_type_id, 'allocation', totalDays, balance.remaining_amount, balance.remaining_amount - totalDays, id);

    // Send notifications
    await this.sendLeaveRequestNotification(tenantId, result.rows[0]);

    return result.rows[0];
  }

  async updateLeaveRequest(tenantId: string, requestId: string, requestData: any, employeeId: string): Promise<LeaveRequest> {
    const current = await this.getLeaveRequestById(tenantId, requestId);
    if (!current) {
      throw new Error('Leave request not found');
    }

    if (current.employee_id !== employeeId) {
      throw new Error('Cannot update someone else\'s leave request');
    }

    if (current.status !== 'pending') {
      throw new Error('Can only update pending leave requests');
    }

    const { from_date, to_date, half_day_type, reason, emergency_contact } = requestData;

    // Recalculate total days if dates changed
    let totalDays = current.total_days;
    if (from_date || to_date || half_day_type) {
      const newFromDate = from_date || current.from_date;
      const newToDate = to_date || current.to_date;
      const newHalfDayType = half_day_type || current.half_day_type;
      totalDays = this.calculateTotalDays(newFromDate, newToDate, newHalfDayType);

      // Re-validate balance
      const balance = await this.calculateLeaveBalance(tenantId, employeeId, current.leave_type_id);
      const balanceValidation = validateLeaveBalance(balance.allocated_amount, balance.used_amount, totalDays, balance.carried_over_amount);
      if (balanceValidation) {
        throw new Error(balanceValidation);
      }
    }

    const query = `
      UPDATE leave_requests SET
        from_date = $1, to_date = $2, total_days = $3, half_day_type = $4,
        reason = $5, emergency_contact = $6, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $7 AND id = $8
      RETURNING *
    `;

    const values = [
      from_date || current.from_date,
      to_date || current.to_date,
      totalDays,
      half_day_type || current.half_day_type,
      reason || current.reason,
      emergency_contact || current.emergency_contact,
      tenantId,
      requestId
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, employeeId, 'UPDATE', 'leave_requests', requestId, current, result.rows[0]);

    return result.rows[0];
  }

  async approveLeaveRequest(tenantId: string, requestId: string, approverId: string, action: 'approve' | 'reject' | 'forward', comments?: string, forwardedToId?: string): Promise<LeaveRequest> {
    const current = await this.getLeaveRequestById(tenantId, requestId);
    if (!current) {
      throw new Error('Leave request not found');
    }

    if (current.status !== 'pending') {
      throw new Error('Can only approve pending leave requests');
    }

    const approvalChain = current.approval_chain || [];
    const currentLevel = approvalChain.find((level: any) => level.level === current.current_approval_level);

    if (!currentLevel) {
      throw new Error('Invalid approval level');
    }

    if (currentLevel.status !== 'pending') {
      throw new Error('This approval level has already been processed');
    }

    let newStatus = current.status;
    let newApprovalLevel = current.current_approval_level;
    let newCurrentApproverId = current.current_approver_id;

    if (action === 'approve') {
      // Check if this is the final approval level
      const leaveType = await this.getLeaveTypeById(tenantId, current.leave_type_id);
      if (!leaveType) {
        throw new Error('Leave type not found');
      }

      if (current.current_approval_level >= leaveType.approval_levels) {
        // Final approval
        newStatus = 'approved';
        newCurrentApproverId = null;

        // Deduct from leave balance
        await this.deductLeaveBalance(tenantId, current.employee_id, current.leave_type_id, current.total_days);

        // Update attendance records to mark as leave
        await this.updateAttendanceForLeave(tenantId, current.employee_id, current.from_date, current.to_date);

      } else {
        // Move to next level
        newApprovalLevel++;
        newCurrentApproverId = this.getNextApprover(approvalChain, newApprovalLevel);
      }
    } else if (action === 'reject') {
      newStatus = 'rejected';
      newCurrentApproverId = null;
    } else if (action === 'forward') {
      if (!forwardedToId) {
        throw new Error('Forwarded to ID is required for forward action');
      }
      newCurrentApproverId = forwardedToId;
    }

    // Update approval chain
    approvalChain[current.current_approval_level - 1] = {
      ...currentLevel,
      status: action,
      approver_id: approverId,
      comments,
      approved_at: new Date()
    };

    const query = `
      UPDATE leave_requests SET
        status = $1, current_approval_level = $2, approval_chain = $3,
        current_approver_id = $4, ${action === 'approve' ? 'approved_at' : action === 'reject' ? 'rejected_at' : ''} = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $5 AND id = $6
      RETURNING *
    `;

    const values = [
      newStatus, newApprovalLevel, JSON.stringify(approvalChain), newCurrentApproverId,
      tenantId, requestId
    ];

    const result = await pool.query(query, values);

    // Send notification
    await this.sendLeaveApprovalNotification(tenantId, result.rows[0], action, comments);

    // Log audit trail
    await this.logAudit(tenantId, approverId, action.toUpperCase(), 'leave_requests', requestId, current, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // LEAVE ALLOCATIONS MANAGEMENT
  // =============================================

  async createLeaveAllocation(tenantId: string, allocationData: any, allocatedBy: string): Promise<LeaveAllocation[]> {
    const { employee_ids, leave_type_id, allocation_year, allocated_amount, effective_from, notes } = allocationData;

    const allocations: LeaveAllocation[] = [];

    for (const employeeId of employee_ids) {
      const id = uuidv4();

      // Check if allocation already exists
      const existingQuery = `
        SELECT * FROM leave_allocations 
        WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 AND allocation_year = $4
      `;

      const existing = await pool.query(existingQuery, [tenantId, employeeId, leave_type_id, allocation_year]);

      if (existing.rows.length > 0) {
        // Update existing allocation
        const updateQuery = `
          UPDATE leave_allocations SET
            allocated_amount = $1, effective_from = $2, effective_to = $3,
            notes = $4, updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = $5 AND employee_id = $6 AND leave_type_id = $7 AND allocation_year = $8
          RETURNING *
        `;

        const result = await pool.query(updateQuery, [
          allocated_amount, effective_from, null, notes, tenantId, employeeId, leave_type_id, allocation_year
        ]);

        allocations.push(result.rows[0]);
      } else {
        // Create new allocation
        const insertQuery = `
          INSERT INTO leave_allocations (
            id, tenant_id, employee_id, leave_type_id, allocation_year,
            allocated_amount, effective_from, is_manual, allocated_by, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          ) RETURNING *
        `;

        const result = await pool.query(insertQuery, [
          id, tenantId, employeeId, leave_type_id, allocation_year,
          allocated_amount, effective_from, true, allocatedBy, notes
        ]);

        allocations.push(result.rows[0]);
      }

      // Create transaction record
      await this.createLeaveTransaction(tenantId, employeeId, leave_type_id, 'allocation', allocated_amount, 0, allocated_amount, null);
    }

    return allocations;
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private calculateTotalDays(fromDate: string, toDate: string, halfDayType?: string): number {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (halfDayType) {
      return diffDays === 1 ? 0.5 : diffDays - 0.5;
    }

    return diffDays;
  }

  private async checkOverlappingLeaves(tenantId: string, employeeId: string, fromDate: string, toDate: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM leave_requests
      WHERE tenant_id = $1 AND employee_id = $2 
        AND status IN ('approved', 'pending')
        AND (
          (from_date <= $3 AND to_date >= $3) OR
          (from_date <= $4 AND to_date >= $4) OR
          (from_date >= $3 AND to_date <= $4)
        )
    `;

    const result = await pool.query(query, [tenantId, employeeId, fromDate, toDate]);
    return parseInt(result.rows[0].count) > 0;
  }

  private buildApprovalChain(leaveType: LeaveType, employeeId: string): any[] {
    const chain = [];
    
    // Level 1: Manager approval (always required)
    chain.push({
      level: 1,
      approver_type: 'manager',
      status: 'pending',
      is_required: true
    });

    // Level 2: HR approval (if required by leave type)
    if (leaveType.approval_levels >= 2) {
      chain.push({
        level: 2,
        approver_type: 'hr',
        status: 'pending',
        is_required: true
      });
    }

    // Level 3: Admin approval (if required by leave type)
    if (leaveType.approval_levels >= 3) {
      chain.push({
        level: 3,
        approver_type: 'admin',
        status: 'pending',
        is_required: true
      });
    }

    return chain;
  }

  private getNextApprover(approvalChain: any[], nextLevel: number): string | null {
    const nextLevelData = approvalChain.find(level => level.level === nextLevel);
    return nextLevelData?.approver_id || null;
  }

  private async deductLeaveBalance(tenantId: string, employeeId: string, leaveTypeId: string, days: number): Promise<void> {
    // Get current allocation
    const allocationQuery = `
      SELECT * FROM leave_allocations
      WHERE tenant_id = $1 AND employee_id = $2 AND leave_type_id = $3 
        AND status = 'active' AND allocation_year = $4
      ORDER BY effective_from DESC LIMIT 1
    `;

    const currentYear = new Date().getFullYear();
    const result = await pool.query(allocationQuery, [tenantId, employeeId, leaveTypeId, currentYear]);

    if (result.rows.length > 0) {
      const allocation = result.rows[0];
      const newUsedAmount = parseFloat(allocation.used_amount) + days;

      await pool.query(`
        UPDATE leave_allocations SET
          used_amount = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newUsedAmount, allocation.id]);
    }
  }

  private async updateAttendanceForLeave(tenantId: string, employeeId: string, fromDate: string, toDate: string): Promise<void> {
    // This would update attendance records to mark as 'On Leave'
    // Implementation depends on the attendance system integration
  }

  private async createLeaveTransaction(
    tenantId: string, 
    employeeId: string, 
    leaveTypeId: string, 
    transactionType: string, 
    amount: number, 
    previousBalance: number, 
    newBalance: number, 
    leaveRequestId?: string
  ): Promise<void> {
    const id = uuidv4();
    
    await pool.query(`
      INSERT INTO leave_transactions (
        id, tenant_id, employee_id, leave_type_id, transaction_type,
        amount, previous_balance, new_balance, related_leave_request_id,
        transaction_date, effective_date, processed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
    `, [
      id, tenantId, employeeId, leaveTypeId, transactionType,
      amount, previousBalance, newBalance, leaveRequestId,
      new Date(), new Date(), new Date()
    ]);
  }

  private async sendLeaveRequestNotification(tenantId: string, leaveRequest: LeaveRequest): Promise<void> {
    // Implementation would send notifications to approvers
  }

  private async sendLeaveApprovalNotification(tenantId: string, leaveRequest: LeaveRequest, action: string, comments?: string): Promise<void> {
    // Implementation would send notifications to employee
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