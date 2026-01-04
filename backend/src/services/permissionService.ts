import { Pool } from 'pg';
import { Role, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PermissionService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get user permissions from database
   */
  async getUserPermissions(userId: string, tenantId: string | null): Promise<Record<string, boolean>> {
    // Platform-level permissions (super_admin)
    const platformQuery = `
      SELECT p.permissions
      FROM users u
      JOIN roles r ON r.id = ANY(
        SELECT ur.role_id 
        FROM user_roles ur 
        WHERE ur.user_id = u.id
      )
      WHERE u.id = $1 AND r.tenant_id IS NULL
    `;
    
    const platformResult = await this.pool.query(platformQuery, [userId]);
    
    // Tenant-level permissions
    const tenantQuery = `
      SELECT r.permissions
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.id = $1 AND r.tenant_id = $2
    `;
    
    const tenantResult = await this.pool.query(tenantQuery, [userId, tenantId]);
    
    // Merge permissions (tenant permissions override platform)
    const mergedPermissions: Record<string, boolean> = {};
    
    // Start with platform permissions
    for (const row of platformResult.rows) {
      Object.assign(mergedPermissions, row.permissions);
    }
    
    // Override with tenant permissions
    for (const row of tenantResult.rows) {
      Object.assign(mergedPermissions, row.permissions);
    }
    
    return mergedPermissions;
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, tenantId: string | null, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, tenantId);
    return permissions[permission] === true;
  }

  /**
   * Get all roles for a tenant (for admin panel)
   */
  async getTenantRoles(tenantId: string): Promise<Role[]> {
    const query = `
      SELECT r.*, 
        COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON ur.role_id = r.id
      WHERE r.tenant_id = $1
      GROUP BY r.id
      ORDER BY r.name
    `;
    
    const result = await this.pool.query(query, [tenantId]);
    return result.rows.map(row => ({
      ...row,
      user_count: parseInt(row.user_count) || 0
    }));
  }

  /**
   * Create new role for tenant
   */
  async createRole(
    tenantId: string, 
    roleData: { name: string; description?: string; permissions: Record<string, boolean> },
    createdBy: string
  ): Promise<Role> {
    const query = `
      INSERT INTO roles (tenant_id, name, description, permissions)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      tenantId,
      roleData.name,
      roleData.description || null,
      JSON.stringify(roleData.permissions)
    ]);
    
    return result.rows[0];
  }

  /**
   * Update role permissions
   */
  async updateRole(
    tenantId: string,
    roleId: string,
    roleData: { name?: string; description?: string; permissions?: Record<string, boolean> },
    updatedBy: string
  ): Promise<Role> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build update query dynamically
      const updateFields = [];
      const updateParams: any[] = [tenantId, roleId];
      let paramCount = 3;
      
      for (const [key, value] of Object.entries(roleData)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          
          if (key === 'permissions') {
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
        UPDATE roles 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND id = $2
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, updateParams);
      
      if (result.rows.length === 0) {
        throw new Error('Role not found');
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
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string, assignedBy: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if assignment already exists
      const existingQuery = 'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2';
      const existingResult = await client.query(existingQuery, [userId, roleId]);
      
      if (existingResult.rows.length === 0) {
        // Create new assignment
        await client.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, roleId]
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

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      await client.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [userId, roleId]
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
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const query = `
      SELECT r.*
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get role by ID
   */
  async getRoleById(tenantId: string, roleId: string): Promise<Role | null> {
    const query = 'SELECT * FROM roles WHERE tenant_id = $1 AND id = $2';
    const result = await this.pool.query(query, [tenantId, roleId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Delete role
   */
  async deleteRole(tenantId: string, roleId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if role has users assigned
      const userCheck = await client.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
        [roleId]
      );
      
      if (parseInt(userCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete role with assigned users');
      }
      
      // Delete role
      await client.query('DELETE FROM roles WHERE tenant_id = $1 AND id = $2', [tenantId, roleId]);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get default permissions for employee management module
   */
  getDefaultEmployeePermissions(): Record<string, boolean> {
    return {
      // Employee CRUD
      'employees.view_all': false,
      'employees.view_own': false,
      'employees.create': false,
      'employees.edit_all': false,
      'employees.edit_own': false,
      'employees.delete': false,
      
      // Compensation
      'compensation.view': false,
      'compensation.edit': false,
      'compensation.approve': false,
      
      // Bank & Tax
      'bank_details.view': false,
      'bank_details.edit': false,
      'tax_info.view': false,
      'tax_info.edit': false,
      
      // Skills & Certifications
      'skills.view': false,
      'skills.edit': false,
      'certifications.view': false,
      'certifications.edit': false,
      'certifications.verify': false,
      
      // Documents
      'documents.view': false,
      'documents.upload': false,
      'documents.download': false,
      'documents.delete': false,
      
      // Benefits
      'benefits.view': false,
      'benefits.edit': false,
      
      // Organization
      'org_chart.view': false,
      'department.manage': false,
      
      // Bulk Operations
      'bulk.import': false,
      'bulk.export': false,
      
      // Audit
      'audit_logs.view': false,
      
      // Approvals
      'approvals.view': false,
      'approvals.approve': false
    };
  }

  /**
   * Get permissions template for role assignment
   */
  getPermissionsTemplate(roleType: 'employee' | 'hr_manager' | 'tenant_admin'): Record<string, boolean> {
    const permissions = this.getDefaultEmployeePermissions();
    
    switch (roleType) {
      case 'employee':
        // Employee can view own data, request leave, etc.
        permissions['employees.view_own'] = true;
        permissions['skills.view'] = true;
        permissions['certifications.view'] = true;
        break;
        
      case 'hr_manager':
        // HR Manager has comprehensive access
        permissions['employees.view_all'] = true;
        permissions['employees.create'] = true;
        permissions['employees.edit_all'] = true;
        permissions['compensation.view'] = true;
        permissions['compensation.edit'] = true;
        permissions['bank_details.view'] = true;
        permissions['tax_info.view'] = true;
        permissions['skills.view'] = true;
        permissions['skills.edit'] = true;
        permissions['certifications.view'] = true;
        permissions['certifications.edit'] = true;
        permissions['certifications.verify'] = true;
        permissions['documents.view'] = true;
        permissions['documents.upload'] = true;
        permissions['documents.download'] = true;
        permissions['benefits.view'] = true;
        permissions['benefits.edit'] = true;
        permissions['org_chart.view'] = true;
        permissions['bulk.import'] = true;
        permissions['bulk.export'] = true;
        permissions['audit_logs.view'] = true;
        permissions['approvals.view'] = true;
        permissions['approvals.approve'] = true;
        break;
        
      case 'tenant_admin':
        // Tenant Admin has full access including department management
        Object.keys(permissions).forEach(key => {
          permissions[key] = true;
        });
        permissions['department.manage'] = true;
        break;
    }
    
    return permissions;
  }

  /**
   * Validate permission key format
   */
  isValidPermissionKey(permission: string): boolean {
    const permissionPattern = /^[a-z_]+\.[a-z_]+$/;
    return permissionPattern.test(permission);
  }

  /**
   * Get all available permission keys
   */
  getAllPermissionKeys(): string[] {
    const permissions = this.getDefaultEmployeePermissions();
    return Object.keys(permissions);
  }

  /**
   * Create default roles for new tenant
   */
  async createDefaultRoles(tenantId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create Employee role
      await client.query(
        'INSERT INTO roles (tenant_id, name, permissions) VALUES ($1, $2, $3)',
        [tenantId, 'employee', JSON.stringify(this.getPermissionsTemplate('employee'))]
      );
      
      // Create HR Manager role
      await client.query(
        'INSERT INTO roles (tenant_id, name, permissions) VALUES ($1, $2, $3)',
        [tenantId, 'hr_manager', JSON.stringify(this.getPermissionsTemplate('hr_manager'))]
      );
      
      // Create Tenant Admin role
      await client.query(
        'INSERT INTO roles (tenant_id, name, permissions) VALUES ($1, $2, $3)',
        [tenantId, 'tenant_admin', JSON.stringify(this.getPermissionsTemplate('tenant_admin'))]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}