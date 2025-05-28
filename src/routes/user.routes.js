const express = require('express');
const router = express.Router();
const prisma = require('../config/prismaClient');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: User
 *   description: Product, Order, Address & User endpoints
 */

/**
 * @swagger
 * /api/user/product:
 *   post:
 *     summary: Create a product
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/product', authenticate, async (req, res) => {
  const { name, description, price, imageUrl } = req.body;
  try {
    const product = await prisma.product.create({
      data: { name, description, price, imageUrl },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/user/order:
 *   post:
 *     summary: Place an order
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/order', authenticate, async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    const order = await prisma.order.create({
      data: { userId: req.user.id, productId: Number(productId), quantity: Number(quantity) },
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/user/orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of orders
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/orders', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { product: true },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/user/address:
 *   post:
 *     summary: Add a new address
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [street, city, state, zip]
 *             properties:
 *               street:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zip:
 *                 type: string
 *     responses:
 *       201:
 *         description: Address added
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/address', authenticate, async (req, res) => {
  const { street, city, state, zip } = req.body;
  try {
    const address = await prisma.address.create({
      data: { userId: req.user.id, street, city, state, zip },
    });
    res.status(201).json(address);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/user/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 *       404:
 *         description: No users found
 *       500:
 *         description: Server error
 */
router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, userrole: true, createdAt: true },
    });
    if (!users.length) {
      return res.status(404).json({ message: 'No users found' });
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;