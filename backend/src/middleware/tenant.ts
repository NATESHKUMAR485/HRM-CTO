import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getTenantBySubdomain } from '../services/tenantService';

export const extractTenant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const host = req.headers.host || '';
    const subdomain = extractSubdomain(host);

    if (!subdomain) {
      return next();
    }

    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return res.status(403).json({
        success: false,
        message: 'Tenant is not active',
      });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireTenant = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.tenant) {
    return res.status(400).json({
      success: false,
      message: 'Tenant context required',
    });
  }

  if (!req.context?.tenantId || req.context.tenantId !== req.tenant.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this tenant',
    });
  }

  next();
};

function extractSubdomain(host: string): string | null {
  const parts = host.split('.');
  
  if (parts.length < 2) {
    return null;
  }

  const subdomain = parts[0].split(':')[0];
  
  if (subdomain === 'www' || subdomain === 'api' || subdomain === 'localhost') {
    return null;
  }

  return subdomain;
}
