const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  platform: Joi.string().valid('WEB', 'MOBILE').required(),
});

const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  platform: Joi.string().valid('WEB', 'MOBILE').required(),
});

const verifyRegisterOTPSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
});

const logoutSchema = Joi.object({
  email: Joi.string().email().required(),
  platform: Joi.string().valid('WEB', 'MOBILE').required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
  platform: Joi.string().valid('WEB', 'MOBILE').required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  verifyRegisterOTPSchema,
  logoutSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};