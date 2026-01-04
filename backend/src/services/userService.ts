import { query } from '../config/database';
import { User, UserRole, UserStatus } from '../types';
import { hashPassword } from '../utils/password';

export const createUser = async (
  tenantId: string | null,
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole = UserRole.EMPLOYEE
): Promise<User> => {
  const existingUser = await query(
    'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
    [tenantId, email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error('User with this email already exists in this tenant');
  }

  const passwordHash = await hashPassword(password);

  const result = await query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, tenant_id, email, first_name, last_name, role, status, created_at, updated_at`,
    [tenantId, email, passwordHash, firstName, lastName, role, UserStatus.ACTIVE]
  );

  return result.rows[0];
};

export const getUserByEmail = async (
  tenantId: string | null,
  email: string
): Promise<User | null> => {
  const result = await query(
    'SELECT * FROM users WHERE tenant_id = $1 AND email = $2',
    [tenantId, email]
  );

  return result.rows[0] || null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const result = await query(
    'SELECT id, tenant_id, email, first_name, last_name, role, status, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );

  return result.rows[0] || null;
};

export const updateUserStatus = async (
  id: string,
  status: UserStatus
): Promise<User> => {
  const result = await query(
    'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, tenant_id, email, first_name, last_name, role, status, created_at, updated_at',
    [status, id]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
};
