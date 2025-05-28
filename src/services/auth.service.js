const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt.util');
const { generateOTP, storeOTP, verifyOTP } = require('../utils/otp.util');
const { sendOTPEmail } = require('../utils/email.util');

const SALT_ROUNDS = 10;

const register = async (name, email, password) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await prisma.user.create({
    data: { name, email, password: hashedPassword, isVerified: false },
  });

  const otp = generateOTP();
  storeOTP(email, otp);
 // await sendOTPEmail(email, otp);

  return { message: 'OTP sent to your email. Please verify.', userId: newUser.id , otp
: otp};
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

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.userrole,
    platform,
  });
  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.userrole,
    platform,
  });
  const sessionId = uuidv4();

  // Clear existing session for the same platform
  const updateData = platform === 'WEB'
    ? { webRefreshToken: refreshToken, webSessionId: sessionId }
    : { mobileRefreshToken: refreshToken, mobileSessionId: sessionId };

  await prisma.user.update({
    where: { email },
    data: updateData,
  });

  const otp = generateOTP();
  storeOTP(email, otp);
  await sendOTPEmail(email, otp);

  return { message: 'OTP sent to your email', accessToken, refreshToken, sessionId, platform };
};

const verifyLoginOTP = async (email, otp, platform) => {
  const isValid = verifyOTP(email, otp);
  if (!isValid) throw new Error('Invalid or expired OTP');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  if (!['WEB', 'MOBILE'].includes(platform)) throw new Error('Invalid platform');

  const storedRefreshToken = platform === 'WEB' ? user.webRefreshToken : user.mobileRefreshToken;
  const storedSessionId = platform === 'WEB' ? user.webSessionId : user.mobileSessionId;

  if (!storedRefreshToken || !storedSessionId) throw new Error('No active session found');

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.userrole,
    platform,
  });

  return {
    accessToken,
    refreshToken: storedRefreshToken,
    sessionId: storedSessionId,
    message: 'Login successful',
    platform,
  };
};

const logout = async (email, platform) => {
  if (!['WEB', 'MOBILE'].includes(platform)) throw new Error('Invalid platform');

  const updateData = platform === 'WEB'
    ? { webRefreshToken: null, webSessionId: null }
    : { mobileRefreshToken: null, mobileSessionId: null };

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

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.userrole,
      platform,
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