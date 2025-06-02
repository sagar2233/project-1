const createError = require('http-errors');
const {
  register,
  login,
  verifyLoginOTP,
  verifyRegistrationOTP,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
} = require('../services/auth.service');
const {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  verifyRegisterOTPSchema,
  logoutSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../utils/validation');
const logger = require('../utils/logger');

const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (err) {
    logger.warn('Validation failed', {
      correlationId: req.correlationId,
      errors: err.details,
    });
    next(createError(400, err));
  }
};

const registerController = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await register(name, email, password);
    logger.info('User registered successfully', { correlationId: req.correlationId, email });
    res.status(201).json(result);
  } catch (err) {
    logger.error('Registration failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    if (err.message === 'User already exists') {
      next(createError(409, 'Email already registered'));
    } else {
      next(createError(400, err.message));
    }
  }
};

const loginController = async (req, res, next) => {
  try {
    const { email, password, platform } = req.body;
    const result = await login(email, password, platform.toUpperCase());
    logger.info('Login OTP sent', { correlationId: req.correlationId, email, platform });
    res.status(200).json(result);
  } catch (err) {
    logger.error('Login failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    next(createError(401, err.message));
  }
};

const verifyOTPController = async (req, res, next) => {
  try {
    const { email, otp, platform } = req.body;
    const result = await verifyLoginOTP(email, otp, platform.toUpperCase());

    res.clearCookie(`${platform.toLowerCase()}RefreshToken`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
    });

    res.cookie(`${platform.toLowerCase()}RefreshToken`, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    const { refreshToken, ...rest } = result;
    logger.info('OTP verified and tokens issued', { correlationId: req.correlationId, email, platform });
    res.status(200).json(rest);
  } catch (err) {
    logger.error('OTP verification failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    next(createError(400, err.message));
  }
};

const verifyRegisterOTPController = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyRegistrationOTP(email, otp);
    logger.info('Registration OTP verified', { correlationId: req.correlationId, email });
    res.status(200).json(result);
  } catch (err) {
    logger.error('Registration OTP verification failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    next(createError(400, err.message));
  }
};

const logoutController = async (req, res, next) => {
  try {
    const { email, platform } = req.body;
    await logout(email, platform.toUpperCase());

    res.clearCookie(`${platform.toLowerCase()}RefreshToken`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
    });

    logger.info('User logged out', { correlationId: req.correlationId, email, platform });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    next(createError(500, err.message));
  }
};

const refreshTokenController = async (req, res, next) => {
  try {
    const { refreshToken, platform } = req.body;
    const token = refreshToken || req.cookies[`${platform.toLowerCase()}RefreshToken`];
    if (!token) {
      throw createError(400, 'Refresh token is required');
    }
    const result = await refresh(token, platform.toUpperCase());
    logger.info('Token refreshed', { correlationId: req.correlationId, platform });
    res.status(200).json(result);
  } catch (err) {
    logger.error('Token refresh failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    next(createError(403, err.message));
  }
};

const forgotPasswordController = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await forgotPassword(email);
    logger.info('Password reset OTP sent', { correlationId: req.correlationId, email });
    res.status(200).json(result);
  } catch (err) {
    logger.error('Forgot password failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    next(createError(400, err.message));
  }
};

const resetPasswordController = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await resetPassword(token, newPassword);
    logger.info('Password reset successfully', { correlationId: req.correlationId });
    res.status(200).json(result);
  } catch (err) {
    logger.error('Password reset failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
    });
    next(createError(400, err.message));
  }
};

module.exports = {
  registerController: [validate(registerSchema), registerController],
  loginController: [validate(loginSchema), loginController],
  verifyOTPController: [validate(verifyOTPSchema), verifyOTPController],
  verifyRegisterOTPController: [validate(verifyRegisterOTPSchema), verifyRegisterOTPController],
  logoutController: [validate(logoutSchema), logoutController],
  refreshTokenController: [validate(refreshTokenSchema), refreshTokenController],
  forgotPasswordController: [validate(forgotPasswordSchema), forgotPasswordController],
  resetPasswordController: [validate(resetPasswordSchema), resetPasswordController],
};