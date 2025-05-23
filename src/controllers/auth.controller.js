const {
  register,
  login,
  verifyLoginOTP,
  verifyRegistrationOTP,
  logout,
  refresh,
} = require('../services/auth.service');

const registerController = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await register(name, email, password);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);

    // Extract tokens from the result if login returns OTP step (adjust accordingly)
    // But since your login sends OTP, refresh token is generated after OTP verification.
    // So we do it in verifyLoginOTP controller instead.

    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const verifyOTPController = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyLoginOTP(email, otp); // this returns accessToken & refreshToken

    // Set refreshToken in cookie securely
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // only true in prod (HTTPS)
      sameSite: 'Strict', // adjust to 'Lax' if needed
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Don't send refreshToken in response body (optional, for extra security)
    const { refreshToken, ...rest } = result;

    res.status(200).json(rest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


const verifyRegisterOTPController = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyRegistrationOTP(email, otp);
    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// const logoutController = async (req, res) => {
//   try {
//     await logout(req.user.userId); // req.user is assumed to be populated via auth middleware
//     res.status(200).json({ message: 'Logged out successfully' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
const logoutController = async (req, res) => {
  try {
    await logout(req.user.id);  // Clear refresh token in DB for user

    // Clear cookie on frontend (assuming cookie name 'accessToken')
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await refresh(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
};

module.exports = {
  registerController,
  loginController,
  verifyOTPController,
  verifyRegisterOTPController,
  logoutController,
  refreshTokenController,
};
