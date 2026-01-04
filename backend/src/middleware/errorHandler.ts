import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface AppError extends Error {
  status?: number;
  errors?: any[];
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  const response: any = {
    success: false,
    message,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (config.env === 'development') {
    response.stack = err.stack;
  }

  console.error(`Error [${status}]:`, err);

  res.status(status).json(response);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};
