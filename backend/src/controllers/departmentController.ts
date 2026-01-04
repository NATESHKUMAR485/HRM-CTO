import { Request, Response } from 'express';
import { DepartmentService } from '../services/departmentService';
import { AuthenticatedRequest } from '../types';
import { 
  createDepartmentSchema, 
  updateDepartmentSchema 
} from '../utils/employeeValidation';

export class DepartmentController {
  private departmentService: DepartmentService;

  constructor(departmentService: DepartmentService) {
    this.departmentService = departmentService;
  }

  /**
   * Get all departments
   */
  async getDepartments(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      
      const departments = await this.departmentService.getDepartments(tenantId);
      
      res.json({
        success: true,
        data: departments
      });
    } catch (error) {
      console.error('Get departments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch departments'
      });
    }
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      const department = await this.departmentService.getDepartmentById(tenantId, id);
      
      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }

      res.json({
        success: true,
        data: department
      });
    } catch (error) {
      console.error('Get department error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department'
      });
    }
  }

  /**
   * Create new department
   */
  async createDepartment(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      
      // Validate request body
      const { error, value } = createDepartmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department data',
          errors: error.details
        });
      }

      const department = await this.departmentService.createDepartment(tenantId, value, userId);
      
      res.status(201).json({
        success: true,
        data: department,
        message: 'Department created successfully'
      });
    } catch (error) {
      console.error('Create department error:', error);
      
      if (error.message?.includes('unique constraint')) {
        return res.status(409).json({
          success: false,
          message: 'Department with this name already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create department'
      });
    }
  }

  /**
   * Update department
   */
  async updateDepartment(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      // Validate request body
      const { error, value } = updateDepartmentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department data',
          errors: error.details
        });
      }

      const department = await this.departmentService.updateDepartment(tenantId, id, value, userId);
      
      res.json({
        success: true,
        data: department,
        message: 'Department updated successfully'
      });
    } catch (error) {
      console.error('Update department error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update department'
      });
    }
  }

  /**
   * Delete department
   */
  async deleteDepartment(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      await this.departmentService.deleteDepartment(tenantId, id, userId);
      
      res.json({
        success: true,
        message: 'Department deleted successfully'
      });
    } catch (error) {
      console.error('Delete department error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
      
      if (error.message?.includes('Cannot delete department')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete department'
      });
    }
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      
      const hierarchy = await this.departmentService.getDepartmentHierarchy(tenantId);
      
      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      console.error('Get department hierarchy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department hierarchy'
      });
    }
  }

  /**
   * Get employees by department
   */
  async getDepartmentEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Department ID is required'
        });
      }

      const employees = await this.departmentService.getDepartmentEmployees(tenantId, id);
      
      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      console.error('Get department employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch department employees'
      });
    }
  }

  /**
   * Transfer employees to another department
   */
  async transferEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      const { employee_ids, reason } = req.body;
      
      if (!id || !employee_ids || !Array.isArray(employee_ids)) {
        return res.status(400).json({
          success: false,
          message: 'Department ID and employee IDs are required'
        });
      }

      await this.departmentService.transferEmployees(
        tenantId, 
        employee_ids, 
        id, 
        reason || 'Department transfer',
        userId
      );
      
      res.json({
        success: true,
        message: 'Employees transferred successfully'
      });
    } catch (error) {
      console.error('Transfer employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to transfer employees'
      });
    }
  }
}