const mongoose = require('mongoose');

const GameStateSchema = new mongoose.Schema({
  // Singleton pattern – we only ever want one document in this collection
  isFirstWinnerFound: { type: Boolean, default: false },
  winnerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  winnerTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  unlockedAt: { type: Date, default: null },
});

module.exports = mongoose.model('GameState', GameStateSchema);
