const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const getDurationInMilliseconds = (start) => {
  const NS_PER_SEC = 1e9;
  const NS_TO_MS = 1e-6;
  const diff = process.hrtime(start);
  return (diff[0] * NS_PER_SEC + diff[1]) * NS_TO_MS;
};

const loggingMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const start = process.hrtime();

  const requestLogDetails = {
    correlationId,
    httpMethod: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, requestLogDetails);

  res.on('finish', () => {
    const durationMs = getDurationInMilliseconds(start);
    const responseLogDetails = {
      correlationId,
      httpMethod: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs.toFixed(3)),
    };

    const message = `Response: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Duration: ${durationMs.toFixed(3)}ms`;

    if (res.statusCode >= 500) {
      logger.error(message, responseLogDetails);
    } else if (res.statusCode >= 400) {
      logger.warn(message, responseLogDetails);
    } else {
      logger.info(message, responseLogDetails);
    }
  });

  res.on('error', (err) => {
    const durationMs = getDurationInMilliseconds(start);
    logger.error(`Response Error: ${req.method} ${req.originalUrl}`, {
      correlationId,
      httpMethod: req.method,
      url: req.originalUrl,
      errorMessage: err.message,
      stack: err.stack,
      durationMs: parseFloat(durationMs.toFixed(3)),
      statusCode: res.statusCode,
    });
  });

  next();
};

module.exports = loggingMiddleware;