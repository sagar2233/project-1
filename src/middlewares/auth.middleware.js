const createError = require('http-errors');
const { verifyToken } = require('../utils/jwt.util');
const prisma = require('../config/prismaClient');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('No token provided', { correlationId: req.correlationId });
    return next(createError(401, 'Unauthorized: No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
    if (!['WEB', 'MOBILE'].includes(decoded.platform)) {
      logger.warn('Invalid platform in token', { correlationId: req.correlationId });
      return next(createError(401, 'Invalid platform in token'));
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      logger.warn('User not found', { correlationId: req.correlationId });
      return next(createError(401, 'User not found'));
    }

    const storedRefreshToken = decoded.platform === 'WEB' ? user.webRefreshToken : user.mobileRefreshToken;
    const refreshTokenExpiresAt = decoded.platform === 'WEB' ? user.webRefreshTokenExpiresAt : user.mobileRefreshTokenExpiresAt;
    const currentSessionVersion = decoded.platform === 'WEB' ? user.webSessionVersion : user.mobileSessionVersion;

    if (!storedRefreshToken) {
      logger.warn('No active session for this platform', { correlationId: req.correlationId });
      return next(createError(401, 'No active session for this platform'));
    }

    if (refreshTokenExpiresAt && new Date() > refreshTokenExpiresAt) {
      logger.warn('Session has expired', { correlationId: req.correlationId });
      return next(createError(401, 'Session has expired'));
    }

    if (decoded.sessionVersion !== currentSessionVersion) {
      logger.warn('Token invalidated due to new session', { correlationId: req.correlationId });
      return next(createError(401, 'Token invalidated due to new session'));
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error('Token verification failed', {
      correlationId: req.correlationId,
      errorMessage: err.message,
      stack: err.stack,
    });
    return next(createError(401, 'Invalid or expired token'));
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Unauthorized: No user in request', { correlationId: req.correlationId });
      return next(createError(401, 'Unauthorized'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Forbidden: Access denied', { correlationId: req.correlationId });
      return next(createError(403, 'Forbidden: Access denied'));
    }

    next();
  };
};

module.exports = { authenticate, authorize };