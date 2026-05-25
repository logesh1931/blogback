const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User   = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const sign = (user) =>
  jwt.sign({ id: user._id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

  try {
    const exists = await User.findOne({ email: req.body.email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create(req.body);
    res.status(201).json({ token: sign(user), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await user.comparePassword(req.body.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // toJSON removes password
    res.json({ token: sign(user), user: user.toJSON() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...(name && { name }), ...(bio !== undefined && { bio }) },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
