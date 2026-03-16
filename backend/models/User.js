const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: [true, 'Username is required'], unique: true, trim: true, minlength: 3, maxlength: 30 },
    email:    { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    role:     { type: String, enum: ['player', 'admin'], default: 'player' },
    team:     { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    pirateName: { type: String, default: '' },

    // NEW: track if user competes solo or as part of a crew
    participationType: {
      type:    String,
      enum:    ['solo', 'team'],
      default: 'solo',
    },

    isVerified: { type: Boolean, default: true },
    
    // NEW FOR ROUND 3: Isolated PIN attempt tracking per user
    round3PinAttempts: { type: Number, default: 0 },
    isEliminated:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
