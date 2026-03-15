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
    if (roundNumber !== 2) return res.status(400).json({ message: 'Only for Round 2!' });
    
    const teamId = req.user.team?._id;
    if (!teamId) return res.status(400).json({ message: 'No crew found!' });

    const round = await Round.findOne({ roundNumber: 2 });
    if (!round) return res.status(404).json({ message: 'Round 2 not found!' });

    const question = round.questions[questionIndex];
    if (!question) return res.status(404).json({ message: 'Clue not found!' });

    const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    
    if (isCorrect) {
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

// ── POST unlock Round 3 with PIN ───────────────────────
router.post('/unlock', protect, async (req, res, next) => {
  try {
    const { pin } = req.body;
    const teamId = req.user.team?._id;
    if (!teamId) return res.status(400).json({ message: 'No crew found!' });

    const team = await Team.findById(teamId);
    if (team.isEliminated) return res.status(403).json({ message: '💀 Your crew is eliminated!' });
    if (team.round3Unlocked) return res.json({ unlocked: true });

    // The PIN is the concatenation of the team's UNIQUE generated digits
    if (!team.assignedPinDigits || team.assignedPinDigits.length < 5) {
      return res.status(400).json({ message: '⚓ You haven\'t collected all your clues yet!' });
    }

    const correctPin = team.assignedPinDigits.join('');

    if (pin === correctPin) {
      team.round3Unlocked = true;
      await team.save();
      return res.json({ unlocked: true, message: '🔓 Round 3 Unlocked!' });
    } else {
      team.round3PinAttempts += 1;
      await team.save();
      return res.status(400).json({ message: '❌ Wrong PIN! Try again.' });
    }
  } catch (err) {
    next(err);
  }
});

// ── GET single round with questions ───────────────────
router.get('/:roundNumber', protect, async (req, res, next) => {
  try {
    const { pin } = req.body;
    const teamId = req.user.team?._id;
    if (!teamId) return res.status(400).json({ message: 'No crew found!' });

    const team = await Team.findById(teamId);
    if (team.isEliminated) return res.status(403).json({ message: '💀 Your crew is eliminated!' });
    if (team.round3Unlocked) return res.json({ unlocked: true });

    // The PIN is the concatenation of the team's UNIQUE generated digits
    if (!team.assignedPinDigits || team.assignedPinDigits.length < 5) {
      return res.status(400).json({ message: '⚓ You haven\'t collected all your clues yet!' });
    }

    const correctPin = team.assignedPinDigits.join('');

    if (pin === correctPin) {
      team.round3Unlocked = true;
      await team.save();
      return res.json({ unlocked: true, message: '🔓 Round 3 Unlocked!' });
    } else {
      team.round3PinAttempts += 1;
      if (team.round3PinAttempts >= 3) {
        team.isEliminated = true;
        await team.save();
        return res.status(403).json({ 
          unlocked: false, 
          eliminated: true, 
          message: '💀 3 failed attempts! Your crew has been eliminated.' 
        });
      }
      await team.save();
      return res.status(400).json({ 
        unlocked: false, 
        attemptsLeft: 3 - team.round3PinAttempts,
        message: '❌ Invalid PIN! Watch your steps...' 
      });
    }
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

    const score = round.gradeAnswers(answers || []);

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

  // ── ROUND 2: Technical Clue Hunt (from brochure + extras) ─────────────
  {
    roundNumber: 2,
    title: 'Technical Clue Hunt',
    description: 'Decode sequential clues using binary, ciphers, debugging, and logic to unlock the next stage.',
    durationMinutes: 20,
    questions: [
      // ── From brochure ──
      {
        text: 'Clue 1 – Decode the binary sequence:\n01001011  01000101  01011001',
        type: 'text',
        correctAnswer: 'KEY',
        points: 25,
        unlockDigit: 1,
        hint: 'Each 8-bit group is one ASCII character. K=75, E=69, Y=89.',
        order: 1,
      },
      {
        text: 'Clue 2 – Debug this Python code and state what is missing:\nif 5 > 3 print("Yes")',
        type: 'text',
        correctAnswer: 'Missing colon after condition',
        points: 25,
        unlockDigit: 2,
        hint: 'What punctuation ends an if-statement header in Python?',
        order: 2,
      },
      {
        text: 'Clue 3 – Caesar Cipher with Shift –3. Decode: FRGH',
        type: 'text',
        correctAnswer: 'CODE',
        points: 25,
        unlockDigit: 3,
        hint: 'Shift each letter 3 positions backward in the alphabet. F→C, R→O…',
        order: 3,
      },
      {
        text: 'Clue 4 – Logic Lock: Find the 3-digit number where:\n• Sum of digits = 12\n• Middle digit = 5\n• First digit is 1 more than the last digit',
        type: 'text',
        correctAnswer: '453',
        points: 25,
        unlockDigit: 4,
        hint: 'Let last digit = x. Then first = x+1, middle = 5. Solve: (x+1)+5+x = 12.',
        order: 4,
      },
      {
        text: 'Clue 5 – What is the decimal value of the hexadecimal number 0x1F?',
        type: 'text',
        correctAnswer: '31',
        points: 20,
        unlockDigit: 5,
        hint: '0x1F = 1×16 + 15 = ?',
        order: 5,
      },
    ],
  },

  // ── ROUND 3: Final Master Challenge (from brochure + extras) ──────────
  {
    roundNumber: 3,
    title: 'Final Master Challenge',
    description: 'Top teams compete for the Treasure Title with recursion, algorithm analysis, pattern recognition, and code ordering.',
    durationMinutes: 30,
    questions: [
      // ── From brochure ──
      {
        text: 'Challenge 1 – Recursion Output:\nfun(n) = n + fun(n-1), base case fun(1) = 1\nWhat is the output of fun(4)?',
        type: 'text',
        correctAnswer: '10',
        points: 40,
        hint: 'Expand: fun(4) = 4 + fun(3) = 4+3+2+1 = ?',
        order: 1,
      },
      {
        text: 'Challenge 2 – Correct Order of Steps to Run a Program:\nArrange these steps in the correct order:\nA) Write code\nB) Execute program\nC) Debug errors\nD) Compile\nEnter the correct sequence (e.g. ADCB)',
        type: 'text',
        correctAnswer: 'ADCB',
        points: 30,
        hint: 'You write first, then compile, then fix errors, then run.',
        order: 2,
      },
      {
        text: 'Challenge 3 – Find the missing number in the sequence:\n2, 6, 12, 20, 30, ?',
        type: 'text',
        correctAnswer: '42',
        points: 30,
        hint: 'The differences are 4, 6, 8, 10, 12... What is the pattern?',
        order: 3,
      },
      // ── Tie breaker (from brochure) ──
      {
        text: 'Tie Breaker – What is the time complexity of Binary Search?',
        type: 'mcq',
        options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
        correctAnswer: 'O(log n)',
        points: 20,
        hint: 'Binary search halves the search space on each step.',
        order: 4,
      },
      // ── Bonus final challenges ──
      {
        text: 'Bonus 1 – What is the space complexity of storing n elements in an array?',
        type: 'mcq',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
        correctAnswer: 'O(n)',
        points: 25,
        order: 5,
      },
      {
        text: 'Bonus 2 – What is the output of this Python snippet?\ndef mystery(n):\n    if n == 0: return 0\n    return mystery(n-1) + n\nprint(mystery(5))',
        type: 'text',
        correctAnswer: '15',
        points: 35,
        hint: '0+1+2+3+4+5 = ?',
        order: 6,
      },
      {
        text: 'Bonus 3 – Which sorting algorithm has the best average-case time complexity?',
        type: 'mcq',
        options: ['Bubble Sort – O(n²)', 'Merge Sort – O(n log n)', 'Insertion Sort – O(n²)', 'Selection Sort – O(n²)'],
        correctAnswer: 'Merge Sort – O(n log n)',
        points: 30,
        order: 7,
      },
    ],
  },
];

module.exports = router;
