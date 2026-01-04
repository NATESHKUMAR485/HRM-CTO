import { Pool, PoolClient } from 'pg';
import { 
  Employee, 
  EmployeeAllowance, 
  EmployeeDeduction, 
  EmployeeBankDetails, 
  EmployeeTaxInfo,
  EmployeeSkill,
  EmployeeCertification,
  EmployeeDocument,
  EmployeeBenefit,
  EmployeeSalaryHistory,
  EmployeeEmploymentHistory,
  Department,
  EmployeeSearchFilters,
  PaginationOptions,
  EmployeeListResponse,
  BulkOperationResult,
  ExpiringCertification
} from '../types';
import { encrypt, decrypt, isEncrypted } from '../utils/encryption';
import { v4 as uuidv4 } from 'uuid';

export class EmployeeService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate employee number
   */
  async generateEmployeeNumber(tenantId: string): Promise<string> {
    const result = await this.pool.query(
      'SELECT generate_employee_number($1) as employee_number',
      [tenantId]
    );
    return result.rows[0].employee_number;
  }

  /**
   * Create new employee
   */
  async createEmployee(tenantId: string, employeeData: Partial<Employee>, createdBy: string): Promise<Employee> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate employee number
      const employeeNumber = await this.generateEmployeeNumber(tenantId);
      
      // Insert employee
      const employeeQuery = `
        INSERT INTO employees (
          tenant_id, employee_number, user_id, first_name, last_name, middle_name,
          email, phone, mobile, date_of_birth, gender, marital_status, nationality,
          national_id, passport_number, address, emergency_contact, photo_url,
          department_id, position, employment_type, status, hire_date, probation_end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `;
      
      const employeeParams = [
        tenantId,
        employeeNumber,
        employeeData.user_id || null,
        employeeData.first_name,
        employeeData.last_name,
        employeeData.middle_name || null,
        employeeData.email,
        employeeData.phone || null,
        employeeData.mobile || null,
        employeeData.date_of_birth || null,
        employeeData.gender || null,
        employeeData.marital_status || null,
        employeeData.nationality || null,
        employeeData.national_id || null,
        employeeData.passport_number || null,
        JSON.stringify(employeeData.address || {}),
        JSON.stringify(employeeData.emergency_contact || {}),
        employeeData.photo_url || null,
        employeeData.department_id || null,
        employeeData.position || null,
        employeeData.employment_type,
        employeeData.status || 'active',
        employeeData.hire_date,
        employeeData.probation_end_date || null
      ];
      
      const employeeResult = await client.query(employeeQuery, employeeParams);
      const newEmployee = employeeResult.rows[0];
      
      // Create initial employment history entry
      await this.createEmploymentHistory(
        client,
        tenantId,
        newEmployee.id,
        'hire',
        newEmployee.hire_date,
        {},
        {
          employee_number: employeeNumber,
          department_id: employeeData.department_id,
          position: employeeData.position,
          employment_type: employeeData.employment_type
        },
        'New employee hire',
        createdBy
      );
      
      // Create initial salary history if base salary provided
      if (employeeData.salary) {
        await this.createSalaryHistory(
          client,
          tenantId,
          newEmployee.id,
          {
            base_salary: employeeData.salary,
            currency: 'USD',
            effective_date: employeeData.hire_date,
            change_reason: 'Initial hire salary',
            change_type: 'increase'
          },
          createdBy
        );
      }
      
      await client.query('COMMIT');
      
      // Log audit trail
      await this.logAudit(
        tenantId,
        newEmployee.id,
        'create',
        'employee',
        newEmployee.id,
        {},
        newEmployee,
        createdBy
      );
      
      return this.formatEmployee(newEmployee);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employee by ID with all related data
   */
  async getEmployeeById(tenantId: string, employeeId: string): Promise<Employee | null> {
    const query = `
      SELECT e.*, 
        d.name as department_name,
        u.email as user_email,
        esh.base_salary,
        esh.currency as salary_currency
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT base_salary, currency
        FROM employee_salary_history esh2
        WHERE esh2.employee_id = e.id 
        AND esh2.status = 'active'
        AND (esh2.end_date IS NULL OR esh2.end_date > CURRENT_DATE)
        ORDER BY esh2.effective_date DESC
        LIMIT 1
      ) esh ON true
      WHERE e.tenant_id = $1 AND e.id = $2
    `;
    
    const result = await this.pool.query(query, [tenantId, employeeId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.formatEmployee(result.rows[0]);
  }

  /**
   * Get employees list with pagination and filters
   */
  async getEmployees(
    tenantId: string, 
    filters: EmployeeSearchFilters = {}, 
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<EmployeeListResponse> {
    let whereConditions = ['e.tenant_id = $1'];
    let queryParams: any[] = [tenantId];
    let paramCount = 2;
    
    // Build WHERE conditions
    if (filters.search) {
      whereConditions.push(`(
        e.first_name ILIKE $${paramCount} OR 
        e.last_name ILIKE $${paramCount} OR 
        e.email ILIKE $${paramCount} OR 
        e.employee_number ILIKE $${paramCount}
      )`);
      queryParams.push(`%${filters.search}%`);
      paramCount++;
    }
    
    if (filters.department_id) {
      whereConditions.push(`e.department_id = $${paramCount}`);
      queryParams.push(filters.department_id);
      paramCount++;
    }
    
    if (filters.status) {
      whereConditions.push(`e.status = $${paramCount}`);
      queryParams.push(filters.status);
      paramCount++;
    }
    
    if (filters.employment_type) {
      whereConditions.push(`e.employment_type = $${paramCount}`);
      queryParams.push(filters.employment_type);
      paramCount++;
    }
    
    if (filters.hire_date_from) {
      whereConditions.push(`e.hire_date >= $${paramCount}`);
      queryParams.push(filters.hire_date_from);
      paramCount++;
    }
    
    if (filters.hire_date_to) {
      whereConditions.push(`e.hire_date <= $${paramCount}`);
      queryParams.push(filters.hire_date_to);
      paramCount++;
    }
    
    // Build ORDER BY
    const sortBy = pagination.sort_by || 'first_name';
    const sortOrder = pagination.sort_order || 'asc';
    const orderBy = `ORDER BY e.${sortBy} ${sortOrder.toUpperCase()}`;
    
    // Build LIMIT and OFFSET
    const limit = pagination.limit;
    const offset = (pagination.page - 1) * limit;
    
    // Main query
    const query = `
      SELECT e.*, 
        d.name as department_name,
        u.email as user_email,
        esh.base_salary,
        esh.currency as salary_currency,
        COUNT(*) OVER() as total_count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT base_salary, currency
        FROM employee_salary_history esh2
        WHERE esh2.employee_id = e.id 
        AND esh2.status = 'active'
        AND (esh2.end_date IS NULL OR esh2.end_date > CURRENT_DATE)
        ORDER BY esh2.effective_date DESC
        LIMIT 1
      ) esh ON true
      WHERE ${whereConditions.join(' AND ')}
      ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const result = await this.pool.query(query, queryParams);
    
    const employees = result.rows.map(row => this.formatEmployee(row));
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    
    return {
      employees,
      total,
      page: pagination.page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  /**
   * Update employee
   */
  async updateEmployee(
    tenantId: string, 
    employeeId: string, 
    updateData: Partial<Employee>, 
    updatedBy: string
  ): Promise<Employee> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current employee data
      const currentEmployee = await this.getEmployeeById(tenantId, employeeId);
      if (!currentEmployee) {
        throw new Error('Employee not found');
      }
      
      // Build update query dynamically
      const updateFields = [];
      const updateParams: any[] = [tenantId, employeeId];
      let paramCount = 3;
      
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && key !== 'id' && key !== 'tenant_id' && key !== 'employee_number' && key !== 'created_at') {
          updateFields.push(`${key} = $${paramCount}`);
          
          if (key === 'address' || key === 'emergency_contact') {
            updateParams.push(JSON.stringify(value));
          } else {
            updateParams.push(value);
          }
          paramCount++;
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      const updateQuery = `
        UPDATE employees 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, updateParams);
      const updatedEmployee = result.rows[0];
      
      // Log employment history for significant changes
      if (updateData.department_id && updateData.department_id !== currentEmployee.department_id) {
        await this.createEmploymentHistory(
          client,
          tenantId,
          employeeId,
          'transfer',
          new Date(),
          { department_id: currentEmployee.department_id },
          { department_id: updateData.department_id },
          'Department transfer',
          updatedBy
        );
      }
      
      if (updateData.position && updateData.position !== currentEmployee.position) {
        await this.createEmploymentHistory(
          client,
          tenantId,
          employeeId,
          'promotion',
          new Date(),
          { position: currentEmployee.position },
          { position: updateData.position },
          'Position change',
          updatedBy
        );
      }
      
      await client.query('COMMIT');
      
      // Log audit trail
      await this.logAudit(
        tenantId,
        employeeId,
        'update',
        'employee',
        employeeId,
        currentEmployee,
        updatedEmployee,
        updatedBy
      );
      
      return this.formatEmployee(updatedEmployee);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete employee
   */
  async deleteEmployee(tenantId: string, employeeId: string, deletedBy: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current employee for audit
      const currentEmployee = await this.getEmployeeById(tenantId, employeeId);
      if (!currentEmployee) {
        throw new Error('Employee not found');
      }
      
      // Update status to terminated instead of hard delete
      await client.query(
        'UPDATE employees SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND id = $3',
        ['terminated', tenantId, employeeId]
      );
      
      // Create employment history entry
      await this.createEmploymentHistory(
        client,
        tenantId,
        employeeId,
        'termination',
        new Date(),
        { status: currentEmployee.status },
        { status: 'terminated' },
        'Employee termination',
        deletedBy
      );
      
      await client.query('COMMIT');
      
      // Log audit trail
      await this.logAudit(
        tenantId,
        employeeId,
        'delete',
        'employee',
        employeeId,
        currentEmployee,
        { status: 'terminated' },
        deletedBy
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get employee compensation details
   */
  async getEmployeeCompensation(tenantId: string, employeeId: string) {
    const query = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.employee_number,
        esh.base_salary,
        esh.currency,
        esh.effective_date as salary_effective_date,
        esh.change_reason as salary_change_reason,
        COALESCE((
          SELECT SUM(ea.amount) 
          FROM employee_allowances ea 
          WHERE ea.employee_id = e.id 
          AND ea.status = 'active'
          AND (ea.end_date IS NULL OR ea.end_date > CURRENT_DATE)
        ), 0) as total_allowances,
        COALESCE((
          SELECT SUM(ed.amount) 
          FROM employee_deductions ed 
          WHERE ed.employee_id = e.id 
          AND ed.status = 'active'
          AND (ed.end_date IS NULL OR ed.end_date > CURRENT_DATE)
        ), 0) as total_deductions
      FROM employees e
      LEFT JOIN LATERAL (
        SELECT base_salary, currency, effective_date, change_reason
        FROM employee_salary_history esh2
        WHERE esh2.employee_id = e.id 
        AND esh2.status = 'active'
        AND (esh2.end_date IS NULL OR esh2.end_date > CURRENT_DATE)
        ORDER BY esh2.effective_date DESC
        LIMIT 1
      ) esh ON true
      WHERE e.tenant_id = $1 AND e.id = $2
    `;
    
    const result = await this.pool.query(query, [tenantId, employeeId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const grossSalary = parseFloat(row.base_salary || 0);
    const totalAllowances = parseFloat(row.total_allowances || 0);
    const totalDeductions = parseFloat(row.total_deductions || 0);
    const netSalary = grossSalary + totalAllowances - totalDeductions;
    
    return {
      ...row,
      base_salary: grossSalary,
      total_allowances: totalAllowances,
      total_deductions: totalDeductions,
      net_salary: netSalary
    };
  }

  /**
   * Create salary history entry
   */
  async createSalaryHistory(
    client: PoolClient,
    tenantId: string,
    employeeId: string,
    salaryData: Partial<EmployeeSalaryHistory>,
    createdBy: string
  ): Promise<EmployeeSalaryHistory> {
    const query = `
      INSERT INTO employee_salary_history (
        tenant_id, employee_id, base_salary, currency, effective_date, end_date,
        change_reason, change_type, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const result = await client.query(query, [
      tenantId,
      employeeId,
      salaryData.base_salary,
      salaryData.currency || 'USD',
      salaryData.effective_date,
      salaryData.end_date || null,
      salaryData.change_reason || null,
      salaryData.change_type || 'increase',
      'active'
    ]);
    
    return result.rows[0];
  }

  /**
   * Create employment history entry
   */
  async createEmploymentHistory(
    client: PoolClient,
    tenantId: string,
    employeeId: string,
    eventType: string,
    eventDate: Date,
    previousValue: any,
    newValue: any,
    reason: string,
    initiatedBy: string
  ): Promise<void> {
    const query = `
      INSERT INTO employee_employment_history (
        tenant_id, employee_id, event_type, event_date, previous_value, new_value,
        reason, initiated_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    await client.query(query, [
      tenantId,
      employeeId,
      eventType,
      eventDate,
      JSON.stringify(previousValue),
      JSON.stringify(newValue),
      reason,
      initiatedBy,
      'approved'
    ]);
  }

  /**
   * Log audit trail
   */
  async logAudit(
    tenantId: string,
    employeeId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    changedBy: string
  ): Promise<void> {
    const query = `
      INSERT INTO employee_audit_logs (
        tenant_id, employee_id, action, entity_type, entity_id, old_values, new_values, changed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await this.pool.query(query, [
      tenantId,
      employeeId,
      action,
      entityType,
      entityId,
      JSON.stringify(oldValues || {}),
      JSON.stringify(newValues || {}),
      changedBy
    ]);
  }

  /**
   * Get expiring certifications
   */
  async getExpiringCertifications(tenantId: string, daysAhead: number = 30): Promise<ExpiringCertification[]> {
    const query = `
      SELECT 
        ec.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        ec.certification_name,
        ec.expiry_date,
        (ec.expiry_date - CURRENT_DATE) as days_until_expiry
      FROM employee_certifications ec
      JOIN employees e ON e.id = ec.employee_id
      WHERE e.tenant_id = $1
      AND ec.expiry_date IS NOT NULL
      AND ec.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
      AND ec.expiry_date >= CURRENT_DATE
      AND ec.status = 'active'
      ORDER BY ec.expiry_date ASC
    `;
    
    const result = await this.pool.query(query, [tenantId, daysAhead]);
    return result.rows;
  }

  /**
   * Format employee data for response
   */
  private formatEmployee(row: any): Employee {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      employee_number: row.employee_number,
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      middle_name: row.middle_name,
      email: row.email,
      phone: row.phone,
      mobile: row.mobile,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      marital_status: row.marital_status,
      nationality: row.nationality,
      national_id: row.national_id,
      passport_number: row.passport_number,
      address: typeof row.address === 'string' ? JSON.parse(row.address) : row.address,
      emergency_contact: typeof row.emergency_contact === 'string' ? JSON.parse(row.emergency_contact) : row.emergency_contact,
      photo_url: row.photo_url,
      department_id: row.department_id,
      position: row.position,
      employment_type: row.employment_type,
      status: row.status,
      hire_date: row.hire_date,
      probation_end_date: row.probation_end_date,
      termination_date: row.termination_date,
      termination_reason: row.termination_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      // Additional fields from joins
      department_name: row.department_name,
      user_email: row.user_email,
      base_salary: row.base_salary ? parseFloat(row.base_salary) : null,
      salary_currency: row.salary_currency
    };
  }

  /**
   * Get organization chart data
   */
  async getOrganizationChart(tenantId: string) {
    const query = `
      WITH RECURSIVE org_structure AS (
        -- Get root departments (no parent)
        SELECT 
          d.id,
          d.name,
          d.description,
          d.parent_department_id,
          d.manager_id,
          d.budget,
          0 as level,
          d.name as path
        FROM departments d
        WHERE d.tenant_id = $1 
        AND d.parent_department_id IS NULL
        AND d.status = 'active'
        
        UNION ALL
        
        -- Get child departments
        SELECT 
          d.id,
          d.name,
          d.description,
          d.parent_department_id,
          d.manager_id,
          d.budget,
          os.level + 1,
          os.path || ' > ' || d.name
        FROM departments d
        INNER JOIN org_structure os ON d.parent_department_id = os.id
        WHERE d.status = 'active'
      )
      SELECT 
        os.*,
        COUNT(e.id) as employee_count,
        json_agg(
          json_build_object(
            'id', e.id,
            'first_name', e.first_name,
            'last_name', e.last_name,
            'position', e.position,
            'email', e.email,
            'status', e.status
          ) ORDER BY e.first_name, e.last_name
        ) FILTER (WHERE e.id IS NOT NULL) as employees
      FROM org_structure os
      LEFT JOIN employees e ON e.department_id = os.id AND e.status = 'active'
      GROUP BY os.id, os.name, os.description, os.parent_department_id, os.manager_id, os.budget, os.level, os.path
      ORDER BY os.level, os.name
    `;
    
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }
}