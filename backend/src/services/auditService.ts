import { query } from '../config/database';

interface AuditLogData {
  tenantId: string | null;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes: Record<string, any>;
  ipAddress: string;
}

export const createAuditLog = async (data: AuditLogData): Promise<void> => {
  await query(
    `INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, changes, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.tenantId,
      data.userId,
      data.action,
      data.entity,
      data.entityId,
      JSON.stringify(data.changes),
      data.ipAddress,
    ]
  );
};

export const getAuditLogs = async (
  tenantId: string,
  limit: number = 100,
  offset: number = 0
) => {
  const result = await query(
    `SELECT al.*, u.email, u.first_name, u.last_name
     FROM audit_logs al
     JOIN users u ON al.user_id = u.id
     WHERE al.tenant_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset]
  );

  return result.rows;
};
