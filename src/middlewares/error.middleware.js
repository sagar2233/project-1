const createError = require('http-errors');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error with Winston
  logger.error(err.message || 'Unknown error', {
    correlationId: req.correlationId,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    // Sanitize headers to avoid logging sensitive data
    headers: Object.fromEntries(
      Object.entries(req.headers || {}).filter(([key]) => !['authorization', 'cookie'].includes(key.toLowerCase()))
    ),
  });

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS' || err.status === 403) {
    logger.warn('CORS error', {
      correlationId: req.correlationId,
      origin: req.get('origin') || 'unknown',
      method: req.method,
      url: req.originalUrl,
    });
    return res.status(403).json({ error: 'CORS policy violation' });
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details.map((detail) => detail.message),
    });
  }

  // Handle HTTP errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Default to 500 for unhandled errors
  res.status(500).json({ error: 'Internal Server Error' });
};

module.exports = errorHandler;