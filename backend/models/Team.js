const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema(
  {
    name:     { type: String, required: [true, 'Team name is required'], unique: true, trim: true, maxlength: 50 },
    shipName: { type: String, default: '' },
    members:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxMembers: { type: Number, default: 4 },

    // NEW: solo teams are auto-created for individual players
    isSolo: { type: Boolean, default: false },

    scores: {
      round1: { type: Number, default: 0 },
      round2: { type: Number, default: 0 },
      round3: { type: Number, default: 0 },
    },
    totalScore:      { type: Number,   default: 0 },
    completedRounds: { type: [Number], default: [] },
    roundFinishTimes: {
      round1: { type: Date, default: null },
      round2: { type: Date, default: null },
      round3: { type: Date, default: null },
    },
    joinCode:     { type: String, unique: true },
    isEliminated: { type: Boolean, default: false },

    // Clue Chain fields
    round2Digits: { type: [String], default: ["?", "?", "?", "?", "?"] },
    assignedPinDigits: { type: [Number], default: [] }, // NEW: unique digits for this team
    round3PinAttempts: { type: Number, default: 0 },
    round3Unlocked: { type: Boolean, default: false },

    // Hint System – Round 2
    // Stores question indices where a hint was used (e.g. [0, 2] means Q1 and Q3)
    round2HintsUsed: { type: [Number], default: [] },
  },
  { timestamps: true }
);

TeamSchema.pre('save', function (next) {
  try {
    // Recalculate total score
    if (this.scores) {
      this.totalScore = (this.scores.round1 || 0) + (this.scores.round2 || 0) + (this.scores.round3 || 0);
    }

    if (!this.joinCode) {
      this.joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
  } catch (err) {
    console.error('💀 Team pre-save hook error:', err);
    next(err);
  }
});

TeamSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

module.exports = mongoose.model('Team', TeamSchema);
