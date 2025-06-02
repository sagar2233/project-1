// logger.js
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');
const { combine, timestamp, printf, json, colorize, splat, errors } = format;

const LOG_DIR = process.env.LOG_DIR || 'logs'; // Configure log directory
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Custom format for console to include correlationId and pretty print metadata
const consoleFormat = printf(({ level, message, timestamp, correlationId, stack, ...metadata }) => {
  let log = `${timestamp} ${level}`;
  if (correlationId) {
    log += ` [${correlationId}]`;
  }
  log += `: ${message}`;

  // Filter out metadata that is already part of the main log string or internal to winston
  const filteredMeta = { ...metadata };
  delete filteredMeta.level;
  delete filteredMeta.message;
  delete filteredMeta.timestamp;
  delete filteredMeta.correlationId;
  delete filteredMeta.stack; // if errors({ stack: true }) is used
  // Remove splat's array if it exists and is empty or contains only undefined
  if (filteredMeta[Symbol.for('splat')] && Array.isArray(filteredMeta[Symbol.for('splat')]) && filteredMeta[Symbol.for('splat')].length === 1 && filteredMeta[Symbol.for('splat')][0] === undefined) {
    delete filteredMeta[Symbol.for('splat')];
  }


  if (Object.keys(filteredMeta).length > 0) {
    log += ` ${JSON.stringify(filteredMeta, null, process.env.NODE_ENV === 'production' ? 0 : 2 )}`; // Pretty print in dev
  }

  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

// Base format for file transports (JSON)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  splat(), // Enables string interpolation
  errors({ stack: true }), // Log stack traces for errors
  json() // Log in JSON format
);

// File transport for errors
const dailyRotateFileTransportError = new transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m', // Max size of the file after which it will rotate
  maxFiles: '14d', // Keep logs for 14 days
  level: 'error', // Only log errors
  format: fileFormat,
});

// File transport for all logs (combined)
const dailyRotateFileTransportCombined = new transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: LOG_LEVEL, // Log all levels up to LOG_LEVEL
  format: fileFormat,
});

const logger = createLogger({
  level: LOG_LEVEL,
  format: combine( // Default format applied to all transports unless overridden
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    splat()
  ),
  transports: [
    dailyRotateFileTransportError,
    dailyRotateFileTransportCombined,
  ],
  exceptionHandlers: [ // Handle uncaught exceptions
    new transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    }),
    new transports.Console({ // Also log exceptions to console
      format: combine(
        colorize(),
        splat(),
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
      handleExceptions: true, // Ensure this transport handles exceptions
    })
  ],
  rejectionHandlers: [ // Handle unhandled promise rejections
    new transports.DailyRotateFile({
      filename: path.join(LOG_DIR, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    }),
    new transports.Console({ // Also log rejections to console
      format: combine(
        colorize(),
        splat(),
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
      handleRejections: true, // Ensure this transport handles rejections
    })
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Console transport: behavior depends on NODE_ENV
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: combine(
        colorize(), // Add colors for readability in dev
        splat(),
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
      level: 'debug', // More verbose in development
    })
  );
} else {
  // For production, you might still want console logs if they are collected by a container orchestrator.
  // In that case, structured (JSON) console logs are often preferred.
  logger.add(
    new transports.Console({
      format: combine( // Production console logs as JSON
        splat(),
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json() // Output JSON to console in production
      ),
      level: LOG_LEVEL, // Respect the configured LOG_LEVEL
    })
  );
}

module.exports = logger;