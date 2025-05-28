const { verifyToken } = require('../utils/jwt.util');
const prisma = require('../config/prismaClient');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
    if (!['WEB', 'MOBILE'].includes(decoded.platform)) {
      return res.status(401).json({ error: 'Invalid platform in token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const storedRefreshToken = decoded.platform === 'WEB' ? user.webRefreshToken : user.mobileRefreshToken;
    if (!storedRefreshToken) {
      return res.status(401).json({ error: 'No active session for this platform' });
    }

    req.user = decoded; // decoded: { id, email, role, platform }
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    next();
  };
};

module.exports = { authenticate, authorize };