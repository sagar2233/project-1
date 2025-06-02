// loggingMiddleware.js
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger'); // Ensure this path is correct

const getDurationInMilliseconds = (start) => {
  const NS_PER_SEC = 1e9;
  const NS_TO_MS = 1e-6;
  const diff = process.hrtime(start);
  return (diff[0] * NS_PER_SEC + diff[1]) * NS_TO_MS;
};

const loggingMiddleware = (req, res, next) => {
  // Use existing correlation ID from header if present, otherwise generate a new one
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId; // Attach to request object for use in controllers/services
  res.setHeader('X-Correlation-Id', correlationId);

  const start = process.hrtime();

  // Log incoming request details with structured metadata
  const requestLogDetails = {
    correlationId,
    httpMethod: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    // Note: Logging req.body can be verbose and may expose sensitive data.
    // If you need it, implement robust sanitization.
    // Example: body: sanitize(req.body)
  };
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, requestLogDetails);

  // Log response details on 'finish'
  res.on('finish', () => {
    const durationMs = getDurationInMilliseconds(start);
    const responseLogDetails = {
      correlationId,
      httpMethod: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: parseFloat(durationMs.toFixed(3)),
      // Note: Logging response body can also be verbose and sensitive.
      // Example: responseBody: sanitize(res.locals.body) // If you capture it
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

  // Log errors that occur during response streaming
  res.on('error', (err) => {
    const durationMs = getDurationInMilliseconds(start);
    logger.error(`Response Error: ${req.method} ${req.originalUrl}`, {
        correlationId,
        httpMethod: req.method,
        url: req.originalUrl,
        errorMessage: err.message,
        stack: err.stack,
        durationMs: parseFloat(durationMs.toFixed(3)),
        statusCode: res.statusCode, // May not be set or accurate if error happened before headers sent
    });
  });

  next();
};

module.exports = loggingMiddleware;