const { verifyToken } = require('../utils/jwt.util');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No token provided or malformed token");
    return res.status(401).json({ error: "Unauthorized: No token" });
  }

  const token = authHeader.split(' ')[1];
  console.log("Extracted token:",token);

  try {
    const decoded = verifyToken(token);
    console.log("Decoded token:",decoded);
    req.user = decoded; // Attach user info to req for next middlewares/controllers
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Token invalid or expired" });
  }
};

module.exports = { protect };
