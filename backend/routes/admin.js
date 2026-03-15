// ═══════════════════════════════════════════════════════
//  routes/admin.js  –  Captain's Quarters 🏴‍☠️
//
//  FIX 1: DELETE user now prevents deleting yourself
//         or another admin (was completely unguarded)
//  FIX 2: All catch blocks forward to global error handler
//  FIX 3: promote route validates user exists before update
//  FIX 4: stats route uses lean() for faster DB reads
// ═══════════════════════════════════════════════════════

const express                = require('express');
const router                 = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User                   = require('../models/User');
const Team                   = require('../models/Team');
const Round                  = require('../models/Round');
const GameState              = require('../models/GameState');

// All routes in this file require admin
router.use(protect, adminOnly);

// Request logger for debugging
router.use((req, res, next) => {
  console.log(`📡 [ADMIN] ${req.method} ${req.originalUrl}`);
  next();
});

// ── GET dashboard stats ───────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [userCount, teamCount, rounds] = await Promise.all([
      User.countDocuments({ role: 'player' }),
      Team.countDocuments(),
      // FIX: lean() returns plain JS objects – 2-3x faster for read-only data
      Round.find().select('roundNumber title isOpen submissions').lean(),
    ]);

    res.json({
      stats: {
        totalPlayers: userCount,
        totalTeams:   teamCount,
        rounds: rounds.map(r => ({
          roundNumber:      r.roundNumber,
          title:            r.title,
          isOpen:           r.isOpen,
          submissionsCount: r.submissions.length,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET all users ────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().populate('team', 'name').select('-password').lean();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// ── DELETE a user ─────────────────────────────────────
router.delete('/users/:id', async (req, res, next) => {
  try {
    // FIX: Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: '🦜 You cannot delete yourself, Captain!' });
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: '🗺️ User not found!' });
    }

    // FIX: Prevent deleting other admins (safety guard)
    if (target.role === 'admin') {
      return res.status(403).json({ message: '🚫 Cannot remove another Captain!' });
    }

    // Remove user from their team's members array too
    if (target.team) {
      await Team.findByIdAndUpdate(target.team, {
        $pull: { members: target._id },
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '💀 User removed from the seas!' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH promote user to admin ───────────────────────
router.patch('/users/:id/promote', async (req, res, next) => {
  try {
    // FIX: Check user exists before updating
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: '🗺️ User not found!' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: '🦜 Already a Captain!' });
    }
    user.role = 'admin';
    await user.save();
    res.json({ message: `⚓ ${user.username} is now a Captain!`, user });
  } catch (err) {
    next(err);
  }
});

// ── GET round submissions with scores ─────────────────
router.get('/rounds/:roundNumber/results', async (req, res, next) => {
  try {
    const round = await Round.findOne({ roundNumber: req.params.roundNumber })
      .populate('submissions.team', 'name');
    if (!round) return res.status(404).json({ message: 'Round not found' });

    const results = round.submissions
      .sort((a, b) => b.score - a.score)
      .map((s, i) => ({
        rank:        i + 1,
        team:        s.team?.name || 'Unknown',
        score:       s.score,
        timeTaken:   s.timeTaken,
        submittedAt: s.submittedAt,
      }));

    res.json({ results });
  } catch (err) {
    next(err);
  }
});


// ── GET detailed overview analytics ──────────────────────
router.get('/overview', async (req, res, next) => {
  try {
    const [users, teams, rounds] = await Promise.all([
      User.find().select('-password').populate('team', 'name').lean(),
      Team.find().populate('members', 'username pirateName').lean(),
      Round.find().lean(),
    ]);

    const totalSubmissions = rounds.reduce((a, r) => a + r.submissions.length, 0);
    const topTeams = [...teams]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5)
      .map((t, i) => ({ rank: i + 1, name: t.name, score: t.totalScore, members: t.members.length }));

    const recentActivity = rounds.flatMap(r =>
      r.submissions.map(s => ({ type: 'submission', roundNumber: r.roundNumber, roundTitle: r.title, teamId: s.team, score: s.score, submittedAt: s.submittedAt }))
    ).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 10);

    // Populate team names for activity
    const teamMap = {};
    teams.forEach(t => { teamMap[t._id.toString()] = t.name; });
    recentActivity.forEach(a => { a.teamName = teamMap[a.teamId?.toString()] || 'Unknown'; });

    res.json({
      overview: {
        totalUsers: users.length,
        totalAdmins: users.filter(u => u.role === 'admin').length,
        totalPlayers: users.filter(u => u.role === 'player').length,
        totalTeams: teams.length,
        eliminatedTeams: teams.filter(t => t.isEliminated).length,
        activeTeams: teams.filter(t => !t.isEliminated).length,
        totalRounds: rounds.length,
        openRounds: rounds.filter(r => r.isOpen).length,
        totalSubmissions,
        avgScore: totalSubmissions > 0
          ? Math.round(rounds.flatMap(r => r.submissions.map(s => s.score)).reduce((a, b) => a + b, 0) / totalSubmissions)
          : 0,
        topTeams,
        recentActivity,
        roundBreakdown: rounds.map(r => ({
          roundNumber: r.roundNumber,
          title: r.title,
          isOpen: r.isOpen,
          questionCount: r.questions.length,
          submissionsCount: r.submissions.length,
          avgScore: r.submissions.length > 0
            ? Math.round(r.submissions.reduce((a, s) => a + s.score, 0) / r.submissions.length)
            : 0,
          maxScore: r.questions.reduce((a, q) => a + q.points, 0),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST create a team (admin) ────────────────────────────
router.post('/teams', async (req, res, next) => {
  try {
    const { name, shipName, maxMembers } = req.body;
    if (!name) return res.status(400).json({ message: 'Team name is required' });
    const team = await Team.create({ name, shipName, maxMembers: maxMembers || 4 });
    res.status(201).json({ message: '⚓ Team created!', team });
  } catch (err) {
    next(err);
  }
});

router.put('/teams/:id', async (req, res, next) => {
  try {
    const { name, shipName, maxMembers, isEliminated, scores } = req.body;
    console.log(`🏴‍☠️ Updating team ${req.params.id}...`);
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    if (name) team.name = name;
    if (shipName !== undefined) team.shipName = shipName;
    if (maxMembers) team.maxMembers = maxMembers;
    if (isEliminated !== undefined) team.isEliminated = isEliminated;

    if (scores) {
      if (scores.round1 !== undefined) team.scores.round1 = scores.round1;
      if (scores.round2 !== undefined) team.scores.round2 = scores.round2;
      if (scores.round3 !== undefined) team.scores.round3 = scores.round3;
    }

    await team.save();
    const updatedTeam = await Team.findById(team._id).populate('members', 'username pirateName');
    res.json({ message: '✅ Team updated!', team: updatedTeam });
  } catch (err) {
    next(err);
  }
});

// ── DELETE a team (admin) ─────────────────────────────────
router.delete('/teams/:id', async (req, res, next) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    // Remove team reference from all members
    await User.updateMany({ team: req.params.id }, { $set: { team: null } });
    res.json({ message: '💀 Team deleted and members unassigned!' });
  } catch (err) {
    next(err);
  }
});

// ── PUT update round (admin) ──────────────────────────────
router.put('/rounds/:roundNumber', async (req, res, next) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    const round = await Round.findOneAndUpdate(
      { roundNumber: roundNum },
      req.body,
      { new: true, runValidators: true }
    );
    if (!round) return res.status(404).json({ message: 'Round not found' });
    res.json({ message: `✅ Round ${roundNum} updated!`, round });
  } catch (err) {
    next(err);
  }
});

// ── DELETE round (admin) ──────────────────────────────────
router.delete('/rounds/:roundNumber', async (req, res, next) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    const round = await Round.findOneAndDelete({ roundNumber: roundNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });
    res.json({ message: `💀 Round ${roundNum} deleted!` });
  } catch (err) {
    next(err);
  }
});

// ── DELETE submission (admin reset) ──────────────────────
router.delete('/rounds/:roundNumber/submissions/:teamId', async (req, res, next) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    const round = await Round.findOne({ roundNumber: roundNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });

    const before = round.submissions.length;
    round.submissions = round.submissions.filter(s => s.team.toString() !== req.params.teamId);
    if (round.submissions.length === before) return res.status(404).json({ message: 'Submission not found' });

    await round.save();

    // Reset team score for this round
    const teamDoc = await Team.findById(req.params.teamId);
    if (teamDoc) {
      teamDoc.scores[`round${roundNum}`] = 0;
      teamDoc.totalScore = teamDoc.scores.round1 + teamDoc.scores.round2 + teamDoc.scores.round3;
      teamDoc.completedRounds = teamDoc.completedRounds.filter(n => n !== roundNum);
      await teamDoc.save();
    }

    res.json({ message: '🔄 Submission reset! Team can re-submit.' });
  } catch (err) {
    next(err);
  }
});

// ── POST reset global treasure state ───────────────────
router.post('/reset-treasure', async (req, res, next) => {
  try {
    let state = await GameState.findOne();
    if (state) {
      state.isFirstWinnerFound = false;
      state.winnerUser = null;
      state.winnerTeam = null;
      state.unlockedAt = null;
      await state.save();
    }
    res.json({ message: '🏆 Treasure has been reset! The race for the chest is back on.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

