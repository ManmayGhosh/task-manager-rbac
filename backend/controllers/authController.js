const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc Register a new user
// @route POST /api/auth/register
// NOTE: role defaults to 'member'. Only an existing admin can promote users
// (see userController.updateUserRole) — self-registration as admin is not allowed.
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // First-ever registered user becomes admin automatically (bootstrap convenience).
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'member';

    const user = await User.create({ name, email, password, role });

    return res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// @desc Login
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// @desc Get current logged-in user
// @route GET /api/auth/me
const getMe = async (req, res) => {
  return res.json({ user: req.user });
};

module.exports = { register, login, getMe };
