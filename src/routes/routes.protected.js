const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Protected
 *   description: Authenticated user and admin-only routes
 */

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get logged-in user's profile
 *     tags: [Protected]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello, user@example.com!
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Unauthorized – token missing or invalid
 */
router.get('/profile', authenticate, (req, res) => {
  res.json({
    message: `Hello, ${req.user.email}!`,
    user: req.user,
  });
});

/**
 * @swagger
 * /api/admin:
 *   get:
 *     summary: Admin-only access
 *     tags: [Protected]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access granted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome Admin!
 *       401:
 *         description: Unauthorized – token missing or invalid
 *       403:
 *         description: Forbidden – user is not an admin
 */
router.get('/admin', authenticate, authorize('ADMIN'), (req, res) => {
  res.json({ message: 'Welcome Admin!' });
});

module.exports = router;
