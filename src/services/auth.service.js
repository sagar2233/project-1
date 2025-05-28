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

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const register = async (name, email, password) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await prisma.user.create({
    data: { name, email, password: hashedPassword, isVerified: false },
  });

  const otp = generateOTP();
  storeOTP(email, otp);
  await sendOTPEmail(email, otp);

  return { message: 'OTP sent to your email. Please verify.', userId: newUser.id, otp };
};

const verifyRegistrationOTP = async (email, otp) => {
  const isValid = verifyOTP(email, otp);
  if (!isValid) throw new Error('Invalid or expired OTP');
  
  const user = await prisma.user.update({
    where: { email },
    data: { isVerified: true, isOtpEnabled: true },
  });

  return { message: 'Email verified successfully', userId: user.id };
};

const login = async (email, password, platform) => {
  if (!['WEB', 'MOBILE'].includes(platform)) throw new Error('Invalid platform');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new Error('Invalid credentials');

  if (!user.isVerified) throw new Error('Please verify your email first.');

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
  await sendOTPEmail(email, otp);

  return { message: 'OTP sent to your email', pendingToken, platform ,otp: otp};
};

const verifyLoginOTP = async (email, otp, platform) => {
  const isValid = verifyOTP(email, otp);
  if (!isValid) throw new Error('Invalid or expired OTP');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  if (!['WEB', 'MOBILE'].includes(platform)) throw new Error('Invalid platform');

  if (user.pendingLoginToken === null || user.pendingLoginPlatform !== platform) {
    throw new Error('No pending login session found or invalid platform');
  }

  // Log session data before update
  console.log(`[Before Update] User ${email}, Platform: ${platform}, WebRefreshToken: ${user.webRefreshToken}, WebSessionVersion: ${user.webSessionVersion}, MobileRefreshToken: ${user.mobileRefreshToken}, MobileSessionVersion: ${user.mobileSessionVersion}`);

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

  // Use a transaction to ensure atomic update
  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: updateData,
    }),
  ]);

  // Log session data after update
  const updatedUser = await prisma.user.findUnique({ where: { email } });
  console.log(`[After Update] User ${email}, Platform: ${platform}, WebRefreshToken: ${updatedUser.webRefreshToken}, WebSessionVersion: ${updatedUser.webSessionVersion}, MobileRefreshToken: ${updatedUser.mobileRefreshToken}, MobileSessionVersion: ${updatedUser.mobileSessionVersion}`);

  return {
    accessToken,
    refreshToken,
    sessionId,
    message: 'Login successful',
    platform,
  };
};

const logout = async (email, platform) => {
  if (!['WEB', 'MOBILE'].includes(platform)) throw new Error('Invalid platform');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const storedRefreshToken = platform === 'WEB' ? user.webRefreshToken : user.mobileRefreshToken;
  if (!storedRefreshToken) throw new Error('No active session found for this platform');

  const updateData = platform === 'WEB'
    ? { webRefreshToken: null, webSessionId: null, webRefreshTokenExpiresAt: null }
    : { mobileRefreshToken: null, mobileSessionId: null, mobileRefreshTokenExpiresAt: null };

  await prisma.user.update({
    where: { email },
    data: updateData,
  });
};

const refresh = async (refreshToken, platform) => {
  if (!['WEB', 'MOBILE'].includes(platform)) throw new Error('Invalid platform');

  try {
    const payload = verifyRefreshToken(refreshToken);
    const whereClause = platform === 'WEB'
      ? { webRefreshToken: refreshToken }
      : { mobileRefreshToken: refreshToken };

    const user = await prisma.user.findFirst({ where: whereClause });

    if (!user || user.id !== payload.id || user.userrole !== payload.role || platform !== payload.platform) {
      throw new Error('Invalid refresh token');
    }

    const refreshTokenExpiresAt = platform === 'WEB' ? user.webRefreshTokenExpiresAt : user.mobileRefreshTokenExpiresAt;
    const currentSessionVersion = platform === 'WEB' ? user.webSessionVersion : user.mobileSessionVersion;

    if (!refreshTokenExpiresAt || new Date() > refreshTokenExpiresAt) {
      throw new Error('Refresh token expired');
    }

    if (payload.sessionVersion !== currentSessionVersion) {
      throw new Error('Refresh token invalidated due to new session');
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.userrole,
      platform,
      sessionVersion: currentSessionVersion,
    });

    return { accessToken: newAccessToken };
  } catch (err) {
    throw new Error('Refresh token expired or invalid');
  }
};

module.exports = {
  register,
  verifyRegistrationOTP,
  login,
  verifyLoginOTP,
  logout,
  refresh,
};