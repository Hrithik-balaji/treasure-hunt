// ═══════════════════════════════════════════════════════
//  server.js  –  The Captain's Bridge 🏴‍☠️
//  FIX: Added rate limiting, security headers (helmet),
//       global error handler, graceful shutdown,
//       and MongoDB connection-pool tuning for high load.
// ═══════════════════════════════════════════════════════

const express       = require('express');
const mongoose      = require('mongoose');
const cors          = require('cors');
const dotenv        = require('dotenv');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

dotenv.config();

const app = express();

// ── SECURITY MIDDLEWARE ──────────────────────────────────
// Helmet sets secure HTTP headers (XSS, clickjacking, etc.)
app.use(cors());

// Strip MongoDB operators from user input (NoSQL injection guard)
app.use(mongoSanitize());

// ── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET','POST','PUT','PATCH','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── BODY PARSER ──────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));

// ── RATE LIMITING ────────────────────────────────────────
// Global: 200 requests per 15 min per IP (handles large crowds)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '⚓ Too many requests from this ship – slow down, matey!' },
});
app.use('/api', globalLimiter);

// Strict limiter for auth routes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: '🦜 Too many login attempts – walk the plank and wait!' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── ROUTES ───────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/teams',       require('./routes/teams'));
app.use('/api/rounds',      require('./routes/rounds'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin',       require('./routes/admin'));

// ── HEALTH CHECK ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🏴‍☠️ Treasure Hunt API is sailing smoothly!' });
});

// ── 404 HANDLER ──────────────────────────────────────────
// FIX: was missing – unknown routes previously caused unhandled errors
app.use((req, res) => {
  res.status(404).json({ message: '🗺️ Route not found – check your map!' });
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────
// FIX: was entirely missing – unhandled errors could crash the process
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('💀 Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ message: `🦜 That ${field} is already taken, pirate!` });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: '🦜 Invalid token – impostor caught!' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: '⌛ Token expired – login again!' });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
});

// ── CONNECT TO MONGODB & START SERVER ───────────────────
// FIX: Added connection-pool options for high-concurrency events
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: 'treasurehunt',
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log(`MongoDB connected (db: ${mongoose.connection.name})`);
    const PORT = process.env.PORT || 5000;
    // Bind to 0.0.0.0 so Render's port scanner can detect the open port
    const server = app.listen(PORT, '0.0.0.0', () =>
      console.log(`🏴‍☠️ Server sailing on port ${PORT}`)
    );

    // ── GRACEFUL SHUTDOWN ──────────────────────────────
    // Use promise-based close() — Mongoose v8 removed the callback overload
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        mongoose.connection.close()
          .then(() => {
            console.log('⚓ MongoDB connection closed. Goodbye!');
            process.exit(0);
          })
          .catch(() => process.exit(0));
      });
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('💀 Unhandled Rejection:', reason);
    });
  })
  .catch((err) => {
    console.error('💀 MongoDB connection failed:', err.message);
    process.exit(1);
  });
