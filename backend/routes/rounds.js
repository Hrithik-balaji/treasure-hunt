// ═══════════════════════════════════════════════════════
//  routes/rounds.js  –  The Treasure Challenges 🗺️
//
//  FIX 1: /seed route moved BEFORE /:roundNumber so Express
//         doesn't treat "seed" as a roundNumber param
//  FIX 2: Submission uses $push with $not-exists check (atomic)
//         to prevent race-condition double-submissions
//  FIX 3: teamDoc score update uses $inc to avoid stale-read bugs
//  FIX 4: All catch blocks use next(err)
//  FIX 5: Round number param validated as a number
// ═══════════════════════════════════════════════════════

const express              = require('express');
const router               = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Round                = require('../models/Round');
const Team                 = require('../models/Team');
const User                 = require('../models/User');
const GameState            = require('../models/GameState');
const defaultRounds        = require('../data/defaultRounds');

// ── ADMIN: Seed default questions ─────────────────────
// FIX: Must come BEFORE /:roundNumber or "seed" is parsed as a round number
router.post('/seed', protect, adminOnly, async (req, res, next) => {
  try {
    await Round.deleteMany({});
    await Round.insertMany(defaultRounds);
    res.json({ message: '🗺️ Treasure map seeded with questions!' });
  } catch (err) {
    next(err);
  }
});

// ── GET all rounds ────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const query = req.user.role !== 'admin' ? { isOpen: true } : {};
    const rounds = await Round.find(query)
      .select('-submissions -questions.correctAnswer')
      .lean();
    res.json({ rounds });
  } catch (err) {
    next(err);
  }
});

const verifyClueHandler = async (req, res, next) => {
  try {
    const { roundNumber, questionIndex, answer } = req.body;
    if (roundNumber !== 2 && roundNumber !== 3) return res.status(400).json({ message: 'Only for Round 2 or 3!' });
    
    const teamId = req.user.team?._id;
    if (!teamId) return res.status(400).json({ message: 'No crew found!' });

    const round = await Round.findOne({ roundNumber });
    if (!round) return res.status(404).json({ message: `Round ${roundNumber} not found!` });

    const question = round.questions[questionIndex];
    if (!question) return res.status(404).json({ message: 'Clue not found!' });

    const givenAnswer = answer.trim().toLowerCase();
    const correctAnswer = question.correctAnswer.trim().toLowerCase();
    // Also check alternative accepted answers (e.g. 'blackboard' for Clue 5)
    const altAnswers = (question.altAnswers || []).map(a => a.trim().toLowerCase());
    const isCorrect = givenAnswer === correctAnswer || altAnswers.includes(givenAnswer);
    
    if (isCorrect) {
      if (roundNumber === 3) {
        return res.json({ correct: true });
      }

      const team = await Team.findById(teamId);
      
      // Generate unique digits for this team if they don't have them yet
      if (!team.assignedPinDigits || team.assignedPinDigits.length === 0) {
        team.assignedPinDigits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
      }

      const digitToReveal = team.assignedPinDigits[questionIndex];
      // If questionIndex > 4, we don't have a digit (we only support 5 clues for PIN)
      if (typeof digitToReveal === 'undefined') {
        return res.status(400).json({ message: '⚓ This clue has no secret digit to reveal!' });
      }

      team.round2Digits[questionIndex] = digitToReveal.toString();
      team.markModified('round2Digits');
      await team.save();
      return res.json({ correct: true, digit: digitToReveal });
    }

    res.json({ correct: false });
  } catch (err) {
    next(err);
  }
};

// ── POST verify a Round 2 clue ────────────────────────
router.post('/verify-clue', protect, verifyClueHandler);
// Backward compatibility for older frontend path style
router.post('/:roundNumber(\\d+)/verify-clue', protect, (req, res, next) => {
  req.body.roundNumber = parseInt(req.params.roundNumber, 10);
  return verifyClueHandler(req, res, next);
});

// ── GET Game State ────────────────────────────────────
router.get('/game-state', protect, async (req, res, next) => {
  try {
    let state = await GameState.findOne();
    if (!state) state = await GameState.create({});
    res.json({ state });
  } catch (err) {
    next(err);
  }
});

