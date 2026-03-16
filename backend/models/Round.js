// ═══════════════════════════════════════════════════════
//  models/Round.js  –  The Treasure Map 🗺️
//
//  Stores the questions/challenges for each round.
//  Admin can toggle rounds open/closed.
//  Submissions per team are stored here too.
// ═══════════════════════════════════════════════════════

const mongoose = require('mongoose');

// ── SUB-SCHEMA: A single question ────────────────────────
const QuestionSchema = new mongoose.Schema({
  text:         { type: String, required: true },
  type:         { type: String, enum: ['mcq', 'text', 'code'], default: 'text' },
  options:      [String],           // for MCQ: ['FTP','HTTP','SMTP','TCP']
  correctAnswer: { type: String, required: true },
  altAnswers:   [String],           // alternate accepted answers
  points:       { type: Number, default: 10 },
  hint:         { type: String, default: '' },  // optional hint
  unlockDigit:  { type: Number, min: 0, max: 9 }, // for Round 2
  order:        { type: Number, default: 0 },   // display order
});

// ── SUB-SCHEMA: A team's answer submission ───────────────
const SubmissionSchema = new mongoose.Schema({
  team:      { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  answers:   [String],   // array of answers matching question order
  score:     { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  timeTaken: { type: Number, default: 0 },  // seconds taken
});

// ── MAIN ROUND SCHEMA ────────────────────────────────────
const RoundSchema = new mongoose.Schema(
  {
    roundNumber: {
      type:    Number,
      required: true,
      unique:   true,   // only one doc per round number
    },

    title: { type: String, required: true },

    description: { type: String, default: '' },

    // Duration in minutes (shown as countdown timer on frontend)
    durationMinutes: { type: Number, default: 15 },

    // Admin controls whether this round is currently accepting submissions
    isOpen: { type: Boolean, default: false },

    // When admin opened/closed the round
    openedAt:  { type: Date, default: null },
    closedAt:  { type: Date, default: null },

    questions: [QuestionSchema],

    submissions: [SubmissionSchema],
  },
  { timestamps: true }
);

// ── METHOD: grade a submission ───────────────────────────
// Takes an array of answers and an optional hintsUsed array of question indices.
// Returns the earned score, applying 50% deduction for hint-assisted correct answers.
RoundSchema.methods.gradeAnswers = function (answers, hintsUsed = []) {
  let score = 0;
  this.questions.forEach((q, i) => {
    const given   = (answers[i] || '').toString().trim().toLowerCase();
    const correct = q.correctAnswer.toString().trim().toLowerCase();
    if (given === correct) {
      const pts = q.points;
      // 50% deduction if a hint was used for this question
      score += hintsUsed.includes(i) ? Math.floor(pts * 0.5) : pts;
    }
  });
  return score;
};

module.exports = mongoose.model('Round', RoundSchema);
