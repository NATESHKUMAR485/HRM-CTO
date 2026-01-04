import { pool } from '../../config/database';
import { 
  LeaveAttendanceConfig, 
  CompanyLeavePolicy, 
  CompanyAttendancePolicy, 
  LocationPolicy,
  NotificationSettings,
  ApprovalWorkflow,
  PayrollIntegration,
  ComplianceRule
} from '../../types/config';
import { v4 as uuidv4 } from 'uuid';

export class ConfigService {

  // =============================================
  // LEAVE ATTENDANCE CONFIG
  // =============================================

  async getLeaveAttendanceConfig(tenantId?: string): Promise<LeaveAttendanceConfig | null> {
    let query = `
      SELECT * FROM leave_attendance_config
    `;

    const values: any[] = [];

    if (tenantId) {
      query += ` WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY tenant_id DESC LIMIT 1`;
      values.push(tenantId);
    } else {
      query += ` WHERE tenant_id IS NULL ORDER BY tenant_id DESC LIMIT 1`;
    }

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async updateLeaveAttendanceConfig(tenantId: string, configData: any, updatedBy: string): Promise<LeaveAttendanceConfig> {
    // Get current config for audit log
    const current = await this.getLeaveAttendanceConfig(tenantId);

    // Check if config exists for this tenant
    const existingQuery = `
      SELECT id FROM leave_attendance_config WHERE tenant_id = $1
    `;
    const existing = await pool.query(existingQuery, [tenantId]);

    let query: string;
    let values: any[];

    if (existing.rows.length > 0) {
      // Update existing
      query = `
        UPDATE leave_attendance_config SET
          subscription_plan = $1, leave_types_limit = $2, custom_leave_types_allowed = $3,
          accrual_frequencies = $4, max_approval_levels = $5, attendance_recording_method = $6,
          attendance_employee_self_mark = $7, attendance_biometric_integration = $8,
          geo_tracking_enabled = $9, multi_location_support = $10, compliance_reporting = $11,
          api_access_enabled = $12, notification_channels = $13, report_formats = $14,
          custom_workflows_allowed = $15, features = $16, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $17
        RETURNING *
      `;

      values = [
        configData.subscription_plan, configData.leave_types_limit, configData.custom_leave_types_allowed,
        configData.accrual_frequencies, configData.max_approval_levels, configData.attendance_recording_method,
        configData.attendance_employee_self_mark, configData.attendance_biometric_integration,
        configData.geo_tracking_enabled, configData.multi_location_support, configData.compliance_reporting,
        configData.api_access_enabled, configData.notification_channels, configData.report_formats,
        configData.custom_workflows_allowed, JSON.stringify(configData.features || {}), tenantId
      ];
    } else {
      // Create new
      const id = uuidv4();
      query = `
        INSERT INTO leave_attendance_config (
          id, tenant_id, subscription_plan, leave_types_limit, custom_leave_types_allowed,
          accrual_frequencies, max_approval_levels, attendance_recording_method,
          attendance_employee_self_mark, attendance_biometric_integration, geo_tracking_enabled,
          multi_location_support, compliance_reporting, api_access_enabled, notification_channels,
          report_formats, custom_workflows_allowed, features
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;

      values = [
        id, tenantId, configData.subscription_plan, configData.leave_types_limit, configData.custom_leave_types_allowed,
        configData.accrual_frequencies, configData.max_approval_levels, configData.attendance_recording_method,
        configData.attendance_employee_self_mark, configData.attendance_biometric_integration, configData.geo_tracking_enabled,
        configData.multi_location_support, configData.compliance_reporting, configData.api_access_enabled,
        configData.notification_channels, configData.report_formats, configData.custom_workflows_allowed,
        JSON.stringify(configData.features || {})
      ];
    }

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, updatedBy, 'UPDATE', 'leave_attendance_config', result.rows[0].id, current, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // COMPANY LEAVE POLICIES
  // =============================================

  async getCompanyLeavePolicies(tenantId: string, filters: any = {}): Promise<{ data: CompanyLeavePolicy[]; total: number }> {
    const { is_active = true, effective_date } = filters;

    let query = `
      SELECT clp.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM company_leave_policies clp
      LEFT JOIN users u ON clp.created_by = u.id
      WHERE clp.tenant_id = $1 AND clp.is_active = $2
    `;

    const values: any[] = [tenantId, is_active];
    let paramCount = 3;

    if (effective_date) {
      query += ` AND (clp.effective_from <= $${paramCount} AND (clp.effective_to IS NULL OR clp.effective_to >= $${paramCount}))`;
      values.push(effective_date);
      paramCount++;
    }

    query += ' ORDER BY clp.effective_from DESC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async getCurrentLeavePolicy(tenantId: string, date: Date = new Date()): Promise<CompanyLeavePolicy | null> {
    const query = `
      SELECT clp.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM company_leave_policies clp
      LEFT JOIN users u ON clp.created_by = u.id
      WHERE clp.tenant_id = $1 
        AND clp.is_active = true
        AND clp.effective_from <= $2
        AND (clp.effective_to IS NULL OR clp.effective_to >= $2)
      ORDER BY clp.effective_from DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [tenantId, date]);
    return result.rows[0] || null;
  }

  async createCompanyLeavePolicy(tenantId: string, policyData: any, createdBy: string): Promise<CompanyLeavePolicy> {
    const id = uuidv4();
    const query = `
      INSERT INTO company_leave_policies (
        id, tenant_id, policy_name, description, leave_accrual_policy,
        notice_period_policy, approval_workflow_policy, probation_policy,
        carry_over_policy, encashment_policy, retroactive_request_policy,
        max_consecutive_days_policy, half_day_policy, auto_rejection_policy,
        location_specific_overrides, effective_from, effective_to, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;

    const values = [
      id, tenantId, policyData.policy_name, policyData.description,
      JSON.stringify(policyData.leave_accrual_policy), JSON.stringify(policyData.notice_period_policy),
      JSON.stringify(policyData.approval_workflow_policy), JSON.stringify(policyData.probation_policy),
      JSON.stringify(policyData.carry_over_policy), JSON.stringify(policyData.encashment_policy),
      JSON.stringify(policyData.retroactive_request_policy), JSON.stringify(policyData.max_consecutive_days_policy),
      JSON.stringify(policyData.half_day_policy), JSON.stringify(policyData.auto_rejection_policy),
      JSON.stringify(policyData.location_specific_overrides || {}), policyData.effective_from,
      policyData.effective_to, createdBy
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'company_leave_policies', id, null, result.rows[0]);

    return result.rows[0];
  }

  async updateCompanyLeavePolicy(tenantId: string, policyId: string, policyData: any, updatedBy: string): Promise<CompanyLeavePolicy> {
    const current = await this.getCompanyLeavePolicyById(tenantId, policyId);
    if (!current) {
      throw new Error('Leave policy not found');
    }

    const query = `
      UPDATE company_leave_policies SET
        policy_name = $1, description = $2, leave_accrual_policy = $3,
        notice_period_policy = $4, approval_workflow_policy = $5, probation_policy = $6,
        carry_over_policy = $7, encashment_policy = $8, retroactive_request_policy = $9,
        max_consecutive_days_policy = $10, half_day_policy = $11, auto_rejection_policy = $12,
        location_specific_overrides = $13, effective_from = $14, effective_to = $15,
        is_active = $16, updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = $17 AND id = $18
      RETURNING *
    `;

    const values = [
      policyData.policy_name, policyData.description, JSON.stringify(policyData.leave_accrual_policy),
      JSON.stringify(policyData.notice_period_policy), JSON.stringify(policyData.approval_workflow_policy),
      JSON.stringify(policyData.probation_policy), JSON.stringify(policyData.carry_over_policy),
      JSON.stringify(policyData.encashment_policy), JSON.stringify(policyData.retroactive_request_policy),
      JSON.stringify(policyData.max_consecutive_days_policy), JSON.stringify(policyData.half_day_policy),
      JSON.stringify(policyData.auto_rejection_policy), JSON.stringify(policyData.location_specific_overrides || {}),
      policyData.effective_from, policyData.effective_to, policyData.is_active,
      tenantId, policyId
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, updatedBy, 'UPDATE', 'company_leave_policies', policyId, current, result.rows[0]);

    return result.rows[0];
  }

  async getCompanyLeavePolicyById(tenantId: string, policyId: string): Promise<CompanyLeavePolicy | null> {
    const query = `
      SELECT clp.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM company_leave_policies clp
      LEFT JOIN users u ON clp.created_by = u.id
      WHERE clp.tenant_id = $1 AND clp.id = $2
    `;

    const result = await pool.query(query, [tenantId, policyId]);
    return result.rows[0] || null;
  }

  // =============================================
  // COMPANY ATTENDANCE POLICIES
  // =============================================

  async getCompanyAttendancePolicies(tenantId: string, filters: any = {}): Promise<{ data: CompanyAttendancePolicy[]; total: number }> {
    const { is_active = true, effective_date } = filters;

    let query = `
      SELECT cap.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM company_attendance_policies cap
      LEFT JOIN users u ON cap.created_by = u.id
      WHERE cap.tenant_id = $1 AND cap.is_active = $2
    `;

    const values: any[] = [tenantId, is_active];
    let paramCount = 3;

    if (effective_date) {
      query += ` AND (cap.effective_from <= $${paramCount} AND (cap.effective_to IS NULL OR cap.effective_to >= $${paramCount}))`;
      values.push(effective_date);
      paramCount++;
    }

    query += ' ORDER BY cap.effective_from DESC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async getCurrentAttendancePolicy(tenantId: string, date: Date = new Date()): Promise<CompanyAttendancePolicy | null> {
    const query = `
      SELECT cap.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM company_attendance_policies cap
      LEFT JOIN users u ON cap.created_by = u.id
      WHERE cap.tenant_id = $1 
        AND cap.is_active = true
        AND cap.effective_from <= $2
        AND (cap.effective_to IS NULL OR cap.effective_to >= $2)
      ORDER BY cap.effective_from DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [tenantId, date]);
    return result.rows[0] || null;
  }

