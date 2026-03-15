// ═══════════════════════════════════════════════════════
//  middleware/auth.js  –  The Gatekeeper ⚔️
//
//  FIX 1: Token extraction now handles malformed headers
//  FIX 2: User-not-found returns 401 instead of crashing
//  FIX 3: All async errors forwarded to Express error handler
// ═══════════════════════════════════════════════════════

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // FIX: Safely extract token; ignore malformed Authorization headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: '🏴‍☠️ No token! Walk the plank!' });
    }

    // Verify signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user (excluding password) to request
    req.user = await User.findById(decoded.id).select('-password').populate('team');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found – ghost ship!' });
    }

    next();
  } catch (err) {
    // FIX: forward JWT errors (expired, invalid) to global error handler
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '⌛ Session expired – please login again!' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '🦜 Invalid token – impostor caught!' });
    }
    next(err);
  }
};

const adminOnly = (req, res, next) => {
  // FIX: Clearer error message so admin knows what's happening
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '🚫 Only the Captain (admin) can do this!' });
  }
  next();
};

module.exports = { protect, adminOnly };
