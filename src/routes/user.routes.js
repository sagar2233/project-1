const express = require('express');
const router = express.Router();
const prisma = require('../config/prismaClient');

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
 */
router.post('/product', async (req, res) => {
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, productId, quantity]
 *             properties:
 *               userId:
 *                 type: string
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Invalid input
 */
router.post('/order', async (req, res) => {
  const { userId, productId, quantity } = req.body;
  try {
    const order = await prisma.order.create({
      data: { userId, productId, quantity },
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
 *     summary: Get all orders
 *     tags: [User]
 *     responses:
 *       200:
 *         description: A list of orders
 *       500:
 *         description: Server error
 */
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany();
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
 */
router.post('/address', async (req, res) => {
  const { street, city, state, zip } = req.body;
  try {
    const address = await prisma.address.create({
      data: { street, city, state, zip },
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
 *     summary: Get all users
 *     tags: [User]
 *     responses:
 *       200:
 *         description: List of users
 *       404:
 *         description: No users found
 *       500:
 *         description: Server error
 */
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    if (!users.length) {
      return res.status(404).json({ message: 'No users found' });
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
