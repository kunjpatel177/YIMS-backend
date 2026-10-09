const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Short-lived in-memory cache to avoid hitting MongoDB on every authenticated API request
const userCache = new Map();
const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds

const invalidateUserCache = (userId) => {
  if (userId) {
    userCache.delete(String(userId));
  } else {
    userCache.clear();
  }
};

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route, token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yims_super_secure_jwt_manufacturing_secret_key_2024');
    const userId = String(decoded.id);

    const now = Date.now();
    const cached = userCache.get(userId);
    if (cached && cached.expiresAt > now) {
      req.user = cached.user;
      return next();
    }

    const user = await User.findById(decoded.id).select('-password').lean();

    if (!user) {
      userCache.delete(userId);
      return res.status(401).json({ success: false, message: 'User belonging to token no longer exists' });
    }

    userCache.set(userId, { user, expiresAt: now + USER_CACHE_TTL_MS });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired', error: error.message });
  }
};

module.exports = { protect, invalidateUserCache };
