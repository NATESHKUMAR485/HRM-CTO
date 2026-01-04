import { Router } from 'express';
import { LeaveController } from '../controllers/leaves/leaveController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/permissions';
import { validateRequest } from '../middleware/validation';

const router = Router();
const leaveController = new LeaveController();

// =============================================
// LEAVE REQUESTS
// =============================================

/**
 * GET /api/v1/leaves/requests
 * Get leave requests with filters and pagination
 */
router.get('/requests', 
  authenticate,
  leaveController.getLeaveRequests.bind(leaveController)
);

/**
 * GET /api/v1/leaves/requests/:id
 * Get single leave request by ID
 */
router.get('/requests/:id',
  authenticate,
  leaveController.getLeaveRequestById.bind(leaveController)
);

/**
 * POST /api/v1/leaves/requests
 * Create new leave request
 */
router.post('/requests',
  authenticate,
  leaveController.createLeaveRequest.bind(leaveController)
);

/**
 * PUT /api/v1/leaves/requests/:id
 * Update leave request (employee can update pending requests)
 */
router.put('/requests/:id',
  authenticate,
  leaveController.updateLeaveRequest.bind(leaveController)
);

/**
 * POST /api/v1/leaves/requests/:id/approve
 * Approve/reject/forward leave request
 */
router.post('/requests/:id/approve',
  authenticate,
  authorize(['approve_leave_request']),
  leaveController.approveLeaveRequest.bind(leaveController)
);

/**
 * POST /api/v1/leaves/requests/:id/reject
 * Alias for approve with reject action
 */
router.post('/requests/:id/reject',
  authenticate,
  authorize(['approve_leave_request']),
  (req, res) => {
    req.body.action = 'reject';
    return leaveController.approveLeaveRequest(req, res);
  }
);

/**
 * POST /api/v1/leaves/requests/:id/resubmit
 * Resubmit rejected request
 */
router.post('/requests/:id/resubmit',
  authenticate,
  leaveController.createLeaveRequest.bind(leaveController) // Would need separate logic
);

/**
 * DELETE /api/v1/leaves/requests/:id
 * Cancel leave request
 */
router.delete('/requests/:id',
  authenticate,
  (req, res) => {
    // Would implement cancel logic
    res.status(501).json({
      success: false,
      message: 'Cancel leave request not yet implemented'
    });
  }
);

// =============================================
// LEAVE BALANCE
// =============================================

/**
 * GET /api/v1/leaves/balance
 * Get leave balance for current user
 */
router.get('/balance',
  authenticate,
  leaveController.getLeaveBalance.bind(leaveController)
);

/**
 * GET /api/v1/leaves/balance/:employee_id
 * Get leave balance for specific employee (with permission)
 */
router.get('/balance/:employee_id',
  authenticate,
  authorize(['view_team_leave_balance', 'view_all_leave_balance']),
  leaveController.getLeaveBalance.bind(leaveController)
);

/**
 * GET /api/v1/leaves/balance/summary
 * Get leave balance summary for dashboard
 */
router.get('/balance/summary',
  authenticate,
  leaveController.getLeaveBalanceSummary.bind(leaveController)
);

// =============================================
// LEAVE TYPES (HR/Admin Only)
// =============================================

/**
 * GET /api/v1/leaves/types
 * Get leave types
 */
router.get('/types',
  authenticate,
  leaveController.getLeaveTypes.bind(leaveController)
);

/**
 * POST /api/v1/leaves/types
 * Create new leave type
 */
router.post('/types',
  authenticate,
  authorize(['configure_leave_types']),
  leaveController.createLeaveType.bind(leaveController)
);

/**
 * PUT /api/v1/leaves/types/:id
 * Update leave type
 */
router.put('/types/:id',
  authenticate,
  authorize(['configure_leave_types']),
  leaveController.updateLeaveType.bind(leaveController)
);

/**
 * DELETE /api/v1/leaves/types/:id
 * Delete leave type
 */
router.delete('/types/:id',
  authenticate,
  authorize(['configure_leave_types']),
  (req, res) => {
    // Would implement delete logic
    res.status(501).json({
      success: false,
      message: 'Delete leave type not yet implemented'
    });
  }
);

// =============================================
// LEAVE ALLOCATIONS (HR/Admin Only)
// =============================================

/**
 * GET /api/v1/leaves/allocations/:employee_id
 * Get leave allocations for employee
 */
router.get('/allocations/:employee_id',
  authenticate,
  authorize(['manage_leave_allocations']),
  (req, res) => {
    // Would implement get allocations
    res.status(501).json({
      success: false,
      message: 'Get leave allocations not yet implemented'
    });
  }
);

/**
 * POST /api/v1/leaves/allocations
 * Create leave allocation for employees
 */
