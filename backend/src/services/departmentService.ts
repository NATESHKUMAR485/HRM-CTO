import { Pool } from 'pg';
import { Department } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DepartmentService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create new department
   */
  async createDepartment(tenantId: string, departmentData: Partial<Department>, createdBy: string): Promise<Department> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO departments (
          tenant_id, name, description, parent_department_id, manager_id, budget, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        tenantId,
        departmentData.name,
        departmentData.description || null,
        departmentData.parent_department_id || null,
        departmentData.manager_id || null,
        departmentData.budget || null,
        departmentData.status || 'active'
      ]);
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all departments for a tenant
   */
  async getDepartments(tenantId: string): Promise<Department[]> {
    const query = `
      SELECT d.*, 
        e.first_name || ' ' || e.last_name as manager_name,
        p.name as parent_department_name,
        COUNT(emp.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN departments p ON d.parent_department_id = p.id
      LEFT JOIN employees emp ON emp.department_id = d.id AND emp.status = 'active'
      WHERE d.tenant_id = $1
      GROUP BY d.id, e.first_name, e.last_name, p.name
      ORDER BY d.name
    `;
    
    const result = await this.pool.query(query, [tenantId]);
    return result.rows.map(row => ({
      ...row,
      employee_count: parseInt(row.employee_count) || 0
    }));
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(tenantId: string, departmentId: string): Promise<Department | null> {
    const query = `
      SELECT d.*, 
        e.first_name || ' ' || e.last_name as manager_name,
        p.name as parent_department_name
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN departments p ON d.parent_department_id = p.id
      WHERE d.tenant_id = $1 AND d.id = $2
    `;
    
    const result = await this.pool.query(query, [tenantId, departmentId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update department
   */
  async updateDepartment(
    tenantId: string, 
    departmentId: string, 
    updateData: Partial<Department>, 
    updatedBy: string
  ): Promise<Department> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build update query dynamically
      const updateFields = [];
      const updateParams: any[] = [tenantId, departmentId];
      let paramCount = 3;
      
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
          updateFields.push(`${key} = $${paramCount}`);
          updateParams.push(value);
          paramCount++;
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      const updateQuery = `
        UPDATE departments 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, updateParams);
      
      if (result.rows.length === 0) {
        throw new Error('Department not found');
      }
      
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete department (soft delete)
   */
  async deleteDepartment(tenantId: string, departmentId: string, deletedBy: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if department has employees
      const employeeCheck = await client.query(
        'SELECT COUNT(*) as count FROM employees WHERE department_id = $1 AND status = $2',
        [departmentId, 'active']
      );
      
      if (parseInt(employeeCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete department with active employees');
      }
      
      // Check if department has child departments
      const childCheck = await client.query(
        'SELECT COUNT(*) as count FROM departments WHERE parent_department_id = $1 AND status = $2',
        [departmentId, 'active']
      );
      
      if (parseInt(childCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete department with child departments');
      }
      
      // Soft delete the department
      await client.query(
        'UPDATE departments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND id = $3',
        ['inactive', tenantId, departmentId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy(tenantId: string) {
    const query = `
      WITH RECURSIVE department_tree AS (
        -- Get root departments
        SELECT 
          d.id,
          d.name,
          d.description,
          d.parent_department_id,
          d.manager_id,
          d.budget,
          0 as level,
          d.name as path,
          ARRAY[d.id] as ancestry
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
          dt.level + 1,
          dt.path || ' > ' || d.name,
          dt.ancestry || d.id
        FROM departments d
        INNER JOIN department_tree dt ON d.parent_department_id = dt.id
        WHERE d.status = 'active'
      )
      SELECT 
        dt.*,
        e.first_name || ' ' || e.last_name as manager_name,
        COUNT(emp.id) as employee_count
      FROM department_tree dt
      LEFT JOIN employees e ON dt.manager_id = e.id
      LEFT JOIN employees emp ON emp.department_id = dt.id AND emp.status = 'active'
      GROUP BY dt.id, dt.name, dt.description, dt.parent_department_id, dt.manager_id, dt.budget, dt.level, dt.path, dt.ancestry, e.first_name, e.last_name
      ORDER BY dt.level, dt.name
    `;
    
    const result = await this.pool.query(query, [tenantId]);
    return result.rows;
  }

  /**
   * Get employees by department
   */
  async getDepartmentEmployees(tenantId: string, departmentId: string) {
    const query = `
      SELECT 
        e.id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.email,
        e.position,
        e.status,
        e.hire_date,
        esh.base_salary,
        esh.currency
      FROM employees e
      LEFT JOIN LATERAL (
        SELECT base_salary, currency
        FROM employee_salary_history esh2
        WHERE esh2.employee_id = e.id 
        AND esh2.status = 'active'
        AND (esh2.end_date IS NULL OR esh2.end_date > CURRENT_DATE)
        ORDER BY esh2.effective_date DESC
        LIMIT 1
      ) esh ON true
      WHERE e.tenant_id = $1 
      AND e.department_id = $2 
      AND e.status != 'terminated'
      ORDER BY e.first_name, e.last_name
    `;
    
    const result = await this.pool.query(query, [tenantId, departmentId]);
    return result.rows;
  }

  /**
   * Transfer employees to another department
   */
  async transferEmployees(
    tenantId: string, 
    employeeIds: string[], 
    newDepartmentId: string, 
    reason: string,
    transferredBy: string
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const employeeId of employeeIds) {
        // Update employee department
        await client.query(
          'UPDATE employees SET department_id = $1, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $2 AND id = $3',
          [newDepartmentId, tenantId, employeeId]
        );
        
        // Create employment history entry
        await client.query(
          `INSERT INTO employee_employment_history (
            tenant_id, employee_id, event_type, event_date, previous_value, new_value, reason, initiated_by, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            tenantId,
            employeeId,
            'transfer',
            new Date(),
            JSON.stringify({ department_id: 'previous' }),
            JSON.stringify({ department_id: newDepartmentId }),
            reason,
            transferredBy,
            'approved'
          ]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}