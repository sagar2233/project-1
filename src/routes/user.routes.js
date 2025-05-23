const express = require('express');
const router = express.Router();

const prisma = require("../config/prismaClient");

// Create a user
app.post("/users", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await prisma.user.create({
      data: { name, email, password },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.post("/order", async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    const order = await prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(400).json({ error: error.message });
  }
});

app.get("/order", async (req, res) => {
  try {
    const orders = await prisma.order.findMany();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/address", async (req, res) => {
  const { street, city, state, zip } = req.body;
  try {
    const user = await prisma.address.create({
      data: { street, city, state, zip  },
    });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/product", async (req, res) => {
  const { name, description, price, imageUrl } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        imageUrl,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get all users
app.get("/users", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});
