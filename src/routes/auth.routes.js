const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');

const {
  registerController,
  loginController,
  verifyOTPController,
  verifyRegisterOTPController,
  logoutController,
  refreshTokenController,

  
} = require('../controllers/auth.controller');

router.post('/register', registerController);
router.post('/login', loginController);
router.post('/verify-otp', verifyOTPController); // For login OTP
router.post('/verify-register-otp', verifyRegisterOTPController); // For registration OTP
router.post('/logout', protect, logoutController);
router.post('/refresh-token', refreshTokenController);

module.exports = router;