  async createCompanyAttendancePolicy(tenantId: string, policyData: any, createdBy: string): Promise<CompanyAttendancePolicy> {
    const id = uuidv4();
    const query = `
      INSERT INTO company_attendance_policies (
        id, tenant_id, policy_name, description, recording_method,
        grace_period_minutes, late_arrival_policy, early_departure_policy,
        overtime_policy, break_policy, location_based_policy,
        biometric_integration_policy, auto_deduction_policy, correction_request_policy,
        geo_fencing_policy, effective_from, effective_to, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      ) RETURNING *
    `;

    const values = [
      id, tenantId, policyData.policy_name, policyData.description,
      policyData.recording_method, policyData.grace_period_minutes || 0,
      JSON.stringify(policyData.late_arrival_policy), JSON.stringify(policyData.early_departure_policy),
      JSON.stringify(policyData.overtime_policy), JSON.stringify(policyData.break_policy),
      JSON.stringify(policyData.location_based_policy), JSON.stringify(policyData.biometric_integration_policy || {}),
      JSON.stringify(policyData.auto_deduction_policy || {}), JSON.stringify(policyData.correction_request_policy),
      JSON.stringify(policyData.geo_fencing_policy || {}), policyData.effective_from,
      policyData.effective_to, createdBy
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'company_attendance_policies', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // LOCATION POLICIES
  // =============================================

  async getLocationPolicies(tenantId: string, filters: any = {}): Promise<{ data: LocationPolicy[]; total: number }> {
    const { location_id, policy_type, is_active = true } = filters;

    let query = `
      SELECT lp.*, 
        l.name as location_name, l.code as location_code,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM location_policies lp
      LEFT JOIN locations l ON lp.location_id = l.id
      LEFT JOIN users u ON lp.created_by = u.id
      WHERE lp.tenant_id = $1 AND lp.is_active = $2
    `;

    const values: any[] = [tenantId, is_active];
    let paramCount = 3;

    if (location_id) {
      query += ` AND lp.location_id = $${paramCount}`;
      values.push(location_id);
      paramCount++;
    }

    if (policy_type) {
      query += ` AND lp.policy_type = $${paramCount}`;
      values.push(policy_type);
      paramCount++;
    }

    query += ' ORDER BY lp.effective_from DESC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async createLocationPolicy(tenantId: string, policyData: any, createdBy: string): Promise<LocationPolicy> {
    const id = uuidv4();
    const query = `
      INSERT INTO location_policies (
        id, tenant_id, location_id, policy_type, policy_data,
        effective_from, effective_to, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *
    `;

    const values = [
      id, tenantId, policyData.location_id, policyData.policy_type,
      JSON.stringify(policyData.policy_data), policyData.effective_from,
      policyData.effective_to, createdBy
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'location_policies', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // NOTIFICATION SETTINGS
  // =============================================

  async getNotificationSettings(tenantId: string, filters: any = {}): Promise<{ data: NotificationSettings[]; total: number }> {
    const { user_id, notification_type } = filters;

    let query = `
      SELECT ns.*, 
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM notification_settings ns
      LEFT JOIN users u ON ns.user_id = u.id
      WHERE ns.tenant_id = $1
    `;

    const values: any[] = [tenantId];
    let paramCount = 2;

    if (user_id) {
      query += ` AND ns.user_id = $${paramCount}`;
      values.push(user_id);
      paramCount++;
    }

    if (notification_type) {
      query += ` AND ns.notification_type = $${paramCount}`;
      values.push(notification_type);
      paramCount++;
    }

    query += ' ORDER BY ns.notification_type ASC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async updateNotificationSettings(tenantId: string, userId: string, settingsData: any): Promise<NotificationSettings> {
    const { notification_type, channels, triggers, frequency, thresholds, is_enabled } = settingsData;

    // Check if settings exist
    const existingQuery = `
      SELECT * FROM notification_settings 
      WHERE tenant_id = $1 AND user_id = $2 AND notification_type = $3
    `;

    const existing = await pool.query(existingQuery, [tenantId, userId, notification_type]);

    let query: string;
    let values: any[];

    if (existing.rows.length > 0) {
      // Update existing
      query = `
        UPDATE notification_settings SET
          channels = $1, triggers = $2, frequency = $3, thresholds = $4,
          is_enabled = $5, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $6 AND user_id = $7 AND notification_type = $8
        RETURNING *
      `;

      values = [
        JSON.stringify(channels), JSON.stringify(triggers), frequency,
        JSON.stringify(thresholds || {}), is_enabled, tenantId, userId, notification_type
      ];
    } else {
      // Create new
      const id = uuidv4();
      query = `
        INSERT INTO notification_settings (
          id, tenant_id, user_id, notification_type, channels, triggers,
          frequency, thresholds, is_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      values = [
        id, tenantId, userId, notification_type, JSON.stringify(channels),
        JSON.stringify(triggers), frequency, JSON.stringify(thresholds || {}), is_enabled
      ];
    }

    const result = await pool.query(query, values);

    return result.rows[0];
  }

  // =============================================
  // APPROVAL WORKFLOWS
  // =============================================

  async getApprovalWorkflows(tenantId: string, filters: any = {}): Promise<{ data: ApprovalWorkflow[]; total: number }> {
    const { workflow_type, is_active = true } = filters;

    let query = `
      SELECT aw.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM approval_workflows aw
      LEFT JOIN users u ON aw.created_by = u.id
      WHERE aw.tenant_id = $1 AND aw.is_active = $2
    `;

    const values: any[] = [tenantId, is_active];
    let paramCount = 3;

    if (workflow_type) {
      query += ` AND aw.workflow_type = $${paramCount}`;
      values.push(workflow_type);
      paramCount++;
    }

    query += ' ORDER BY aw.workflow_name ASC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async createApprovalWorkflow(tenantId: string, workflowData: any, createdBy: string): Promise<ApprovalWorkflow> {
    const id = uuidv4();
    const query = `
      INSERT INTO approval_workflows (
        id, tenant_id, workflow_name, workflow_type, description,
        levels, conditions, is_default, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *
    `;

    const values = [
      id, tenantId, workflowData.workflow_name, workflowData.workflow_type,
      workflowData.description, JSON.stringify(workflowData.levels),
      JSON.stringify(workflowData.conditions || []), workflowData.is_default || false, createdBy
    ];

    const result = await pool.query(query, values);

    // If marked as default, unset other defaults
    if (workflowData.is_default) {
      await pool.query(`
        UPDATE approval_workflows SET is_default = false
        WHERE tenant_id = $1 AND id != $2 AND workflow_type = $3 AND is_default = true
      `, [tenantId, id, workflowData.workflow_type]);
    }

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'approval_workflows', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // PAYROLL INTEGRATIONS
  // =============================================

  async getPayrollIntegrations(tenantId: string, filters: any = {}): Promise<{ data: PayrollIntegration[]; total: number }> {
    const { integration_type, sync_status, is_active = true } = filters;

    let query = `
      SELECT pi.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM payroll_integrations pi
      LEFT JOIN users u ON pi.created_by = u.id
      WHERE pi.tenant_id = $1 AND pi.is_active = $2
    `;

    const values: any[] = [tenantId, is_active];
    let paramCount = 3;

    if (integration_type) {
      query += ` AND pi.integration_type = $${paramCount}`;
      values.push(integration_type);
      paramCount++;
    }

    if (sync_status) {
      query += ` AND pi.sync_status = $${paramCount}`;
      values.push(sync_status);
      paramCount++;
    }

    query += ' ORDER BY pi.integration_name ASC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async createPayrollIntegration(tenantId: string, integrationData: any, createdBy: string): Promise<PayrollIntegration> {
    const id = uuidv4();
    const query = `
      INSERT INTO payroll_integrations (
        id, tenant_id, integration_type, integration_name, configuration,
        api_credentials, sync_frequency, is_active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *
    `;

    const values = [
      id, tenantId, integrationData.integration_type, integrationData.integration_name,
      JSON.stringify(integrationData.configuration), JSON.stringify(integrationData.api_credentials || {}),
      integrationData.sync_frequency || 'daily', integrationData.is_active !== false, createdBy
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'payroll_integrations', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // COMPLIANCE RULES
  // =============================================

  async getComplianceRules(tenantId: string, filters: any = {}): Promise<{ data: ComplianceRule[]; total: number }> {
    const { rule_type, jurisdiction, is_active = true } = filters;

    let query = `
      SELECT cr.*, 
        u.first_name || ' ' || u.last_name as created_by_name
      FROM compliance_rules cr
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE cr.tenant_id = $1 AND cr.is_active = $2
    `;

    const values: any[] = [tenantId, is_active];
    let paramCount = 3;

    if (rule_type) {
      query += ` AND cr.rule_type = $${paramCount}`;
      values.push(rule_type);
      paramCount++;
    }

    if (jurisdiction) {
      query += ` AND cr.jurisdiction = $${paramCount}`;
      values.push(jurisdiction);
      paramCount++;
    }

    query += ' ORDER BY cr.rule_name ASC';

    const result = await pool.query(query, values);

    return {
      data: result.rows,
      total: result.rows.length
    };
  }

  async createComplianceRule(tenantId: string, ruleData: any, createdBy: string): Promise<ComplianceRule> {
    const id = uuidv4();
    const query = `
      INSERT INTO compliance_rules (
        id, tenant_id, rule_name, rule_type, jurisdiction, rule_description,
        rule_config, violation_actions, effective_from, effective_to,
        is_mandatory, is_active, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `;

    const values = [
      id, tenantId, ruleData.rule_name, ruleData.rule_type, ruleData.jurisdiction,
      ruleData.rule_description, JSON.stringify(ruleData.rule_config),
      JSON.stringify(ruleData.violation_actions), ruleData.effective_from,
      ruleData.effective_to, ruleData.is_mandatory || false, ruleData.is_active !== false, createdBy
    ];

    const result = await pool.query(query, values);

    // Log audit trail
    await this.logAudit(tenantId, createdBy, 'CREATE', 'compliance_rules', id, null, result.rows[0]);

    return result.rows[0];
  }

  // =============================================
  // CONFIGURATION SUMMARY & HEALTH
  // =============================================

  async getConfigSummary(tenantId: string): Promise<any> {
    // Get subscription plan
    const config = await this.getLeaveAttendanceConfig(tenantId);

    // Check configured policies
    const [leavePolicies, attendancePolicies, notificationSettings, approvalWorkflows, payrollIntegrations, complianceRules] = await Promise.all([
      this.getCompanyLeavePolicies(tenantId, { is_active: true }),
      this.getCompanyAttendancePolicies(tenantId, { is_active: true }),
      this.getNotificationSettings(tenantId, {}),
      this.getApprovalWorkflows(tenantId, { is_active: true }),
      this.getPayrollIntegrations(tenantId, { is_active: true }),
      this.getComplianceRules(tenantId, { is_active: true })
    ]);

    // Get last policy update
    const lastPolicyUpdateQuery = `
      SELECT MAX(updated_at) as last_update FROM (
        SELECT updated_at FROM company_leave_policies WHERE tenant_id = $1
        UNION
        SELECT updated_at FROM company_attendance_policies WHERE tenant_id = $1
      ) policy_updates
    `;
    const lastPolicyResult = await pool.query(lastPolicyUpdateQuery, [tenantId]);

    return {
      subscription_plan: config?.subscription_plan || 'free',
      active_features: config ? Object.keys(config.features || {}) : [],
      configured_policies: {
        leave_policy: leavePolicies.data.length > 0,
        attendance_policy: attendancePolicies.data.length > 0,
        notification_settings: notificationSettings.data.length > 0,
        approval_workflows: approvalWorkflows.data.length > 0,
        payroll_integrations: payrollIntegrations.data.length > 0,
        compliance_rules: complianceRules.data.length > 0
      },
      feature_availability: {
        custom_leave_types: config?.custom_leave_types_allowed || false,
        multi_approval_levels: (config?.max_approval_levels || 1) > 1,
        employee_self_attendance: config?.attendance_employee_self_mark || false,
        biometric_integration: config?.attendance_biometric_integration || false,
        geo_tracking: config?.geo_tracking_enabled || false,
        multi_location: config?.multi_location_support || false,
        compliance_reporting: config?.compliance_reporting || false,
        api_access: config?.api_access_enabled || false,
        custom_workflows: config?.custom_workflows_allowed || false
      },
      system_health: {
        last_policy_update: lastPolicyResult.rows[0]?.last_update || null,
        sync_status: payrollIntegrations.data.length > 0 ? 'configured' : 'not_configured',
        error_count: 0 // This would come from error logging
      }
    };
  }

  // =============================================
  // FEATURE TOGGLES
  // =============================================

  async checkFeatureAvailability(tenantId: string, featureName: string): Promise<boolean> {
    const config = await this.getLeaveAttendanceConfig(tenantId);
    
    if (!config) {
      // Return default feature availability based on plan
      return this.getDefaultFeatureAvailability('free', featureName);
    }

    // Check if feature is explicitly enabled in config
    if (config.features && config.features[featureName] !== undefined) {
      return config.features[featureName];
    }

    // Check subscription plan restrictions
    return this.getFeatureAvailabilityByPlan(config.subscription_plan, featureName);
  }

  private getDefaultFeatureAvailability(plan: string, featureName: string): boolean {
    const featureMap = {
      // Free plan features
      'custom_leave_types': false,
      'multi_approval_levels': false,
      'employee_self_attendance': false,
      'biometric_integration': false,
      'geo_tracking': false,
      'multi_location': false,
      'compliance_reporting': false,
      'api_access': false,
      'custom_workflows': false,
      'advanced_reports': false
    };

    return featureMap[featureName] || false;
  }

  private getFeatureAvailabilityByPlan(plan: string, featureName: string): boolean {
    const planFeatures = {
      free: {
        custom_leave_types: false,
        multi_approval_levels: false,
        employee_self_attendance: false,
        biometric_integration: false,
        geo_tracking: false,
        multi_location: false,
        compliance_reporting: false,
        api_access: false,
        custom_workflows: false,
        advanced_reports: false
      },
      pro: {
        custom_leave_types: true,
        multi_approval_levels: true,
        employee_self_attendance: true,
        biometric_integration: false,
        geo_tracking: false,
        multi_location: true,
        compliance_reporting: true,
        api_access: false,
        custom_workflows: false,
        advanced_reports: true
      },
      enterprise: {
        custom_leave_types: true,
        multi_approval_levels: true,
        employee_self_attendance: true,
        biometric_integration: true,
        geo_tracking: true,
        multi_location: true,
        compliance_reporting: true,
        api_access: true,
        custom_workflows: true,
        advanced_reports: true
      }
    };

    const features = planFeatures[plan] || planFeatures.free;
    return features[featureName] || false;
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async logAudit(tenantId: string, userId: string, action: string, entityType: string, entityId: string, oldValues: any, newValues: any): Promise<void> {
    const id = uuidv4();
    
    await pool.query(`
      INSERT INTO leave_attendance_audit_logs (
        id, tenant_id, user_id, action, entity_type, entity_id,
        old_values, new_values, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id, tenantId, userId, action, entityType, entityId,
      JSON.stringify(oldValues), JSON.stringify(newValues), new Date()
    ]);
  }
}