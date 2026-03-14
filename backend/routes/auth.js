// ═══════════════════════════════════════════════════════
//  routes/auth.js  –  Auth Endpoints ⚓
//  Routes just map HTTP verbs + paths → controller functions.
// ═══════════════════════════════════════════════════════

const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
} = require('../controllers/authController');

// Public routes (no token needed)
router.post('/register', register);
router.post('/login',    login);

// Protected route (token required)
router.get('/me', protect, getMe);

module.exports = router;
