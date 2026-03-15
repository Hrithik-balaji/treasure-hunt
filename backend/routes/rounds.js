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

// ── POST verify a Round 2 clue ────────────────────────
router.post('/verify-clue', protect, async (req, res, next) => {
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

// ── POST unlock Round 3 with PIN ───────────────────────
router.post('/unlock', protect, async (req, res, next) => {
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
});

// ── GET single round with questions ───────────────────
router.get('/:roundNumber', protect, async (req, res, next) => {
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
router.post('/:roundNumber/submit', protect, async (req, res, next) => {
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
router.patch('/:roundNumber/toggle', protect, adminOnly, async (req, res, next) => {
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

// ── Default round data ────────────────────────────────
const defaultRounds = [
  // ── ROUND 1: Technical Quiz (from brochure + extras) ──────────────────
  {
    roundNumber: 1,
    title: 'Technical Quiz',
    description: 'A 15-minute written screening round testing Python, networking, data structures, and logical thinking.',
    durationMinutes: 15,
    questions: [
      // ── From brochure ──
      {
        text: 'What is the output of: print(2**3)?',
        type: 'text',
        correctAnswer: '8',
        points: 10,
        hint: 'The ** operator means "to the power of".',
        order: 1,
      },
      {
        text: 'Which protocol is used to transfer web pages?',
        type: 'mcq',
        options: ['FTP', 'HTTP', 'SMTP', 'TCP'],
        correctAnswer: 'HTTP',
        points: 10,
        hint: 'You see it at the start of every URL.',
        order: 2,
      },
      {
        text: 'Convert binary 1010 to decimal.',
        type: 'text',
        correctAnswer: '10',
        points: 10,
        hint: 'Each bit is a power of 2: 8+0+2+0.',
        order: 3,
      },
      {
        text: 'What does CPU stand for?',
        type: 'text',
        correctAnswer: 'Central Processing Unit',
        points: 10,
        hint: 'The "brain" of the computer.',
        order: 4,
      },
      {
        text: 'What is the file extension of a Python source file?',
        type: 'mcq',
        options: ['.pt', '.py', '.pyt', '.pyn'],
        correctAnswer: '.py',
        points: 10,
        order: 5,
      },
      {
        text: 'Which data structure operates on the FIFO (First In, First Out) principle?',
        type: 'mcq',
        options: ['Stack', 'Queue', 'Tree', 'Heap'],
        correctAnswer: 'Queue',
        points: 10,
        hint: 'Think of a ticket line — first person in, first person out.',
        order: 6,
      },
      {
        text: 'What is the output of: print(len("TECH"))?',
        type: 'text',
        correctAnswer: '4',
        points: 10,
        hint: 'len() counts characters.',
        order: 7,
      },
      {
        text: 'What symbol is used to write a single-line comment in Python?',
        type: 'mcq',
        options: ['//', '/*', '#', '--'],
        correctAnswer: '#',
        points: 10,
        order: 8,
      },
      {
        text: 'What does HTML stand for?',
        type: 'text',
        correctAnswer: 'HyperText Markup Language',
        points: 10,
        hint: 'It\'s the standard language for building web pages.',
        order: 9,
      },
      {
        text: 'Identify the syntax error in: for i in range(5) print(i)',
        type: 'mcq',
        options: ['Wrong function name', 'Missing colon after range(5)', 'print needs brackets', 'No error'],
        correctAnswer: 'Missing colon after range(5)',
        points: 10,
        hint: 'All Python block statements end with a colon.',
        order: 10,
      },
      // ── Bonus questions ──
      {
        text: 'What is the output of: print(type(3.14))?',
        type: 'mcq',
        options: ['<class \'int\'>', '<class \'float\'>', '<class \'str\'>', '<class \'double\'>'],
        correctAnswer: '<class \'float\'>',
        points: 10,
        order: 11,
      },
      {
        text: 'Which keyword is used to define a function in Python?',
        type: 'mcq',
        options: ['func', 'define', 'def', 'function'],
        correctAnswer: 'def',
        points: 10,
        order: 12,
      },
      {
        text: 'What is the value of: 7 % 3?',
        type: 'text',
        correctAnswer: '1',
        points: 10,
        hint: '% is the modulo (remainder) operator.',
        order: 13,
      },
      {
        text: 'Which of these is a mutable data type in Python?',
        type: 'mcq',
        options: ['tuple', 'string', 'list', 'int'],
        correctAnswer: 'list',
        points: 10,
        hint: 'Mutable means you can change it after creation.',
        order: 14,
      },
      {
        text: 'What does RAM stand for?',
        type: 'text',
        correctAnswer: 'Random Access Memory',
        points: 10,
        order: 15,
      },
    ],
  },

  // ── ROUND 2: Clue Hunt 🔎 ─────────────────────────────────
  {
    roundNumber: 2,
    title: 'Technical Clue Hunt',
    description: 'Solve each riddle to find the next hidden location. Each correct answer reveals a secret digit for the master lock.',
    durationMinutes: 20,
    questions: [
      {
        text: '🔎 Clue 1 – Stationery\n\nI help ideas move from mind to page,\nStudents seek me at every stage.\nPens and papers rest with care,\nYour next clue patiently waits there.\n\nWhat am I?',
        type: 'text',
        correctAnswer: 'Stationery',
        points: 25,
        unlockDigit: 1,
        hint: 'Look where pens, papers, and notebooks are sold or stored.',
        order: 1,
      },
      {
        text: '🔎 Clue 2 – Corridor\n\nI am not a room yet I connect them all,\nFootsteps echo along my wall.\nStudents pass me every hour,\nBetween classes I hold great power.\n\nWhat am I?',
        type: 'text',
        correctAnswer: 'Corridor',
        points: 25,
        unlockDigit: 2,
        hint: 'Think of the pathway between classrooms.',
        order: 2,
      },
      {
        text: '🔎 Clue 3 – Computer Lab\n\nRows of machines silently wait,\nLogic and code decide their fate.\nStudents type commands all day.\n\nWhere am I?',
        type: 'text',
        correctAnswer: 'Computer Lab',
        points: 25,
        unlockDigit: 3,
        hint: 'Find the room where programming happens.',
        order: 3,
      },
      {
        text: '🔎 Clue 4 – Keyboard\n\nI have many keys but open no door,\nLetters and numbers I help explore.\nFind the one where fingers dance,\nYour next clue hides beneath my stance.\n\nWhat am I?',
        type: 'text',
        correctAnswer: 'Keyboard',
        points: 25,
        unlockDigit: 4,
        hint: 'Think of the device used to type.',
        order: 4,
      },
      {
        text: '🔎 Clue 5 – Classroom Board\n\nTeachers write and students stare,\nEquations and notes appear there.\nErase me once, I\'m blank again.\n\nWhat am I?',
        type: 'text',
        correctAnswer: 'Whiteboard',
        altAnswers: ['Blackboard'],
        points: 25,
        unlockDigit: 5,
        hint: 'Where teachers explain lessons. Also accepted: Blackboard.',
        order: 5,
      },
    ],
  },

  // ── ROUND 3: Master Challenge 🏆 ─────────────────────────────────
  {
    roundNumber: 3,
    title: 'Master Challenge',
    description: 'The final trial. Solve the logic puzzle to discover the treasure.',
    durationMinutes: 30,
    questions: [
      {
        text: '🏆 Challenge – Coding Logic Puzzle\n\nConsider the following Python code:\n\nletters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"\nnums = [19, 20, 21, 4, 5, 14, 20, 19]\nfor n in nums:\n    print(letters[n-1], end="")\n\nWhat will be the output of the above code?',
        type: 'text',
        correctAnswer: 'STUDENTS',
        points: 100,
        hint: 'A-1, B-2, C-3...',
        order: 1,
      },
    ],
  },
];

module.exports = router;
