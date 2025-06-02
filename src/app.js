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

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://your-production-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(loggingMiddleware);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Authentication API',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
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

// Handle CORS errors
app.use((err, req, res, next) => {
  if (err instanceof cors.CorsError) {
    logger.warn('CORS error', {
      correlationId: req.correlationId,
      origin: req.get('origin'),
      method: req.method,
      url: req.originalUrl,
    });
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  next(err);
});

module.exports = app;