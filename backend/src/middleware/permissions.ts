import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permissionService';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware to check if user has specific permission
 */
export const checkPermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, tenantId } = req.context!;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in request context'
        });
      }
      
      const permissionService = new PermissionService(req.app.locals.pool);
      const hasPermission = await permissionService.hasPermission(userId, tenantId, permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required: ${permission}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission verification failed'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 */
export const checkAnyPermission = (permissions: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, tenantId } = req.context!;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in request context'
        });
      }
      
      const permissionService = new PermissionService(req.app.locals.pool);
      
      for (const permission of permissions) {
        const hasPermission = await permissionService.hasPermission(userId, tenantId, permission);
        if (hasPermission) {
          return next();
        }
      }
      
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required one of: ${permissions.join(', ')}`
      });
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission verification failed'
      });
    }
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 */
export const checkAllPermissions = (permissions: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, tenantId } = req.context!;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID not found in request context'
        });
      }
      
      const permissionService = new PermissionService(req.app.locals.pool);
      
      for (const permission of permissions) {
        const hasPermission = await permissionService.hasPermission(userId, tenantId, permission);
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Insufficient permissions. Required all of: ${permissions.join(', ')}`
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission verification failed'
      });
    }
  };
};

/**
 * Middleware to check if user can access specific employee data
 */
export const checkEmployeeAccess = (accessType: 'own' | 'all' | 'department') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, tenantId, role } = req.context!;
      const { id } = req.params;
      
      // Super admin and tenant admin have full access
      if (role === 'super_admin' || role === 'tenant_admin') {
        return next();
      }
      
      // HR manager has access to all employees
      if (role === 'hr_manager') {
        return next();
      }
      
      if (!userId || !id) {
        return res.status(400).json({
          success: false,
          message: 'Missing user ID or employee ID'
        });
      }
      
      const pool = req.app.locals.pool;
      
      // Check if user is accessing their own data
      if (accessType === 'own') {
        const query = 'SELECT id FROM employees WHERE user_id = $1 AND tenant_id = $2';
        const result = await pool.query(query, [userId, tenantId]);
        
        if (result.rows.length > 0 && result.rows[0].id === id) {
          return next();
        }
      }
      
      // Check department-based access
      if (accessType === 'department') {
        const query = `
          SELECT e.id 
          FROM employees e
          WHERE e.user_id = $1 
          AND e.tenant_id = $2 
          AND e.department_id = (
            SELECT department_id 
            FROM employees 
            WHERE user_id = $1 AND tenant_id = $2
          )
        `;
        const result = await pool.query(query, [userId, tenantId]);
        
        if (result.rows.some(row => row.id === id)) {
          return next();
        }
      }
      
      return res.status(403).json({
        success: false,
        message: 'Access denied to this employee record'
      });
    } catch (error) {
      console.error('Employee access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Access verification failed'
      });
    }
  };
};