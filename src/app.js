require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger')
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/routes.protected');
const userRoutes = require('./routes/user.routes');

const app = express();

// Middleware
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', protectedRoutes); // Includes /api/profile, /api/admin

// Health check (optional)
app.get('/', (req, res) => {
  res.json({ message: 'API is running successfully 🚀' });
});

module.exports = app;
