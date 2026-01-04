import { Request } from 'express';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  HR_MANAGER = 'hr_manager',
  EMPLOYEE = 'employee',
}

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  subscription_plan: SubscriptionPlan;
  status: TenantStatus;
  created_at: Date;
  updated_at: Date;
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  features_enabled: {
    payroll?: boolean;
    attendance?: boolean;
    leave?: boolean;
    recruitment?: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  tenant_id: string | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  id: string;
  tenant_id: string | null;
  name: string;
  permissions: Record<string, boolean>;
  created_at: Date;
  updated_at: Date;
}

export interface UserRoleMapping {
  id: string;
  user_id: string;
  role_id: string;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  tenant_id: string | null;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  changes: Record<string, any>;
  ip_address: string;
  created_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface JWTPayload {
  userId: string;
  tenantId: string | null;
  email: string;
  role: UserRole;
}

export interface RequestContext {
  userId: string;
  tenantId: string | null;
  role: UserRole;
  ipAddress: string;
}

export interface AuthenticatedRequest extends Request {
  context?: RequestContext;
  tenant?: Tenant;
}
