import Joi from 'joi';

export const registerSchema = Joi.object({
  companyName: Joi.string().min(2).max(255).required(),
  subdomain: Joi.string()
    .pattern(/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/)
    .min(3)
    .max(63)
    .required()
    .messages({
      'string.pattern.base': 'Subdomain must contain only lowercase letters, numbers, and hyphens',
    }),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
  }),
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const validateRequest = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    throw { status: 400, errors };
  }

  return value;
};
