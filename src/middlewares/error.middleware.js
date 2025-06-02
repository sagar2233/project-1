const createError = require('http-errors');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error with Winston
  logger.error(err.message, {
    correlationId: req.correlationId,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // Handle known error types
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details.map((detail) => detail.message),
    });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Default to 500 for unhandled errors
  res.status(500).json({ error: 'Internal Server Error' });
};

module.exports = errorHandler;