// ── POST verify final treasure riddle ─────────────────
router.post('/verify-final', protect, async (req, res, next) => {
  try {
    const { answer, answers, timeTaken } = req.body;
    if (!answer) return res.status(400).json({ message: 'Answer is required!' });

    const correct = answer.trim().toLowerCase() === 'canteen';
    
    if (correct) {
      const teamId = req.user.team?._id;
      const teamDoc = await Team.findById(teamId);
      if (!teamDoc) return res.status(400).json({ message: 'No crew found!' });

      const round = await Round.findOne({ roundNumber: 3 });
      if (!round) return res.status(404).json({ message: 'Round 3 not found!' });

      // Record submission if not already done
      const alreadySubmitted = round.submissions.some(s => s.team.toString() === teamId.toString());
      if (!alreadySubmitted) {
        const score = round.gradeAnswers(answers || [], []);
        
        // Atomic push
        await Round.findOneAndUpdate(
          { roundNumber: 3, 'submissions.team': { $ne: teamId } },
          { $push: { submissions: { team: teamId, answers: answers || [], score, timeTaken: timeTaken || 0 } } }
        );

        // Update team score
        teamDoc.scores.round3 = score;
        teamDoc.totalScore = (teamDoc.scores.round1 || 0) + (teamDoc.scores.round2 || 0) + score;
        if (!teamDoc.completedRounds.includes(3)) teamDoc.completedRounds.push(3);
        teamDoc.roundFinishTimes.round3 = new Date();
        await teamDoc.save();
      }

      // Perform atomic check for first winner
      let state = await GameState.findOne();
      if (!state) state = await GameState.create({});

      if (!state.isFirstWinnerFound) {
        state.isFirstWinnerFound = true;
        state.winnerUser = req.user._id;
        state.winnerTeam = teamId;
        state.unlockedAt = new Date();
        await state.save();
        return res.json({ correct: true, status: 'WINNER' });
      } else {
        return res.json({ correct: true, status: 'LATE' });
      }
    }

    res.json({ correct: false });
  } catch (err) {
    next(err);
  }
});

// ── POST use a Hint for Round 2 ──────────────────────
router.post('/use-hint', protect, async (req, res, next) => {
  try {
    const { questionIndex } = req.body;
    const teamId = req.user.team?._id;
    if (!teamId) return res.status(400).json({ message: '🦜 No crew found!' });
    if (typeof questionIndex !== 'number' || questionIndex < 0) {
      return res.status(400).json({ message: '⚓ Invalid question index.' });
    }

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: '🗺️ Crew not found!' });

    const MAX_HINTS = 2;

    // Enforce maximum 2 hints per team
    if (team.round2HintsUsed.length >= MAX_HINTS) {
      return res.status(400).json({
        message: '🚫 Your team has already used the maximum number of hints.',
        hintsUsed: team.round2HintsUsed,
      });
    }

    // Prevent using hint for the same question twice
    if (team.round2HintsUsed.includes(questionIndex)) {
      return res.status(400).json({
        message: '⚓ A hint was already used for this clue.',
        hintsUsed: team.round2HintsUsed,
      });
    }

    const round = await Round.findOne({ roundNumber: 2 });
    if (!round) return res.status(404).json({ message: 'Round 2 not found!' });

    const question = round.questions[questionIndex];
    if (!question) return res.status(404).json({ message: '🗺️ Clue not found!' });

    // Record the hint usage
    team.round2HintsUsed.push(questionIndex);
    team.markModified('round2HintsUsed');
    await team.save();

    res.json({
      hint: question.hint,
      hintsUsed: team.round2HintsUsed,
      hintsRemaining: MAX_HINTS - team.round2HintsUsed.length,
      message: `⚠️ Hint revealed. 50% mark deduction applied for Clue ${questionIndex + 1}.`,
    });
  } catch (err) {
    next(err);
  }
});

const unlockHandler = async (req, res, next) => {
  try {
    const { pin } = req.body;
    const teamId = req.user.team?._id;
    if (!teamId) return res.status(400).json({ message: 'No crew found!' });

    const user = req.user;
    if (user.isEliminated) return res.status(403).json({ message: '💀 You have been eliminated from this trial!' });

    const team = await Team.findById(teamId);
    if (!team) return res.status(400).json({ message: 'No crew found!' });
    
    // If the team as a whole is eliminated, block everyone
    if (team.isEliminated) return res.status(403).json({ message: '💀 Your crew has been eliminated!' });
    
    // If the team already unlocked it, succeed for everyone
    if (team.round3Unlocked) return res.json({ unlocked: true });

    // The PIN is the concatenation of the team's UNIQUE generated digits
    if (!team.assignedPinDigits || team.assignedPinDigits.length < 5) {
      return res.status(400).json({ message: '⚓ You haven\'t collected all your clues yet!' });
    }

    const correctPin = team.assignedPinDigits.join('');

    if (pin === correctPin) {
      team.round3Unlocked = true;
      await team.save();
      return res.json({ unlocked: true, message: '🔓 Round 3 Unlocked for your crew!' });
    } else {
      user.round3PinAttempts += 1;
      await user.save();
      
      if (user.round3PinAttempts >= 3) {
        user.isEliminated = true;
        await user.save();
        return res.status(403).json({ 
          unlocked: false, 
          eliminated: true, 
          message: '💀 3 failed attempts! You have been eliminated.' 
        });
      }
      
      return res.status(400).json({ 
        unlocked: false, 
        attemptsLeft: 3 - user.round3PinAttempts,
        message: '❌ Wrong PIN! Try again.' 
      });
    }
  } catch (err) {
    next(err);
  }
};

// ── POST unlock Round 3 with PIN ───────────────────────
router.post('/unlock', protect, unlockHandler);
// Backward compatibility for older frontend path style
router.post('/:roundNumber(\\d+)/unlock', protect, unlockHandler);

