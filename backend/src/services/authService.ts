import { query, getClient } from '../config/database';
import { User, UserRole } from '../types';
import { createUser, getUserByEmail } from './userService';
import { createTenant } from './tenantService';
import { comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

interface RegisterData {
  companyName: string;
  subdomain: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginData {
  email: string;
  password: string;
  tenantId: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password_hash'>;
}

export const registerTenantAndAdmin = async (
  data: RegisterData
): Promise<AuthTokens> => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const tenant = await createTenant(data.companyName, data.subdomain);

    const user = await createUser(
      tenant.id,
      data.email,
      data.password,
      data.firstName,
      data.lastName,
      UserRole.TENANT_ADMIN
    );

    await client.query('COMMIT');

    const accessToken = generateAccessToken({
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    const { password_hash, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const login = async (data: LoginData): Promise<AuthTokens> => {
  const user = await getUserByEmail(data.tenantId, data.email);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (user.status !== 'active') {
    throw new Error('User account is not active');
  }

  const isPasswordValid = await comparePassword(data.password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, expiresAt]
  );

  const { password_hash, ...userWithoutPassword } = user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
};

export const logout = async (userId: string, refreshToken: string): Promise<void> => {
  await query(
    'DELETE FROM refresh_tokens WHERE user_id = $1 AND token = $2',
    [userId, refreshToken]
  );
};

export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  const result = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [refreshToken]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired refresh token');
  }

  const tokenData = result.rows[0];
  const user = await query('SELECT * FROM users WHERE id = $1', [tokenData.user_id]);

  if (user.rows.length === 0) {
    throw new Error('User not found');
  }

  const userData = user.rows[0];

  return generateAccessToken({
    userId: userData.id,
    tenantId: userData.tenant_id,
    email: userData.email,
    role: userData.role,
  });
};
