import { Router } from 'express';
import { EmployeeController } from '../controllers/employeeController';
import { DepartmentController } from '../controllers/departmentController';
import { checkPermission, checkAnyPermission, checkEmployeeAccess } from '../middleware/permissions';

// Initialize controllers
const employeeController = new EmployeeController(
  // EmployeeService will be initialized with pool in route setup
  null as any
);

const departmentController = new DepartmentController(
  // DepartmentService will be initialized with pool in route setup
  null as any
);

const router = Router();

// Helper function to initialize services with pool
const initializeServices = (req: any, res: any, next: any) => {
  const pool = req.app.locals.pool;
  
  // Initialize services with pool
  (employeeController as any).employeeService = new (require('../services/employeeService').EmployeeService)(pool);
  (departmentController as any).departmentService = new (require('../services/departmentService').DepartmentService)(pool);
  
  next();
};

// Apply service initialization to all routes
router.use(initializeServices);

// Employee CRUD Operations
router.get(
  '/employees',
  checkAnyPermission(['employees.view_all', 'employees.view_own']),
  employeeController.getEmployees.bind(employeeController)
);

router.get(
  '/employees/:id',
  checkAnyPermission(['employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  employeeController.getEmployeeById.bind(employeeController)
);

router.post(
  '/employees',
  checkPermission('employees.create'),
  employeeController.createEmployee.bind(employeeController)
);

router.put(
  '/employees/:id',
  checkAnyPermission(['employees.edit_all', 'employees.edit_own']),
  checkEmployeeAccess('all'),
  employeeController.updateEmployee.bind(employeeController)
);

router.delete(
  '/employees/:id',
  checkPermission('employees.delete'),
  employeeController.deleteEmployee.bind(employeeController)
);

// Employee Status Management
router.put(
  '/employees/:id/terminate',
  checkAnyPermission(['employees.edit_all', 'employees.terminate']),
  employeeController.terminateEmployee.bind(employeeController)
);

router.put(
  '/employees/:id/activate',
  checkAnyPermission(['employees.edit_all', 'employees.activate']),
  employeeController.activateEmployee.bind(employeeController)
);

router.put(
  '/employees/:id/suspend',
  checkAnyPermission(['employees.edit_all', 'employees.suspend']),
  employeeController.suspendEmployee.bind(employeeController)
);

router.put(
  '/employees/:id/complete-probation',
  checkAnyPermission(['employees.edit_all', 'employees.complete_probation']),
  employeeController.completeProbation.bind(employeeController)
);

// Employee Profile & Details
router.get(
  '/employees/:id/profile',
  checkAnyPermission(['employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // This would return comprehensive profile with all tabs
    // Implementation would combine multiple service calls
    res.json({
      success: true,
      data: {
        message: 'Profile endpoint - to be implemented with all related data'
      }
    });
  }
);

router.put(
  '/employees/:id/profile',
  checkAnyPermission(['employees.edit_all', 'employees.edit_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // This would update profile and related data
    res.json({
      success: true,
      message: 'Profile update endpoint - to be implemented'
    });
  }
);

// Compensation Management
router.get(
  '/employees/:id/compensation',
  checkAnyPermission(['compensation.view', 'employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  employeeController.getEmployeeCompensation.bind(employeeController)
);

router.put(
  '/employees/:id/compensation',
  checkPermission('compensation.edit'),
  (req: any, res: any) => {
    // Implementation for compensation updates
    res.json({
      success: true,
      message: 'Compensation update endpoint - to be implemented'
    });
  }
);

router.get(
  '/employees/:id/salary-history',
  checkAnyPermission(['compensation.view', 'employees.view_all']),
  (req: any, res: any) => {
    // Implementation for salary history
    res.json({
      success: true,
      data: { message: 'Salary history endpoint - to be implemented' }
    });
  }
);

router.post(
  '/employees/:id/salary-change-request',
  checkPermission('compensation.edit'),
  (req: any, res: any) => {
    // Implementation for salary change requests
    res.json({
      success: true,
      message: 'Salary change request endpoint - to be implemented'
    });
  }
);

// Bank & Tax Details
router.get(
  '/employees/:id/bank-details',
  checkAnyPermission(['bank_details.view', 'employees.view_all']),
  (req: any, res: any) => {
    // Implementation for encrypted bank details retrieval
    res.json({
      success: true,
      data: { message: 'Bank details endpoint - to be implemented' }
    });
  }
);

router.put(
  '/employees/:id/bank-details',
  checkPermission('bank_details.edit'),
  (req: any, res: any) => {
    // Implementation for encrypted bank details update
    res.json({
      success: true,
      message: 'Bank details update endpoint - to be implemented'
    });
  }
);

router.get(
  '/employees/:id/tax-info',
  checkAnyPermission(['tax_info.view', 'employees.view_all']),
  (req: any, res: any) => {
    // Implementation for encrypted tax info retrieval
    res.json({
      success: true,
      data: { message: 'Tax info endpoint - to be implemented' }
    });
  }
);

router.put(
  '/employees/:id/tax-info',
  checkPermission('tax_info.edit'),
  (req: any, res: any) => {
    // Implementation for encrypted tax info update
    res.json({
      success: true,
      message: 'Tax info update endpoint - to be implemented'
    });
  }
);

// Skills & Certifications
router.get(
  '/employees/:id/skills',
  checkAnyPermission(['skills.view', 'employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // Implementation for skills management
    res.json({
      success: true,
      data: { message: 'Skills endpoint - to be implemented' }
    });
  }
);

router.post(
  '/employees/:id/skills',
  checkPermission('skills.edit'),
  (req: any, res: any) => {
    // Implementation for adding skills
    res.json({
      success: true,
      message: 'Add skill endpoint - to be implemented'
    });
  }
);

router.put(
  '/employees/:id/skills/:skill_id',
  checkPermission('skills.edit'),
  (req: any, res: any) => {
    // Implementation for updating skills
    res.json({
      success: true,
      message: 'Update skill endpoint - to be implemented'
    });
  }
);

router.delete(
  '/employees/:id/skills/:skill_id',
  checkPermission('skills.edit'),
  (req: any, res: any) => {
    // Implementation for removing skills
    res.json({
      success: true,
      message: 'Remove skill endpoint - to be implemented'
    });
  }
);

router.get(
  '/employees/:id/certifications',
  checkAnyPermission(['certifications.view', 'employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // Implementation for certifications management
    res.json({
      success: true,
      data: { message: 'Certifications endpoint - to be implemented' }
    });
  }
);

router.post(
  '/employees/:id/certifications',
  checkPermission('certifications.edit'),
  (req: any, res: any) => {
    // Implementation for adding certifications
    res.json({
      success: true,
      message: 'Add certification endpoint - to be implemented'
    });
  }
);

router.put(
  '/employees/:id/certifications/:cert_id',
  checkPermission('certifications.edit'),
  (req: any, res: any) => {
    // Implementation for updating certifications
    res.json({
      success: true,
      message: 'Update certification endpoint - to be implemented'
    });
  }
);

router.delete(
  '/employees/:id/certifications/:cert_id',
  checkPermission('certifications.edit'),
  (req: any, res: any) => {
    // Implementation for removing certifications
    res.json({
      success: true,
      message: 'Remove certification endpoint - to be implemented'
    });
  }
);

// Document Management
router.get(
  '/employees/:id/documents',
  checkAnyPermission(['documents.view', 'employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // Implementation for document management
    res.json({
      success: true,
      data: { message: 'Documents endpoint - to be implemented' }
    });
  }
);

router.post(
  '/employees/:id/documents',
  checkPermission('documents.upload'),
  (req: any, res: any) => {
    // Implementation for document upload
    res.json({
      success: true,
      message: 'Document upload endpoint - to be implemented'
    });
  }
);

router.get(
  '/employees/:id/documents/:doc_id',
  checkAnyPermission(['documents.view', 'documents.download']),
  (req: any, res: any) => {
    // Implementation for document download
    res.json({
      success: true,
      data: { message: 'Document download endpoint - to be implemented' }
    });
  }
);

router.delete(
  '/employees/:id/documents/:doc_id',
  checkPermission('documents.delete'),
  (req: any, res: any) => {
    // Implementation for document deletion
    res.json({
      success: true,
      message: 'Document delete endpoint - to be implemented'
    });
  }
);

router.get(
  '/employees/:id/documents/:doc_id/versions',
  checkAnyPermission(['documents.view']),
  (req: any, res: any) => {
    // Implementation for document version history
    res.json({
      success: true,
      data: { message: 'Document versions endpoint - to be implemented' }
    });
  }
);

// Benefits Management
router.get(
  '/employees/:id/benefits',
  checkAnyPermission(['benefits.view', 'employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // Implementation for benefits management
    res.json({
      success: true,
      data: { message: 'Benefits endpoint - to be implemented' }
    });
  }
);

router.post(
  '/employees/:id/benefits',
  checkPermission('benefits.edit'),
  (req: any, res: any) => {
    // Implementation for adding benefits
    res.json({
      success: true,
      message: 'Add benefit endpoint - to be implemented'
    });
  }
);

router.put(
  '/employees/:id/benefits/:benefit_id',
  checkPermission('benefits.edit'),
  (req: any, res: any) => {
    // Implementation for updating benefits
    res.json({
      success: true,
      message: 'Update benefit endpoint - to be implemented'
    });
  }
);

router.delete(
  '/employees/:id/benefits/:benefit_id',
  checkPermission('benefits.edit'),
  (req: any, res: any) => {
    // Implementation for removing benefits
    res.json({
      success: true,
      message: 'Remove benefit endpoint - to be implemented'
    });
  }
);

// Employment Status & Lifecycle
router.get(
  '/employees/:id/employment-history',
  checkAnyPermission(['employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // Implementation for employment history
    res.json({
      success: true,
      data: { message: 'Employment history endpoint - to be implemented' }
    });
  }
);

router.post(
  '/employees/:id/approve-termination',
  checkPermission('approvals.approve'),
  (req: any, res: any) => {
    // Implementation for termination approval
    res.json({
      success: true,
      message: 'Termination approval endpoint - to be implemented'
    });
  }
);

router.post(
  '/employees/:id/reject-termination',
  checkPermission('approvals.approve'),
  (req: any, res: any) => {
    // Implementation for termination rejection
    res.json({
      success: true,
      message: 'Termination rejection endpoint - to be implemented'
    });
  }
);

router.post(
  '/employees/:id/approve-salary-change',
  checkPermission('approvals.approve'),
  (req: any, res: any) => {
    // Implementation for salary change approval
    res.json({
      success: true,
      message: 'Salary change approval endpoint - to be implemented'
    });
  }
);

router.post(
  '/employees/:id/reject-salary-change',
  checkPermission('approvals.approve'),
  (req: any, res: any) => {
    // Implementation for salary change rejection
    res.json({
      success: true,
      message: 'Salary change rejection endpoint - to be implemented'
    });
  }
);

// Bulk Operations
router.post(
  '/employees/bulk-import',
  checkPermission('bulk.import'),
  (req: any, res: any) => {
    // Implementation for bulk import
    res.json({
      success: true,
      message: 'Bulk import endpoint - to be implemented'
    });
  }
);

router.post(
  '/employees/bulk-export',
  checkPermission('bulk.export'),
  (req: any, res: any) => {
    // Implementation for bulk export
    res.json({
      success: true,
      message: 'Bulk export endpoint - to be implemented'
    });
  }
);

router.post(
  '/employees/bulk-update',
  checkPermission('bulk.update'),
  (req: any, res: any) => {
    // Implementation for bulk update
    res.json({
      success: true,
      message: 'Bulk update endpoint - to be implemented'
    });
  }
);

// Organization Structure
router.get(
  '/employees/org-chart',
  checkPermission('org_chart.view'),
  employeeController.getOrganizationChart.bind(employeeController)
);

router.get(
  '/employees/:id/team',
  checkAnyPermission(['employees.view_all', 'org_chart.view']),
  (req: any, res: any) => {
    // Implementation for team members
    res.json({
      success: true,
      data: { message: 'Team members endpoint - to be implemented' }
    });
  }
);

router.get(
  '/employees/:id/manager-info',
  checkAnyPermission(['employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  (req: any, res: any) => {
    // Implementation for manager info
    res.json({
      success: true,
      data: { message: 'Manager info endpoint - to be implemented' }
    });
  }
);

// Search, Filters & Reports
router.get(
  '/employees/search',
  checkAnyPermission(['employees.view_all', 'employees.view_own']),
  employeeController.getEmployees.bind(employeeController) // Reuse getEmployees with search
);

router.get(
  '/employees/export',
  checkPermission('bulk.export'),
  (req: any, res: any) => {
    // Implementation for custom export
    res.json({
      success: true,
      message: 'Export endpoint - to be implemented'
    });
  }
);

// Audit & Compliance
router.get(
  '/employees/:id/audit-logs',
  checkPermission('audit_logs.view'),
  (req: any, res: any) => {
    // Implementation for employee audit logs
    res.json({
      success: true,
      data: { message: 'Audit logs endpoint - to be implemented' }
    });
  }
);

router.get(
  '/audit-logs',
  checkPermission('audit_logs.view'),
  (req: any, res: any) => {
    // Implementation for all audit logs (admin only)
    res.json({
      success: true,
      data: { message: 'All audit logs endpoint - to be implemented' }
    });
  }
);

router.get(
  '/employees/:id/alerts',
  checkAnyPermission(['employees.view_all', 'employees.view_own']),
  checkEmployeeAccess('all'),
  employeeController.getExpiringCertifications.bind(employeeController)
);

// Department Management Routes
router.get(
  '/departments',
  checkAnyPermission(['department.manage', 'employees.view_all']),
  departmentController.getDepartments.bind(departmentController)
);

router.post(
  '/departments',
  checkPermission('department.manage'),
  departmentController.createDepartment.bind(departmentController)
);

router.get(
  '/departments/:id',
  checkAnyPermission(['department.manage', 'employees.view_all']),
  departmentController.getDepartmentById.bind(departmentController)
);

router.put(
  '/departments/:id',
  checkPermission('department.manage'),
  departmentController.updateDepartment.bind(departmentController)
);

router.delete(
  '/departments/:id',
  checkPermission('department.manage'),
  departmentController.deleteDepartment.bind(departmentController)
);

router.get(
  '/departments/:id/employees',
  checkAnyPermission(['department.manage', 'employees.view_all']),
  departmentController.getDepartmentEmployees.bind(departmentController)
);

router.post(
  '/departments/:id/transfer-employees',
  checkPermission('department.manage'),
  departmentController.transferEmployees.bind(departmentController)
);

router.get(
  '/departments/hierarchy',
  checkPermission('org_chart.view'),
  departmentController.getDepartmentHierarchy.bind(departmentController)
);

export default router;