const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team');
const { sendRegistrationEmail } = require('../utils/email');

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── REGISTER ─────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, pirateName, participationType, teamName, joinCode } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: '🦜 Username, email and password are required!' });
    if (password.length < 6)
      return res.status(400).json({ message: '🦜 Password must be at least 6 characters!' });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser)
      return res.status(400).json({ message: '🦜 That email is already claimed, pirate!' });

    const pType = participationType === 'team' ? 'team' : 'solo';

    // ── FIX: Validate EVERYTHING before creating the user ──
    // This prevents orphaned user records when join code is wrong.
    let teamDoc = null;

    if (pType === 'solo') {
      // Solo — no pre-validation needed, team created after user

    } else if (pType === 'team') {
      const action = req.body.teamAction; // 'create' | 'join'

      if (action === 'create') {
        if (!teamName || !teamName.trim())
          return res.status(400).json({ message: '🦜 Team name is required to create a crew!' });

        const existingTeam = await Team.findOne({ name: teamName.trim() });
        if (existingTeam)
          return res.status(400).json({ message: '🦜 A crew with that name already exists!' });

      } else if (action === 'join') {
        if (!joinCode || !joinCode.trim())
          return res.status(400).json({ message: '🦜 Join code is required!' });

        // ── Validate join code BEFORE creating user ──
        teamDoc = await Team.findOne({ joinCode: joinCode.toUpperCase().trim() });
        if (!teamDoc)
          return res.status(404).json({ message: '🗺️ No crew found with that code! Check it and try again.' });
        if (teamDoc.isSolo)
          return res.status(400).json({ message: '🚫 Cannot join a solo participant!' });
        if (teamDoc.members.length >= teamDoc.maxMembers)
          return res.status(400).json({ message: '🚢 That ship is full!' });
      }
    }

    // ── All validations passed — now create the user ──
    const user = await User.create({ username, email, password, pirateName, participationType: pType });

    if (pType === 'solo') {
      const soloName = `[Solo] ${pirateName || username}`;
      const soloTeam = await Team.create({ name: soloName, members: [user._id], maxMembers: 1, isSolo: true });
      user.team = soloTeam._id;
      await user.save();
      teamDoc = soloTeam;

    } else if (pType === 'team') {
      const action = req.body.teamAction;

      if (action === 'create') {
        const newTeam = await Team.create({ name: teamName.trim(), members: [user._id], isSolo: false });
        user.team = newTeam._id;
        await user.save();
        teamDoc = newTeam;

      } else if (action === 'join') {
        // teamDoc already fetched and validated above
        teamDoc.members.push(user._id);
        await teamDoc.save();
        user.team = teamDoc._id;
        await user.save();

      } else {
        // Fallback: no action selected → create solo team
        const soloName = `[Solo] ${pirateName || username}`;
        const soloTeam = await Team.create({ name: soloName, members: [user._id], maxMembers: 1, isSolo: true });
        user.team = soloTeam._id;
        await user.save();
        teamDoc = soloTeam;
      }
    }

    res.status(201).json({
      message: '🏴‍☠️ Welcome aboard, pirate!',
      token: generateToken(user),
      user: {
        id:                user._id,
        username:          user.username,
        email:             user.email,
        pirateName:        user.pirateName,
        role:              user.role,
        team:              user.team,
        participationType: user.participationType,
        isEliminated:      user.isEliminated,
        round3PinAttempts: user.round3PinAttempts,
      },
    });

    setImmediate(async () => {
      try {
        await sendRegistrationEmail({
          to:         user.email,
          username:   user.username,
          pirateName: user.pirateName,
          teamName:   teamDoc?.name || null,
          joinCode:   teamDoc?.joinCode || null,
        });
      } catch (emailErr) {
        console.error('⚠️ Email send failed:', emailErr.message);
      }
    });

  } catch (err) {
    next(err);
  }
};

// ── LOGIN ─────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: '🦜 Email and password are required!' });

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password').populate('team');

    if (!user)
      return res.status(401).json({ message: '🏴‍☠️ No pirate found with that email!' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: '🦜 Wrong password, scallywag!' });

    res.json({
      message: `⚓ Welcome back, ${user.pirateName || user.username}!`,
      token: generateToken(user),
      user: {
        id:                user._id,
        username:          user.username,
        email:             user.email,
        pirateName:        user.pirateName,
        role:              user.role,
        team:              user.team,
        participationType: user.participationType,
        isEliminated:      user.isEliminated,
        round3PinAttempts: user.round3PinAttempts,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET PROFILE ───────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('team');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};
