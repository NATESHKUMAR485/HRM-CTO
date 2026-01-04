import { Request, Response } from 'express';
import { LeaveService } from '../../services/leaves/leaveService';
import { validateRequest } from '../../middleware/validation';
import { 
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
  approveLeaveRequestSchema,
  leaveRequestFiltersSchema,
  leaveBalanceFiltersSchema,
  leaveReportFiltersSchema
} from '../../validators/leaves';
import { ApiResponse } from '../../types/leaves';

export class LeaveController {
  private leaveService: LeaveService;

  constructor() {
    this.leaveService = new LeaveService();
  }

  // =============================================
  // LEAVE REQUESTS
  // =============================================

  /**
   * Get leave requests with filters and pagination
   */
  async getLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = validateRequest(leaveRequestFiltersSchema, req.query);
      
      const result = await this.leaveService.getLeaveRequests(tenantId, filters);
      
      const response: ApiResponse = {
        success: true,
        data: result.data,
        pagination: {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (parseInt(req.query.limit as string) || 20))
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch leave requests'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get single leave request by ID
   */
  async getLeaveRequestById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { id } = req.params;

      const leaveRequest = await this.leaveService.getLeaveRequestById(tenantId, id);
      
      if (!leaveRequest) {
        const response: ApiResponse = {
          success: false,
          message: 'Leave request not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: leaveRequest
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch leave request'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create new leave request
   */
  async createLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const employeeId = req.user.employee_id;
      const requestData = validateRequest(createLeaveRequestSchema, req.body);

      const leaveRequest = await this.leaveService.createLeaveRequest(tenantId, requestData, employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'Leave request submitted successfully',
        data: leaveRequest
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create leave request'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update leave request (employee can update pending requests)
   */
  async updateLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const employeeId = req.user.employee_id;
      const { id } = req.params;
      const requestData = validateRequest(updateLeaveRequestSchema, req.body);

      const leaveRequest = await this.leaveService.updateLeaveRequest(tenantId, id, requestData, employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'Leave request updated successfully',
        data: leaveRequest
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update leave request'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Approve/reject/forward leave request
   */
  async approveLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const approverId = req.user.id;
      const { id } = req.params;
      const { action, comments, forwarded_to_id } = validateRequest(approveLeaveRequestSchema, req.body);

      const leaveRequest = await this.leaveService.approveLeaveRequest(tenantId, id, approverId, action, comments, forwarded_to_id);

      const response: ApiResponse = {
        success: true,
        message: `Leave request ${action}ed successfully`,
        data: leaveRequest
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process leave request'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // LEAVE BALANCE
  // =============================================

  /**
   * Get leave balance for current user or specified employee
   */
  async getLeaveBalance(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const currentUserEmployeeId = req.user.employee_id;
      const filters = validateRequest(leaveBalanceFiltersSchema, req.query);
      
      // Check permissions - users can view their own balance, managers can view team, HR can view all
      let employeeId = filters.employee_id || currentUserEmployeeId;
      
      // Permission check would happen in middleware, for now assume valid
      const balances = await this.leaveService.getLeaveBalance(tenantId, employeeId, filters);

      const response: ApiResponse = {
        success: true,
        data: {
          employee_id: employeeId,
          balances: balances
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch leave balance'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get leave balance summary for dashboard
   */
  async getLeaveBalanceSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const employeeId = req.user.employee_id;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      const balances = await this.leaveService.getLeaveBalance(tenantId, employeeId, { year });

      // Calculate summary totals
      const summary = balances.reduce((acc, balance) => {
        acc.total_allocated += parseFloat(balance.allocated_amount.toString());
        acc.total_used += parseFloat(balance.used_amount.toString());
        acc.total_remaining += parseFloat(balance.remaining_amount.toString());
        return acc;
      }, {
        total_allocated: 0,
        total_used: 0,
        total_remaining: 0,
        balance_count: balances.length
      });

      const response: ApiResponse = {
        success: true,
        data: {
          employee_id: employeeId,
          year,
          summary,
          balances
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch leave balance summary'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // LEAVE TYPES (HR/Admin Only)
  // =============================================

  /**
   * Get leave types
   */
  async getLeaveTypes(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        status: req.query.status || 'active',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await this.leaveService.getLeaveTypes(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limit)
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch leave types'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create new leave type
   */
  async createLeaveType(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const leaveTypeData = req.body;

      const leaveType = await this.leaveService.createLeaveType(tenantId, leaveTypeData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Leave type created successfully',
        data: leaveType
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create leave type'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update leave type
   */
  async updateLeaveType(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const updatedBy = req.user.id;
      const { id } = req.params;
      const leaveTypeData = req.body;

      const leaveType = await this.leaveService.updateLeaveType(tenantId, id, leaveTypeData, updatedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Leave type updated successfully',
        data: leaveType
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update leave type'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // LEAVE ALLOCATIONS (HR/Admin Only)
  // =============================================

  /**
   * Create leave allocation for employees
   */
  async createLeaveAllocation(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const allocatedBy = req.user.id;
      const allocationData = req.body;

      const allocations = await this.leaveService.createLeaveAllocation(tenantId, allocationData, allocatedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Leave allocation created successfully',
        data: allocations
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create leave allocation'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // REPORTS
  // =============================================

  /**
   * Get leave reports
   */
  async getLeaveReports(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = validateRequest(leaveReportFiltersSchema, req.query);
      const { report_type, format = 'csv' } = filters;

      // This would integrate with a reporting service
      // For now, return a placeholder response
      const response: ApiResponse = {
        success: true,
        message: `Leave ${report_type} report generated`,
        data: {
          report_type,
          format,
          generated_at: new Date(),
          download_url: `/api/v1/leaves/reports/download/${report_type}`
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate leave report'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get leave utilization report
   */
  async getLeaveUtilizationReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const {
        from_date,
        to_date,
        department_ids,
        location_ids,
        employee_ids
      } = req.query;

      // This would generate a detailed utilization report
      const response: ApiResponse = {
        success: true,
        message: 'Leave utilization report generated',
        data: {
          report_period: {
            from: from_date,
            to: to_date
          },
          filters: {
            departments: department_ids,
            locations: location_ids,
            employees: employee_ids
          },
          // Placeholder data
          summary: {
            total_employees: 0,
            total_allocated: 0,
            total_used: 0,
            utilization_percentage: 0
          }
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate utilization report'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get leave compliance report
   */
  async getLeaveComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const {
        from_date,
        to_date,
        compliance_rules
      } = req.query;

      const response: ApiResponse = {
        success: true,
        message: 'Leave compliance report generated',
        data: {
          report_period: {
            from: from_date,
            to: to_date
          },
          compliance_rules: compliance_rules,
          // Placeholder compliance data
          violations: [],
          recommendations: [],
          compliance_score: 100
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate compliance report'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // LEAVE ENCASHMENT
  // =============================================

  /**
   * Request leave encashment
   */
  async requestLeaveEncashment(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const employeeId = req.user.employee_id;
      const encashmentData = req.body;

      // This would create a leave encashment request
      const response: ApiResponse = {
        success: true,
        message: 'Leave encashment request submitted successfully',
        data: {
          employee_id: employeeId,
          requested_days: encashmentData.requested_days,
          status: 'pending',
          requested_at: new Date()
        }
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit encashment request'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get leave encashment requests (HR/Admin)
   */
  async getLeaveEncashmentRequests(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        status: req.query.status,
        employee_id: req.query.employee_id,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      // Placeholder response
      const response: ApiResponse = {
        success: true,
        data: [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          totalPages: 0
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch encashment requests'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // DASHBOARD DATA
  // =============================================

  /**
   * Get leave dashboard data
   */
  async getLeaveDashboard(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const employeeId = req.user.employee_id;

      // Get current user's leave data
      const [balances, recentRequests] = await Promise.all([
        this.leaveService.getLeaveBalance(tenantId, employeeId),
        this.leaveService.getLeaveRequests(tenantId, {
          employee_id: employeeId,
          page: 1,
          limit: 5,
          sort_by: 'submitted_at',
          sort_order: 'DESC'
        })
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          leave_balances: balances,
          recent_requests: recentRequests.data,
          pending_requests: recentRequests.data.filter((req: any) => req.status === 'pending').length,
          upcoming_leaves: recentRequests.data.filter((req: any) => 
            req.status === 'approved' && new Date(req.from_date) > new Date()
          ).length
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get team leave dashboard (for managers)
   */
  async getTeamLeaveDashboard(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const managerId = req.user.id;

      // Get team members' leave data
      const pendingRequests = await this.leaveService.getLeaveRequests(tenantId, {
        status: 'pending',
        page: 1,
        limit: 10
      });

      const response: ApiResponse = {
        success: true,
        data: {
          pending_team_requests: pendingRequests.data,
          total_pending: pendingRequests.data.length,
          team_on_leave_today: 0, // Would calculate based on approved leaves
          team_leave_calendar: [] // Would generate calendar view
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch team dashboard data'
      };
      res.status(400).json(response);
    }
  }
}