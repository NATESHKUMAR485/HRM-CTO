import { query, getClient } from '../config/database';
import { Tenant, SubscriptionPlan, TenantStatus } from '../types';

export const createTenant = async (
  name: string,
  subdomain: string,
  subscriptionPlan: SubscriptionPlan = SubscriptionPlan.FREE
): Promise<Tenant> => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE subdomain = $1',
      [subdomain]
    );

    if (existingTenant.rows.length > 0) {
      throw new Error('Subdomain already exists');
    }

    const tenantResult = await client.query(
      `INSERT INTO tenants (name, subdomain, subscription_plan, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, subdomain, subscriptionPlan, TenantStatus.TRIAL]
    );

    const tenant = tenantResult.rows[0];

    await client.query(
      `INSERT INTO tenant_settings (tenant_id, branding, features_enabled)
       VALUES ($1, $2, $3)`,
      [
        tenant.id,
        JSON.stringify({}),
        JSON.stringify({
          payroll: true,
          attendance: true,
          leave: true,
          recruitment: false,
        }),
      ]
    );

    await client.query('COMMIT');
    return tenant;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getTenantBySubdomain = async (
  subdomain: string
): Promise<Tenant | null> => {
  const result = await query(
    'SELECT * FROM tenants WHERE subdomain = $1',
    [subdomain]
  );

  return result.rows[0] || null;
};

export const getTenantById = async (id: string): Promise<Tenant | null> => {
  const result = await query('SELECT * FROM tenants WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const updateTenantStatus = async (
  id: string,
  status: TenantStatus
): Promise<Tenant> => {
  const result = await query(
    'UPDATE tenants SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Tenant not found');
  }

  return result.rows[0];
};
