const express     = require('express');
const router      = express.Router();
const { protect } = require('../middleware/auth');
const Team        = require('../models/Team');

router.get('/', protect, async (req, res, next) => {
  try {
    const teams = await Team.find({ isEliminated: false })
      .populate('members', 'username pirateName participationType')
      .sort({ totalScore: -1, 'roundFinishTimes.round3': 1 })
      .select('name shipName members totalScore scores completedRounds roundFinishTimes isSolo')
      .lean();

    const ranked = teams.map((team, index) => ({
      rank: index + 1,
      ...team,
      displayName: team.isSolo
        ? (team.members[0]?.pirateName || team.members[0]?.username || team.name)
        : team.name,
      type: team.isSolo ? 'solo' : 'team',
    }));

    res.json({ leaderboard: ranked });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
