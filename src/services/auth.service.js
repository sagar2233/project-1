const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prismaClient');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt.util');
const { generateOTP, storeOTP, verifyOTP } = require('../utils/otp.util');
const { sendOTPEmail } = require('../utils/email.util');
const logger = require('../utils/logger');
const createError = require('http-errors');

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

const register = async (name, email, password) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    logger.warn('Attempt to register with existing email', { email });
    throw createError(409, 'User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await prisma.user.create({
    data: { name, email, password: hashedPassword, isVerified: false },
  });

  const otp = generateOTP();
  storeOTP(email, otp);
  //await sendOTPEmail(email, otp);

  logger.info('OTP generated for registration', { userId: newUser.id, email });
  return { message: 'OTP sent to your email. Please verify.', userId: newUser.id ,otp: otp};
};

const verifyRegistrationOTP = async (email, otp) => {
  const isValid = verifyOTP(email, otp);
  if (!isValid) {
    logger.warn('Invalid or expired registration OTP', { email });
    throw createError(400, 'Invalid or expired OTP');
  }

  const user = await prisma.user.update({
    where: { email },
    data: { isVerified: true, isOtpEnabled: true },
  });

  logger.info('Registration OTP verified', { userId: user.id, email });
  return { message: 'Email verified successfully', userId: user.id };
};

const login = async (email, password, platform) => {
  if (!['WEB', 'MOBILE'].includes(platform)) {
    logger.warn('Invalid platform provided', { platform });
    throw createError(400, 'Invalid platform');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    logger.warn('Invalid login credentials', { email });
    throw createError(401, 'Invalid credentials');
  }

  if (!user.isVerified) {
    logger.warn('Unverified email login attempt', { email });
    throw createError(401, 'Please verify your email first.');
  }

  const pendingToken = uuidv4();

  await prisma.user.update({
    where: { email },
    data: {
      pendingLoginToken: pendingToken,
      pendingLoginPlatform: platform,
      lastLoginAt: new Date(),
    },
  });

  const otp = generateOTP();
  storeOTP(email, otp);
 // await sendOTPEmail(email, otp);

  logger.info('Login OTP sent', { email, platform });
  return { message: 'OTP sent to your email', pendingToken, platform, otp: otp };
};

const verifyLoginOTP = async (email, otp, platform) => {
  const isValid = verifyOTP(email, otp);
  if (!isValid) {
    logger.warn('Invalid or expired login OTP', { email, platform });
    throw createError(400, 'Invalid or expired OTP');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.warn('User not found during OTP verification', { email });
    throw createError(404, 'User not found');
  }

  if (!['WEB', 'MOBILE'].includes(platform)) {
    logger.warn('Invalid platform during OTP verification', { platform });
    throw createError(400, 'Invalid platform');
  }

  if (user.pendingLoginToken === null || user.pendingLoginPlatform !== platform) {
    logger.warn('No pending login session or invalid platform', { email, platform });
    throw createError(400, 'No pending login session found or invalid platform');
  }

  const sessionVersion = (platform === 'WEB' ? user.webSessionVersion : user.mobileSessionVersion) + 1;
  const sessionId = uuidv4();
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.userrole,
    platform,
    sessionVersion,
  });
  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.userrole,
    platform,
    sessionVersion,
  });

  const updateData = platform === 'WEB'
    ? {
        webRefreshToken: refreshToken,
        webSessionId: sessionId,
        webRefreshTokenExpiresAt: refreshTokenExpiresAt,
        webSessionVersion: sessionVersion,
        pendingLoginToken: null,
        pendingLoginPlatform: null,
      }
    : {
        mobileRefreshToken: refreshToken,
        mobileSessionId: sessionId,
        mobileRefreshTokenExpiresAt: refreshTokenExpiresAt,
        mobileSessionVersion: sessionVersion,
        pendingLoginToken: null,
        pendingLoginPlatform: null,
      };

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: updateData,
    }),
  ]);

  logger.info('Login successful, tokens issued', { email, platform, sessionId });
  return {
    accessToken,
    refreshToken,
    sessionId,
    message: 'Login successful',
    platform,
  };
};

const logout = async (email, platform) => {
  if (!['WEB', 'MOBILE'].includes(platform)) {
    logger.warn('Invalid platform during logout', { platform });
    throw createError(400, 'Invalid platform');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.warn('User not found during logout', { email });
    throw createError(404, 'User not found');
  }

  const storedRefreshToken = platform === 'WEB' ? user.webRefreshToken : user.mobileRefreshToken;
  if (!storedRefreshToken) {
    logger.warn('No active session found for logout', { email, platform });
    throw createError(400, 'No active session found for this platform');
  }

  const updateData = platform === 'WEB'
    ? { webRefreshToken: null, webSessionId: null, webRefreshTokenExpiresAt: null }
    : { mobileRefreshToken: null, mobileSessionId: null, mobileRefreshTokenExpiresAt: null };

  await prisma.user.update({
    where: { email },
    data: updateData,
  });

  logger.info('User logged out successfully', { email, platform });
};

const refresh = async (refreshToken, platform) => {
  if (!['WEB', 'MOBILE'].includes(platform)) {
    logger.warn('Invalid platform during token refresh', { platform });
    throw createError(400, 'Invalid platform');
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const whereClause = platform === 'WEB'
      ? { webRefreshToken: refreshToken }
      : { mobileRefreshToken: refreshToken };

    const user = await prisma.user.findFirst({ where: whereClause });

    if (!user || user.id !== payload.id || user.userrole !== payload.role || platform !== payload.platform) {
      logger.warn('Invalid refresh token', { platform });
      throw createError(403, 'Invalid refresh token');
    }

    const refreshTokenExpiresAt = platform === 'WEB' ? user.webRefreshTokenExpiresAt : user.mobileRefreshTokenExpiresAt;
    const currentSessionVersion = platform === 'WEB' ? user.webSessionVersion : user.mobileSessionVersion;

    if (!refreshTokenExpiresAt || new Date() > refreshTokenExpiresAt) {
      logger.warn('Refresh token expired', { platform });
      throw createError(403, 'Refresh token expired');
    }

    if (payload.sessionVersion !== currentSessionVersion) {
      logger.warn('Refresh token invalidated due to new session', { platform });
      throw createError(403, 'Refresh token invalidated due to new session');
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.userrole,
      platform,
      sessionVersion: currentSessionVersion,
    });

    logger.info('Access token refreshed', { platform, userId: user.id });
    return { accessToken: newAccessToken };
  } catch (err) {
    logger.error('Token refresh failed', {
      errorMessage: err.message,
      platform,
    });
    throw createError(403, 'Refresh token expired or invalid');
  }
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.warn('Forgot password attempt for non-existent user', { email });
    throw createError(404, 'User not found');
  }

  const resetToken = uuidv4();
  const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await prisma.user.update({
    where: { email },
    data: {
      resetPasswordToken: resetToken,
      resetPasswordExpiresAt: resetTokenExpiresAt,
    },
  });

 // await sendOTPEmail(email, resetToken);

  logger.info('Password reset token sent', { email });
  return { message: 'Password reset token sent to your email' , resetToken
: resetToken};
};

const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    logger.warn('Invalid or expired password reset token');
    throw createError(400, 'Invalid or expired reset token');
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
  });

  logger.info('Password reset successfully', { userId: user.id });
  return { message: 'Password reset successfully' };
};

module.exports = {
  register,
  verifyRegistrationOTP,
  login,
  verifyLoginOTP,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
};