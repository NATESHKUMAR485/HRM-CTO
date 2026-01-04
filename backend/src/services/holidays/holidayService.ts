import { pool } from '../../config/database';
import { Holiday, WeeklyOff, Location } from '../../types/holidays';
import { v4 as uuidv4 } from 'uuid';

export class HolidayService {

  // =============================================
  // HOLIDAYS MANAGEMENT
  // =============================================

  async getHolidays(tenantId: string, filters: any = {}): Promise<{ data: Holiday[]; total: number }> {
    const {
      year,
      month,
      location_id,
      holiday_type,
      is_recurring,
      status = 'active',
      page = 1,
      limit = 20,
      sort_by = 'holiday_date',
      sort_order = 'ASC'
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT h.*, 
        l.name as location_name, l.code as location_code,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM holidays h
      LEFT JOIN locations l ON h.location_id = l.id
      LEFT JOIN users u ON h.created_by = u.id
      WHERE h.tenant_id = $1 AND h.status = $2
    `;

    const values: any[] = [tenantId, status];
    let paramCount = 3;

    if (year) {
      query += ` AND EXTRACT(YEAR FROM h.holiday_date) = $${paramCount}`;
      values.push(year);
      paramCount++;
    }

    if (month) {
      query += ` AND EXTRACT(MONTH FROM h.holiday_date) = $${paramCount}`;
      values.push(month);
      paramCount++;
    }

    if (location_id) {
      query += ` AND h.location_id = $${paramCount}`;
      values.push(location_id);
      paramCount++;
    }

    if (holiday_type) {
      query += ` AND h.holiday_type = $${paramCount}`;
      values.push(holiday_type);
      paramCount++;
    }

    if (is_recurring !== undefined) {
      query += ` AND h.is_recurring = $${paramCount}`;
      values.push(is_recurring);
      paramCount++;
    }

    query += ` ORDER BY h.${sort_by} ${sort_order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM holidays h
      WHERE h.tenant_id = $1 AND h.status = $2
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, [tenantId, status])
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async getHolidayById(tenantId: string, holidayId: string): Promise<Holiday | null> {
    const query = `
      SELECT h.*, 
        l.name as location_name, l.code as location_code,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM holidays h
      LEFT JOIN locations l ON h.location_id = l.id
      LEFT JOIN users u ON h.created_by = u.id
      WHERE h.tenant_id = $1 AND h.id = $2
    `;

    const result = await pool.query(query, [tenantId, holidayId]);
    return result.rows[0] || null;
  }

  async createHoliday(tenantId: string, holidayData: any, createdBy: string): Promise<Holiday> {
    const id = uuidv4();
    const query = `
      INSERT INTO holidays (
        id, tenant_id, name, description, holiday_date, is_recurring,
        recurring_pattern, location_specific, location_id, is_optional,
        holiday_type, color_code, created_by, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    const values = [
      id, tenantId, holidayData.name, holidayData.description, holidayData.holiday_date,
      holidayData.is_recurring || false, holidayData.recurring_pattern, holidayData.location_specific || false,
      holidayData.location_id, holidayData.is_optional || false, holidayData.holiday_type || 'company',
      holidayData.color_code || '#EF4444', createdBy, 'active'
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'holidays', id, null, result.rows[0]);

    return result.rows[0];
  }

  async updateHoliday(tenantId: string, holidayId: string, holidayData: any, updatedBy: string): Promise<Holiday> {
    const current = await this.getHolidayById(tenantId, holidayId);
    if (!current) {
      throw new Error('Holiday not found');
    }

    const query = `
      UPDATE holidays SET
        name = $1, description = $2, holiday_date = $3, is_recurring = $4,
        recurring_pattern = $5, location_specific = $6, location_id = $7,
        is_optional = $8, holiday_type = $9, color_code = $10, status = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $12 AND id = $13
      RETURNING *
    `;

    const values = [
      holidayData.name, holidayData.description, holidayData.holiday_date, holidayData.is_recurring,
      holidayData.recurring_pattern, holidayData.location_specific, holidayData.location_id,
      holidayData.is_optional, holidayData.holiday_type, holidayData.color_code,
      holidayData.status, tenantId, holidayId
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, updatedBy, 'UPDATE', 'holidays', holidayId, current, result.rows[0]);

    return result.rows[0];
  }

  async deleteHoliday(tenantId: string, holidayId: string, deletedBy: string): Promise<void> {
    const current = await this.getHolidayById(tenantId, holidayId);
    if (!current) {
      throw new Error('Holiday not found');
    }

    // Soft delete
    await pool.query(`
      UPDATE holidays SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $1 AND id = $2
    `, [tenantId, holidayId]);

    // Log audit trail
    await this.logAudit(tenantId, deletedBy, 'DELETE', 'holidays', holidayId, current, { ...current, status: 'inactive' });
  }

  // =============================================
  // LOCATIONS MANAGEMENT
  // =============================================

  async getLocations(tenantId: string, filters: any = {}): Promise<{ data: Location[]; total: number }> {
    const {
      status = 'active',
      is_head_office,
      timezone,
      page = 1,
      limit = 20,
      sort_by = 'name',
      sort_order = 'ASC'
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM locations
      WHERE tenant_id = $1 AND status = $2
    `;

    const values: any[] = [tenantId, status];
    let paramCount = 3;

    if (is_head_office !== undefined) {
      query += ` AND is_head_office = $${paramCount}`;
      values.push(is_head_office);
      paramCount++;
    }

    if (timezone) {
      query += ` AND timezone = $${paramCount}`;
      values.push(timezone);
      paramCount++;
    }

    query += ` ORDER BY ${sort_by} ${sort_order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM locations
      WHERE tenant_id = $1 AND status = $2
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, [tenantId, status])
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async getLocationById(tenantId: string, locationId: string): Promise<Location | null> {
    const query = `
      SELECT * FROM locations 
      WHERE tenant_id = $1 AND id = $2
    `;

    const result = await pool.query(query, [tenantId, locationId]);
    return result.rows[0] || null;
  }

  async createLocation(tenantId: string, locationData: any, createdBy: string): Promise<Location> {
    const id = uuidv4();
    const query = `
      INSERT INTO locations (
        id, tenant_id, name, code, address, timezone, geo_coordinates,
        working_hours, contact_info, is_head_office, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `;

    const values = [
      id, tenantId, locationData.name, locationData.code,
      JSON.stringify(locationData.address || {}), locationData.timezone || 'UTC',
      JSON.stringify(locationData.geo_coordinates || {}), JSON.stringify(locationData.working_hours || {}),
      JSON.stringify(locationData.contact_info || {}), locationData.is_head_office || false, 'active'
    ];

    const result = await pool.query(query, values);

    // If marked as head office, unset other head offices
    if (locationData.is_head_office) {
      await pool.query(`
        UPDATE locations SET is_head_office = false
        WHERE tenant_id = $1 AND id != $2 AND is_head_office = true
      `, [tenantId, id]);
    }

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'locations', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // WEEKLY OFFS MANAGEMENT
  // =============================================

  async getWeeklyOffs(tenantId: string, filters: any = {}): Promise<{ data: WeeklyOff[]; total: number }> {
    const {
      location_id,
      day_of_week,
      is_active = true,
      page = 1,
      limit = 20,
      sort_by = 'day_of_week',
      sort_order = 'ASC'
    } = filters;

    const offset = (page - 1) * limit;

    let query = `
      SELECT wo.*, 
        l.name as location_name, l.code as location_code,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM company_weekly_offs wo
      LEFT JOIN locations l ON wo.location_id = l.id
      LEFT JOIN users u ON wo.created_by = u.id
      WHERE wo.tenant_id = $1 AND wo.is_active = $2
    `;

    const values: any[] = [tenantId, is_active];
    let paramCount = 3;

    if (location_id) {
      query += ` AND wo.location_id = $${paramCount}`;
      values.push(location_id);
      paramCount++;
    }

    if (day_of_week !== undefined) {
      query += ` AND wo.day_of_week = $${paramCount}`;
      values.push(day_of_week);
      paramCount++;
    }

    query += ` ORDER BY wo.${sort_by} ${sort_order} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total FROM company_weekly_offs wo
      WHERE wo.tenant_id = $1 AND wo.is_active = $2
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, [tenantId, is_active])
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
  }

  async updateWeeklyOffs(tenantId: string, weeklyOffData: any, updatedBy: string): Promise<WeeklyOff[]> {
    const { location_id, weekly_offs } = weeklyOffData;

    const updatedWeeklyOffs: WeeklyOff[] = [];

    for (const weeklyOff of weekly_offs) {
      // Check if weekly off exists
      const existingQuery = `
        SELECT * FROM company_weekly_offs
        WHERE tenant_id = $1 AND location_id = $2 AND day_of_week = $3
      `;

      const existing = await pool.query(existingQuery, [tenantId, location_id, weeklyOff.day_of_week]);

      if (existing.rows.length > 0) {
        // Update existing
        const updateQuery = `
          UPDATE company_weekly_offs SET
            is_half_day = $1, half_day_start_time = $2, description = $3,
            is_active = $4, updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = $5 AND location_id = $6 AND day_of_week = $7
          RETURNING *
        `;

        const result = await pool.query(updateQuery, [
          weeklyOff.is_half_day || false,
          weeklyOff.half_day_start_time,
          weeklyOff.description,
          weeklyOff.is_active !== false, // Default to true
          tenantId,
          location_id,
          weeklyOff.day_of_week
        ]);

        updatedWeeklyOffs.push(result.rows[0]);
      } else {
        // Create new
        const id = uuidv4();
        const insertQuery = `
          INSERT INTO company_weekly_offs (
            id, tenant_id, location_id, day_of_week, is_half_day,
            half_day_start_time, description, is_active, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;

        const result = await pool.query(insertQuery, [
          id, tenantId, location_id, weeklyOff.day_of_week,
          weeklyOff.is_half_day || false, weeklyOff.half_day_start_time,
          weeklyOff.description, weeklyOff.is_active !== false, updatedBy
        ]);

        updatedWeeklyOffs.push(result.rows[0]);
      }
    }

    return updatedWeeklyOffs;
  }

  // =============================================
  // CALENDAR & WORKING DAYS CALCULATIONS
  // =============================================

  async getHolidayCalendar(tenantId: string, year: number, month?: number): Promise<any> {
    let query = `
      SELECT h.*, l.name as location_name
      FROM holidays h
      LEFT JOIN locations l ON h.location_id = l.id
      WHERE h.tenant_id = $1 AND h.status = 'active' 
        AND EXTRACT(YEAR FROM h.holiday_date) = $2
    `;

    const values: any[] = [tenantId, year];
    let paramCount = 3;

    if (month) {
      query += ` AND EXTRACT(MONTH FROM h.holiday_date) = $${paramCount}`;
      values.push(month);
    }

    query += ' ORDER BY h.holiday_date ASC';

    const holidaysResult = await pool.query(query, values);

    // Get weekly offs
    const weeklyOffsQuery = `
      SELECT wo.*, l.name as location_name
      FROM company_weekly_offs wo
      LEFT JOIN locations l ON wo.location_id = l.id
      WHERE wo.tenant_id = $1 AND wo.is_active = true
    `;

    const weeklyOffsResult = await pool.query(weeklyOffsQuery, [tenantId]);

    // Calculate working days
    const workingDays = await this.calculateWorkingDays(tenantId, year, month);

    return {
      year,
      month,
      holidays: holidaysResult.rows,
      weekly_offs: weeklyOffsResult.rows,
      working_days: workingDays.working_days,
      total_holidays: holidaysResult.rows.length,
      total_weekly_offs: weeklyOffsResult.rows.length,
      working_days_per_week: this.calculateWorkingDaysPerWeek(weeklyOffsResult.rows)
    };
  }

  async calculateWorkingDays(tenantId: string, fromDate: string, toDate: string, locationId?: string): Promise<any> {
    const query = `
      SELECT * FROM calculate_working_days($1, $2, $3, $4)
    `;

    const result = await pool.query(query, [tenantId, fromDate, toDate, locationId]);
    return result.rows[0] || {
      total_days: 0,
      working_days: 0,
      holidays: 0,
      weekly_offs: 0,
      excluded_dates: [],
      excluded_reasons: []
    };
  }

  async getUpcomingHolidays(tenantId: string, days: number = 30): Promise<any[]> {
    const query = `
      SELECT h.*, l.name as location_name,
        (h.holiday_date - CURRENT_DATE) as days_until
      FROM holidays h
      LEFT JOIN locations l ON h.location_id = l.id
      WHERE h.tenant_id = $1 
        AND h.status = 'active' 
        AND h.holiday_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '${days} days')
      ORDER BY h.holiday_date ASC
    `;

    const result = await pool.query(query, [tenantId]);
    return result.rows;
  }

  async getHolidayImpactAnalysis(tenantId: string, date: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(DISTINCT e.id) as affected_employees,
        COUNT(DISTINCT d.id) as affected_departments,
        ARRAY_AGG(DISTINCT l.name) as affected_locations,
        -- This would need more complex calculation for productivity impact
        0 as estimated_productivity_impact,
        ARRAY[]::text[] as recommended_actions
      FROM holidays h
      LEFT JOIN locations l ON h.location_id = l.id
      LEFT JOIN employees e ON (l.id = e.location_id OR h.location_id IS NULL)
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE h.tenant_id = $1 
        AND h.holiday_date = $2 
        AND h.status = 'active'
        AND e.status = 'active'
    `;

    const result = await pool.query(query, [tenantId, date]);
    return result.rows[0];
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  async bulkCreateHolidays(tenantId: string, holidays: any[], createdBy: string): Promise<{ successful: number; failed: number; errors: any[] }> {
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    for (let i = 0; i < holidays.length; i++) {
      try {
        await this.createHoliday(tenantId, holidays[i], createdBy);
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          row: i + 1,
          name: holidays[i].name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { successful, failed, errors };
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async calculateWorkingDays(tenantId: string, year: number, month?: number): Promise<{ working_days: number }> {
    // This is a simplified calculation
    // In a real implementation, you'd use the database function
    const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const endDate = month ? new Date(year, month, 0) : new Date(year, 11, 31);

    // Get holidays and weekly offs
    const holidays = await this.getHolidays(tenantId, { year, month });
    const weeklyOffs = await this.getWeeklyOffs(tenantId, {});

    let workingDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const isWeeklyOff = weeklyOffs.data.some(wo => wo.day_of_week === dayOfWeek);
      const isHoliday = holidays.data.some(h => {
        const holidayDate = new Date(h.holiday_date);
        return holidayDate.toDateString() === currentDate.toDateString();
      });

      if (!isWeeklyOff && !isHoliday) {
        workingDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { working_days: workingDays };
  }

  private calculateWorkingDaysPerWeek(weeklyOffs: WeeklyOff[]): number {
    const weeklyOffDays = new Set(weeklyOffs.map(wo => wo.day_of_week));
    return 7 - weeklyOffDays.size;
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