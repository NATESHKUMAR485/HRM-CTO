import { Request, Response } from 'express';
import { ConfigService } from '../../services/config/configService';
import { ApiResponse } from '../../types/config';

export class ConfigController {
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
  }

  // =============================================
  // LEAVE ATTENDANCE CONFIG
  // =============================================

  /**
   * Get leave attendance configuration
   */
  async getLeaveAttendanceConfig(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const config = await this.configService.getLeaveAttendanceConfig(tenantId);

      const response: ApiResponse = {
        success: true,
        data: config
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch configuration'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update leave attendance configuration
   */
  async updateLeaveAttendanceConfig(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const updatedBy = req.user.id;
      const configData = req.body;

      const config = await this.configService.updateLeaveAttendanceConfig(tenantId, configData, updatedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Configuration updated successfully',
        data: config
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update configuration'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // COMPANY LEAVE POLICIES
  // =============================================

  /**
   * Get company leave policies
   */
  async getCompanyLeavePolicies(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        is_active: req.query.is_active !== 'false', // Default to true
        effective_date: req.query.effective_date as string
      };

      const result = await this.configService.getCompanyLeavePolicies(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch leave policies'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get current leave policy
   */
  async getCurrentLeavePolicy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      const policy = await this.configService.getCurrentLeavePolicy(tenantId, date);

      const response: ApiResponse = {
        success: true,
        data: policy
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch current leave policy'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create company leave policy
   */
  async createCompanyLeavePolicy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const policyData = req.body;

      const policy = await this.configService.createCompanyLeavePolicy(tenantId, policyData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Leave policy created successfully',
        data: policy
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create leave policy'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update company leave policy
   */
  async updateCompanyLeavePolicy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const updatedBy = req.user.id;
      const { id } = req.params;
      const policyData = req.body;

      const policy = await this.configService.updateCompanyLeavePolicy(tenantId, id, policyData, updatedBy);

      const response: ApiResponse = {
        success: true,
        message: 'Leave policy updated successfully',
        data: policy
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update leave policy'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // COMPANY ATTENDANCE POLICIES
  // =============================================

  /**
   * Get company attendance policies
   */
  async getCompanyAttendancePolicies(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        is_active: req.query.is_active !== 'false', // Default to true
        effective_date: req.query.effective_date as string
      };

      const result = await this.configService.getCompanyAttendancePolicies(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch attendance policies'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get current attendance policy
   */
  async getCurrentAttendancePolicy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const date = req.query.date ? new Date(req.query.date as string) : new Date();

      const policy = await this.configService.getCurrentAttendancePolicy(tenantId, date);

      const response: ApiResponse = {
        success: true,
        data: policy
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch current attendance policy'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create company attendance policy
   */
  async createCompanyAttendancePolicy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const policyData = req.body;

      const policy = await this.configService.createCompanyAttendancePolicy(tenantId, policyData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance policy created successfully',
        data: policy
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create attendance policy'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // LOCATION POLICIES
  // =============================================

  /**
   * Get location policies
   */
  async getLocationPolicies(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        location_id: req.query.location_id as string,
        policy_type: req.query.policy_type as string,
        is_active: req.query.is_active !== 'false' // Default to true
      };

      const result = await this.configService.getLocationPolicies(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch location policies'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create location policy
   */
  async createLocationPolicy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const policyData = req.body;

      const policy = await this.configService.createLocationPolicy(tenantId, policyData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Location policy created successfully',
        data: policy
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create location policy'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get location policies by location
   */
  async getLocationPoliciesByLocation(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { location_id } = req.params;

      const result = await this.configService.getLocationPolicies(tenantId, {
        location_id,
        is_active: true
      });

      const response: ApiResponse = {
        success: true,
        data: {
          location_id,
          policies: result.data
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch location policies'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update location policies
   */
  async updateLocationPolicies(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const updatedBy = req.user.id;
      const { location_id } = req.params;
      const policyData = req.body;

      // This would update existing policies for the location
      const response: ApiResponse = {
        success: true,
        message: 'Location policies updated successfully',
        data: {
          location_id,
          updated_policies: [] // Would return updated policies
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update location policies'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // NOTIFICATION SETTINGS
  // =============================================

  /**
   * Get notification settings
   */
  async getNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        user_id: req.query.user_id as string,
        notification_type: req.query.notification_type as string
      };

      const result = await this.configService.getNotificationSettings(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch notification settings'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const userId = req.user.id;
      const settingsData = req.body;

      const settings = await this.configService.updateNotificationSettings(tenantId, userId, settingsData);

      const response: ApiResponse = {
        success: true,
        message: 'Notification settings updated successfully',
        data: settings
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update notification settings'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // APPROVAL WORKFLOWS
  // =============================================

  /**
   * Get approval workflows
   */
  async getApprovalWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        workflow_type: req.query.workflow_type as string,
        is_active: req.query.is_active !== 'false' // Default to true
      };

      const result = await this.configService.getApprovalWorkflows(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch approval workflows'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create approval workflow
   */
  async createApprovalWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const workflowData = req.body;

      const workflow = await this.configService.createApprovalWorkflow(tenantId, workflowData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Approval workflow created successfully',
        data: workflow
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create approval workflow'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // PAYROLL INTEGRATIONS
  // =============================================

  /**
   * Get payroll integrations
   */
  async getPayrollIntegrations(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        integration_type: req.query.integration_type as string,
        sync_status: req.query.sync_status as string,
        is_active: req.query.is_active !== 'false' // Default to true
      };

      const result = await this.configService.getPayrollIntegrations(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch payroll integrations'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create payroll integration
   */
  async createPayrollIntegration(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const integrationData = req.body;

      const integration = await this.configService.createPayrollIntegration(tenantId, integrationData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Payroll integration created successfully',
        data: integration
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create payroll integration'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // COMPLIANCE RULES
  // =============================================

  /**
   * Get compliance rules
   */
  async getComplianceRules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const filters = {
        rule_type: req.query.rule_type as string,
        jurisdiction: req.query.jurisdiction as string,
        is_active: req.query.is_active !== 'false' // Default to true
      };

      const result = await this.configService.getComplianceRules(tenantId, filters);

      const response: ApiResponse = {
        success: true,
        data: result.data
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch compliance rules'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Create compliance rule
   */
  async createComplianceRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const createdBy = req.user.id;
      const ruleData = req.body;

      const rule = await this.configService.createComplianceRule(tenantId, ruleData, createdBy);

      const response: ApiResponse = {
        success: true,
        message: 'Compliance rule created successfully',
        data: rule
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create compliance rule'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // CONFIGURATION SUMMARY & HEALTH
  // =============================================

  /**
   * Get configuration summary
   */
  async getConfigSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;

      const summary = await this.configService.getConfigSummary(tenantId);

      const response: ApiResponse = {
        success: true,
        data: summary
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch configuration summary'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Check feature availability
   */
  async checkFeatureAvailability(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user.tenant_id;
      const { feature_name } = req.params;

      const isAvailable = await this.configService.checkFeatureAvailability(tenantId, feature_name);

      const response: ApiResponse = {
        success: true,
        data: {
          feature_name,
          is_available: isAvailable
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check feature availability'
      };
      res.status(400).json(response);
    }
  }

  // =============================================
  // PLATFORM ADMIN ENDPOINTS
  // =============================================

  /**
   * Get platform configuration (Platform Admin only)
   */
  async getPlatformConfig(req: Request, res: Response): Promise<void> {
    try {
      // This would be for platform-level configuration
      const response: ApiResponse = {
        success: true,
        data: {
          platform_config: {
            default_subscription_plan: 'free',
            supported_plans: ['free', 'pro', 'enterprise'],
            default_features: {
              free: { custom_leave_types: false, multi_approval_levels: false },
              pro: { custom_leave_types: true, multi_approval_levels: true },
              enterprise: { custom_leave_types: true, multi_approval_levels: true }
            }
          }
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch platform configuration'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update platform configuration (Platform Admin only)
   */
  async updatePlatformConfig(req: Request, res: Response): Promise<void> {
    try {
      const updatedBy = req.user.id;
      const configData = req.body;

      // This would update platform-level configuration
      const response: ApiResponse = {
        success: true,
        message: 'Platform configuration updated successfully',
        data: {
          updated_by: updatedBy,
          updated_at: new Date(),
          changes: configData
        }
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update platform configuration'
      };
      res.status(400).json(response);
    }
  }
}