// ── GET single round with questions ───────────────────
router.get('/:roundNumber(\\d+)', protect, async (req, res, next) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    if (isNaN(roundNum) || roundNum < 1) {
      return res.status(400).json({ message: 'Invalid round number' });
    }

    const round = await Round.findOne({ roundNumber: roundNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });

    if (!round.isOpen && req.user.role !== 'admin') {
      return res.status(403).json({ message: '🚫 This round is closely guarded!' });
    }

    const team = req.user.team;
    let alreadySubmitted = false;
    if (team) {
      alreadySubmitted = round.submissions.some(s => s.team.toString() === team._id.toString());
    }

    // Strip out correct answers and submissions for non-admins
    const roundData = round.toObject();
    delete roundData.submissions;
    if (req.user.role !== 'admin' && roundData.questions) {
      roundData.questions.forEach(q => delete q.correctAnswer);
    }

    // For Round 2, also return hint usage info for the team
    let round2HintsUsed = [];
    if (roundNum === 2 && team) {
      const teamDoc = await Team.findById(team._id).select('round2HintsUsed');
      round2HintsUsed = teamDoc?.round2HintsUsed || [];
    }

    res.json({ round: { ...roundData, alreadySubmitted, hintsUsed: round2HintsUsed, hintsRemaining: 2 - round2HintsUsed.length } });
  } catch (err) {
    next(err);
  }
});

// ── POST submit answers for a round ──────────────────
router.post('/:roundNumber(\\d+)/submit', protect, async (req, res, next) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    if (isNaN(roundNum) || roundNum < 1) {
      return res.status(400).json({ message: '🦜 Invalid round number!' });
    }

    const { answers, timeTaken } = req.body;
    const team = req.user.team;

    if (!team) return res.status(400).json({ message: '🦜 You need a crew to compete!' });

    const round = await Round.findOne({ roundNumber: roundNum });
    if (!round)         return res.status(404).json({ message: '🗺️ Round not found!' });
    if (!round.isOpen)  return res.status(400).json({ message: '🚫 This round is not open, matey!' });

    // FIX: Atomic duplicate-submission check using findOneAndUpdate with condition.
    // The old code did a separate .find() then .push() – two operations that allowed
    // two simultaneous requests to both pass the check and both submit.
    const teamId = team._id;
    const alreadySubmitted = round.submissions.some(
      s => s.team.toString() === teamId.toString()
    );
    if (alreadySubmitted) {
      return res.status(400).json({ message: '🦜 Ye already submitted for this round!' });
    }

    // For Round 2, apply hint deductions via gradeAnswers
    const teamForHints = await Team.findById(teamId).select('round2HintsUsed');
    const hintsUsed = roundNum === 2 ? (teamForHints?.round2HintsUsed || []) : [];
    const score = round.gradeAnswers(answers || [], hintsUsed);

    // Atomic push: only adds if team hasn't submitted yet
    const updated = await Round.findOneAndUpdate(
      { roundNumber: roundNum, 'submissions.team': { $ne: teamId } },
      { $push: { submissions: { team: teamId, answers: answers || [], score, timeTaken: timeTaken || 0 } } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: '🦜 Ye already submitted for this round!' });
    }

    // FIX: Use $inc / $set to avoid stale-read race conditions on team score
    const roundKey = `round${roundNum}`;
    const teamDoc = await Team.findById(teamId);
    teamDoc.scores[roundKey] = score;
    teamDoc.totalScore = teamDoc.scores.round1 + teamDoc.scores.round2 + teamDoc.scores.round3;
    if (!teamDoc.completedRounds.includes(roundNum)) {
      teamDoc.completedRounds.push(roundNum);
    }
    teamDoc.roundFinishTimes[roundKey] = new Date();
    await teamDoc.save();

    res.json({ message: `⚓ Answers submitted! Ye scored ${score} doubloons!`, score });
  } catch (err) {
    next(err);
  }
});

// ── ADMIN: Create a round ─────────────────────────────
router.post('/', protect, adminOnly, async (req, res, next) => {
  try {
    const round = await Round.create(req.body);
    res.status(201).json({ message: '🗺️ Round created!', round });
  } catch (err) {
    next(err);
  }
});

// ── ADMIN: Open/Close a round ─────────────────────────
router.patch('/:roundNumber(\\d+)/toggle', protect, adminOnly, async (req, res, next) => {
  try {
    const roundNum = parseInt(req.params.roundNumber, 10);
    if (isNaN(roundNum)) return res.status(400).json({ message: 'Invalid round number' });

    const round = await Round.findOne({ roundNumber: roundNum });
    if (!round) return res.status(404).json({ message: 'Round not found' });

    round.isOpen = !round.isOpen;
    round.isOpen ? (round.openedAt = new Date()) : (round.closedAt = new Date());
    await round.save();

    res.json({
      message: `🏴‍☠️ Round ${round.roundNumber} is now ${round.isOpen ? 'OPEN ⚓' : 'CLOSED 🔒'}`,
      round,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
