const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const {
  registerController,
  loginController,
  verifyOTPController,
  verifyRegisterOTPController,
  logoutController,
  refreshTokenController,
} = require('../controllers/auth.controller');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or user already exists
 */
router.post('/register', registerController);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - platform
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               platform:
 *                 type: string
 *                 enum: [WEB, MOBILE]
 *     responses:
 *       200:
 *         description: Login successful. OTP sent.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                 platform:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginController);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify login OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - platform
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [WEB, MOBILE]
 *     responses:
 *       200:
 *         description: OTP verified and tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                 message:
 *                   type: string
 *                 platform:
 *                   type: string
 *       400:
 *         description: Invalid OTP or expired
 */
router.post('/verify-otp', verifyOTPController);

/**
 * @swagger
 * /api/auth/verify-register-otp:
 *   post:
 *     summary: Verify registration OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account activated successfully
 *       400:
 *         description: Invalid OTP or expired
 */
router.post('/verify-register-otp', verifyRegisterOTPController);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - platform
 *             properties:
 *               email:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [WEB, MOBILE]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400:
 *         description: Invalid input
 */
router.post('/logout', logoutController);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *               - platform
 *             properties:
 *               refreshToken:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [WEB, MOBILE]
 *     responses:
 *       200:
 *         description: Token refreshed
 *       403:
 *         description: Refresh token invalid or expired
 */
router.post('/refresh-token', refreshTokenController);

/**
 * @swagger
 * /api/auth/admin-only:
 *   get:
 *     summary: Admin-only protected route
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access granted
 *       401:
 *         description: Unauthorized or invalid
 *       403:
 *         description: Forbidden - not an admin
 */
router.get('/admin-only', authenticate, authorize('ADMIN'), (req, res) => {
  res.json({ message: 'Welcome, Admin!' });
});

module.exports = router;