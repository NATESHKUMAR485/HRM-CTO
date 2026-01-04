import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import {
  registerTenantAndAdmin,
  login,
  logout,
  refreshAccessToken,
} from '../services/authService';
import { getUserById } from '../services/userService';
import { createAuditLog } from '../services/auditService';
import {
  validateRequest,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../utils/validation';

export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = validateRequest(registerSchema, req.body);

    const result = await registerTenantAndAdmin(validatedData);

    await createAuditLog({
      tenantId: result.user.tenant_id,
      userId: result.user.id,
      action: 'REGISTER',
      entity: 'user',
      entityId: result.user.id,
      changes: { email: result.user.email },
      ipAddress: req.ip || req.socket.remoteAddress || '',
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result,
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message || 'Validation failed',
        errors: error.errors,
      });
    }
    next(error);
  }
};

export const loginUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = validateRequest(loginSchema, req.body);

    const tenantId = req.tenant?.id || null;

    const result = await login({
      ...validatedData,
      tenantId,
    });

    await createAuditLog({
      tenantId: result.user.tenant_id,
      userId: result.user.id,
      action: 'LOGIN',
      entity: 'user',
      entityId: result.user.id,
      changes: {},
      ipAddress: req.ip || req.socket.remoteAddress || '',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message || 'Validation failed',
        errors: error.errors,
      });
    }

    if (error.message === 'Invalid credentials' || error.message === 'User account is not active') {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const logoutUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!req.context) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    await logout(req.context.userId, refreshToken);

    await createAuditLog({
      tenantId: req.context.tenantId,
      userId: req.context.userId,
      action: 'LOGOUT',
      entity: 'user',
      entityId: req.context.userId,
      changes: {},
      ipAddress: req.context.ipAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = validateRequest(refreshTokenSchema, req.body);

    const accessToken = await refreshAccessToken(validatedData.refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken },
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message || 'Validation failed',
        errors: error.errors,
      });
    }

    if (error.message === 'Invalid or expired refresh token') {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.context) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const user = await getUserById(req.context.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
