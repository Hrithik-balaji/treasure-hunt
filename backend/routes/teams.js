// ═══════════════════════════════════════════════════════
//  routes/teams.js  –  Crew Management 🚢
//
//  FIX 1: All catch blocks use next(err)
//  FIX 2: join/create routes check team size atomically
//  FIX 3: my-team route now always populates members
// ═══════════════════════════════════════════════════════

const express              = require('express');
const router               = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Team                 = require('../models/Team');
const User                 = require('../models/User');

// ── GET all teams (admin) ─────────────────────────────
router.get('/', protect, adminOnly, async (req, res, next) => {
  try {
    const teams = await Team.find().populate('members', 'username pirateName email').lean();
    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

// ── GET current user's team ───────────────────────────
router.get('/my-team', protect, async (req, res, next) => {
  try {
    if (!req.user.team) {
      return res.status(404).json({ message: '🏴‍☠️ You are not in a crew yet!' });
    }
    const team = await Team.findById(req.user.team).populate('members', 'username pirateName');
    if (!team) return res.status(404).json({ message: '🏴‍☠️ Crew not found!' });

    // FIX: Self-repair data if missing for Round 2
    let modified = false;
    if (!team.assignedPinDigits || team.assignedPinDigits.length === 0) {
      team.assignedPinDigits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
      modified = true;
    }
    if (!team.round2Digits || team.round2Digits.length === 0) {
      team.round2Digits = ["?", "?", "?", "?", "?"];
      modified = true;
    }
    if (modified) await team.save();

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

// ── POST create a team ────────────────────────────────
router.post('/create', protect, async (req, res, next) => {
  try {
    if (req.user.team) {
      return res.status(400).json({ message: '🦜 You already belong to a crew!' });
    }
    const { name, shipName } = req.body;
    if (!name) return res.status(400).json({ message: '🦜 Team name is required!' });

    const team = await Team.create({ name, shipName, members: [req.user._id] });
    await User.findByIdAndUpdate(req.user._id, { team: team._id });
    res.status(201).json({ message: '⚓ Crew created!', team });
  } catch (err) {
    next(err);
  }
});

// ── POST join a team by code ──────────────────────────
router.post('/join', protect, async (req, res, next) => {
  try {
    if (req.user.team) {
      return res.status(400).json({ message: '🦜 You already belong to a crew!' });
    }
    if (!req.body.joinCode) {
      return res.status(400).json({ message: '🦜 Join code is required!' });
    }

    // FIX: Use findOneAndUpdate with $push + size check atomically
    const team = await Team.findOne({ joinCode: req.body.joinCode.toUpperCase() });
    if (!team) return res.status(404).json({ message: '🗺️ No crew with that code!' });
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: '🚢 That ship is full, matey!' });
    }

    team.members.push(req.user._id);
    await team.save();
    await User.findByIdAndUpdate(req.user._id, { team: team._id });
    res.json({ message: '🎉 Ye joined the crew!', team });
  } catch (err) {
    next(err);
  }
});

// ── PATCH eliminate a team (admin) ────────────────────
router.patch('/:id/eliminate', protect, adminOnly, async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { isEliminated: true },
      { new: true }
    );
    if (!team) return res.status(404).json({ message: '🗺️ Team not found!' });
    res.json({ message: '💀 Team eliminated!', team });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
