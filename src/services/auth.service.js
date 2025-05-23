const bcrypt = require('bcrypt');
const { prisma } = require('../config/prismaClient');
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
  sendOTPEmail(email, otp).catch(console.error);

  return { message: 'OTP sent to your email. Please verify.', userId: newUser.id };
};

// const verifyRegistrationOTP = async (email, otp) => {
//   const isValid = verifyOTP(email, otp);
//   if (!isValid) throw new Error('Invalid or expired OTP');

//   const user = await prisma.user.update({
//     where: { email },
//     data: {isOtpEnabled: true },
//   });

//   return { message: 'Email verified successfully', userEmail: user.email };
// };

const verifyRegistrationOTP = async (email, otp) => {
  const isValid = verifyOTP(email, otp);
  if (!isValid) throw new Error('Invalid or expired OTP');

  const user = await prisma.user.update({
    where: { email },
    data: { isVerified: true, isOtpEnabled: true },
  });

  const accessToken = generateAccessToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

  await prisma.user.update({
    where: { email },
    data: { refreshToken },
  });

  return {
    message: 'Email verified successfully',
    accessToken,
    refreshToken,
  };
};

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password)))
    throw new Error('Invalid credentials');

  if (!user.isVerified) throw new Error('Please verify your email first.');

  const otp = generateOTP();
  storeOTP(email, otp);
  sendOTPEmail(email, otp).catch(console.error);

  return { message: 'OTP sent to your email' };
};

const verifyLoginOTP = async (email, otp) => {
  const isValid = verifyOTP(email, otp);
  if (!isValid) throw new Error('Invalid or expired OTP');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const accessToken = generateAccessToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

  await prisma.user.update({
    where: { email },
    data: { refreshToken },
  });

  return {
    accessToken,
    refreshToken,
    message: 'Login successful',
  };
};

const logout = async (userId) => {
  // Remove the refresh token from DB so user cannot refresh tokens
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};


const refresh = async (refreshToken) => {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });

    if (!user || user.refreshToken !== refreshToken)
      throw new Error('Invalid refresh token');

    const newAccessToken = generateAccessToken({ id: user.id, email: user.email });
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
