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
    const { email, password, platform } = req.body;
    if (!platform) return res.status(400).json({ error: 'Platform is required' });
    const result = await login(email, password, platform.toUpperCase());
    res.status(200).json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const verifyOTPController = async (req, res) => {
  try {
    const { email, otp, platform } = req.body;
    if (!platform) return res.status(400).json({ error: 'Platform is required' });
    const result = await verifyLoginOTP(email, otp, platform.toUpperCase());

    res.cookie(`${platform.toLowerCase()}RefreshToken`, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

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

const logoutController = async (req, res) => {
  try {
    const { email, platform } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!platform) return res.status(400).json({ error: 'Platform is required' });
    await logout(email, platform.toUpperCase());

    res.clearCookie(`${platform.toLowerCase()}RefreshToken`, {
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
    const { refreshToken, platform } = req.body;
    if (!platform) return res.status(400).json({ error: 'Platform is required' });
    if (!refreshToken && !req.cookies[`${platform.toLowerCase()}RefreshToken`]) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    const token = refreshToken || req.cookies[`${platform.toLowerCase()}RefreshToken`];
    const result = await refresh(token, platform.toUpperCase());
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