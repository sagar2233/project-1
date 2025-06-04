require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const loggingMiddleware = require('./middlewares/logging.middleware');
const errorHandler = require('./middlewares/error.middleware');
const authRoutes = require('./routes/auth');
const logger = require('./utils/logger');

const app = express();

// CORS setup
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [];
const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
};
app.use(cors(corsOptions));

// Standard middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(loggingMiddleware);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM Authentication API',
      version: '1.0.0',
      description: 'API for CRM authentication',
    },
    servers: [
      { url: process.env.API_BASE_URL || 'http://localhost:3000', description: 'Local server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;