router.post('/allocations',
  authenticate,
  authorize(['manage_leave_allocations']),
  leaveController.createLeaveAllocation.bind(leaveController)
);

/**
 * PUT /api/v1/leaves/allocations/:id
 * Update leave allocation
 */
router.put('/allocations/:id',
  authenticate,
  authorize(['manage_leave_allocations']),
  (req, res) => {
    // Would implement update allocation
    res.status(501).json({
      success: false,
      message: 'Update leave allocation not yet implemented'
    });
  }
);

/**
 * POST /api/v1/leaves/allocations/bulk
 * Bulk allocation of leave to multiple employees
 */
router.post('/allocations/bulk',
  authenticate,
  authorize(['manage_leave_allocations']),
  leaveController.createLeaveAllocation.bind(leaveController)
);

// =============================================
// LEAVE POLICIES (Admin Only)
// =============================================

/**
 * GET /api/v1/leaves/policies
 * Get company leave policies
 */
router.get('/policies',
  authenticate,
  (req, res) => {
    // Would get from config service
    res.status(501).json({
      success: false,
      message: 'Get leave policies not yet implemented'
    });
  }
);

/**
 * PUT /api/v1/leaves/policies
 * Update company leave policies
 */
router.put('/policies',
  authenticate,
  authorize(['configure_policies']),
  (req, res) => {
    // Would update from config service
    res.status(501).json({
      success: false,
      message: 'Update leave policies not yet implemented'
    });
  }
);

// =============================================
// LEAVE TRANSACTIONS
// =============================================

/**
 * GET /api/v1/leaves/transactions/:employee_id
 * Get leave transaction history for employee
 */
router.get('/transactions/:employee_id',
  authenticate,
  (req, res) => {
    // Would implement get transactions
    res.status(501).json({
      success: false,
      message: 'Get leave transactions not yet implemented'
    });
  }
);

// =============================================
// REPORTS
// =============================================

/**
 * GET /api/v1/leaves/reports/balance
 * Get leave balance report
 */
router.get('/reports/balance',
  authenticate,
  authorize(['view_reports']),
  leaveController.getLeaveReports.bind(leaveController)
);

/**
 * GET /api/v1/leaves/reports/utilization
 * Get leave utilization report
 */
router.get('/reports/utilization',
  authenticate,
  authorize(['view_reports']),
  leaveController.getLeaveUtilizationReport.bind(leaveController)
);

/**
 * GET /api/v1/leaves/reports/compliance
 * Get leave compliance report
 */
router.get('/reports/compliance',
  authenticate,
  authorize(['view_reports']),
  leaveController.getLeaveComplianceReport.bind(leaveController)
);

/**
 * GET /api/v1/leaves/reports/export
 * Export leave data with filters
 */
router.get('/reports/export',
  authenticate,
  authorize(['view_reports']),
  leaveController.getLeaveReports.bind(leaveController)
);

// =============================================
// LEAVE ENCASHMENT
// =============================================

/**
 * POST /api/v1/leaves/encashments
 * Request leave encashment
 */
router.post('/encashments',
  authenticate,
  leaveController.requestLeaveEncashment.bind(leaveController)
);

/**
 * GET /api/v1/leaves/encashments
 * Get leave encashment requests
 */
router.get('/encashments',
  authenticate,
  authorize(['manage_leave_encashments']),
  leaveController.getLeaveEncashmentRequests.bind(leaveController)
);

/**
 * PUT /api/v1/leaves/encashments/:id
 * Approve/reject leave encashment
 */
router.put('/encashments/:id',
  authenticate,
  authorize(['manage_leave_encashments']),
  (req, res) => {
    // Would implement approve/reject encashment
    res.status(501).json({
      success: false,
      message: 'Approve leave encashment not yet implemented'
    });
  }
);

// =============================================
// DASHBOARD ENDPOINTS
// =============================================

/**
 * GET /api/v1/leaves/dashboard
 * Get leave dashboard data for current user
 */
router.get('/dashboard',
  authenticate,
  leaveController.getLeaveDashboard.bind(leaveController)
);

/**
 * GET /api/v1/leaves/team-dashboard
 * Get team leave dashboard (for managers)
 */
router.get('/team-dashboard',
  authenticate,
  authorize(['view_team_leave_data']),
  leaveController.getTeamLeaveDashboard.bind(leaveController)
);

/**
 * GET /api/v1/leaves/approvals
 * Get leave requests pending approval
 */
router.get('/approvals',
  authenticate,
  authorize(['approve_leave_request']),
  leaveController.getLeaveRequests.bind(leaveController)
);

/**
 * GET /api/v1/leaves/my-requests
 * Get current user's leave requests
 */
router.get('/my-requests',
  authenticate,
  leaveController.getLeaveRequests.bind(leaveController)
);

export default router;