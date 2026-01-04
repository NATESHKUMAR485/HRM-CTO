import { Request, Response } from 'express';
import { EmployeeService } from '../services/employeeService';
import { AuthenticatedRequest } from '../types';
import { 
  createEmployeeSchema, 
  updateEmployeeSchema, 
  employeeSearchFiltersSchema,
  paginationSchema,
  terminateEmployeeSchema,
  activateEmployeeSchema,
  suspendEmployeeSchema
} from '../utils/employeeValidation';

export class EmployeeController {
  private employeeService: EmployeeService;

  constructor(employeeService: EmployeeService) {
    this.employeeService = employeeService;
  }

  /**
   * Get employees list with pagination and filters
   */
  async getEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      
      // Validate and parse query parameters
      const { error: filterError, value: filters } = employeeSearchFiltersSchema.validate(req.query);
      if (filterError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid filter parameters',
          errors: filterError.details
        });
      }

      const { error: paginationError, value: pagination } = paginationSchema.validate(req.query);
      if (paginationError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters',
          errors: paginationError.details
        });
      }

      const result = await this.employeeService.getEmployees(tenantId, filters, pagination);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get employees error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employees'
      });
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployeeById(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      const employee = await this.employeeService.getEmployeeById(tenantId, id);
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        data: employee
      });
    } catch (error) {
      console.error('Get employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee'
      });
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      
      // Validate request body
      const { error, value } = createEmployeeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee data',
          errors: error.details
        });
      }

      const employee = await this.employeeService.createEmployee(tenantId, value, userId);
      
      res.status(201).json({
        success: true,
        data: employee,
        message: 'Employee created successfully'
      });
    } catch (error) {
      console.error('Create employee error:', error);
      
      if (error.message?.includes('unique constraint')) {
        return res.status(409).json({
          success: false,
          message: 'Employee with this email or number already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create employee'
      });
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      // Validate request body
      const { error, value } = updateEmployeeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee data',
          errors: error.details
        });
      }

      const employee = await this.employeeService.updateEmployee(tenantId, id, value, userId);
      
      res.json({
        success: true,
        data: employee,
        message: 'Employee updated successfully'
      });
    } catch (error) {
      console.error('Update employee error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to update employee'
      });
    }
  }

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      await this.employeeService.deleteEmployee(tenantId, id, userId);
      
      res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      console.error('Delete employee error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete employee'
      });
    }
  }

  /**
   * Get employee compensation details
   */
  async getEmployeeCompensation(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      const compensation = await this.employeeService.getEmployeeCompensation(tenantId, id);
      
      if (!compensation) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        data: compensation
      });
    } catch (error) {
      console.error('Get compensation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch compensation details'
      });
    }
  }

  /**
   * Get organization chart
   */
  async getOrganizationChart(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      
      const orgChart = await this.employeeService.getOrganizationChart(tenantId);
      
      res.json({
        success: true,
        data: orgChart
      });
    } catch (error) {
      console.error('Get organization chart error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch organization chart'
      });
    }
  }

  /**
   * Get expiring certifications
   */
  async getExpiringCertifications(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId } = req.context!;
      const daysAhead = parseInt(req.query.days_ahead as string) || 30;
      
      const expiringCerts = await this.employeeService.getExpiringCertifications(tenantId, daysAhead);
      
      res.json({
        success: true,
        data: expiringCerts
      });
    } catch (error) {
      console.error('Get expiring certifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch expiring certifications'
      });
    }
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      const { error, value } = terminateEmployeeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid termination data',
          errors: error.details
        });
      }

      // Update employee status and add termination details
      await this.employeeService.updateEmployee(tenantId, id, {
        status: 'terminated',
        termination_date: value.termination_date,
        termination_reason: value.termination_reason
      }, userId);
      
      res.json({
        success: true,
        message: 'Employee terminated successfully'
      });
    } catch (error) {
      console.error('Terminate employee error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to terminate employee'
      });
    }
  }

  /**
   * Activate employee
   */
  async activateEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      const { error, value } = activateEmployeeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid activation data',
          errors: error.details
        });
      }

      await this.employeeService.updateEmployee(tenantId, id, {
        status: 'active',
        termination_date: null,
        termination_reason: null
      }, userId);
      
      res.json({
        success: true,
        message: 'Employee activated successfully'
      });
    } catch (error) {
      console.error('Activate employee error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to activate employee'
      });
    }
  }

  /**
   * Suspend employee
   */
  async suspendEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      const { error, value } = suspendEmployeeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid suspension data',
          errors: error.details
        });
      }

      await this.employeeService.updateEmployee(tenantId, id, {
        status: 'suspended'
      }, userId);
      
      res.json({
        success: true,
        message: 'Employee suspended successfully'
      });
    } catch (error) {
      console.error('Suspend employee error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to suspend employee'
      });
    }
  }

  /**
   * Complete probation
   */
  async completeProbation(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenantId, userId } = req.context!;
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      await this.employeeService.updateEmployee(tenantId, id, {
        probation_end_date: new Date()
      }, userId);
      
      res.json({
        success: true,
        message: 'Probation completed successfully'
      });
    } catch (error) {
      console.error('Complete probation error:', error);
      
      if (error.message?.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to complete probation'
      });
    }
  }
}