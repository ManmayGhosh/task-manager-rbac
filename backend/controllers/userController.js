const User = require('../models/User');

// @desc Get all users (admin only)
// @route GET /api/users
const getUsers = async (req, res) => {
  const users = await User.find().select('-password');
  return res.json({ count: users.length, users });
};

// @desc Update a user's role (admin only)
// @route PATCH /api/users/:id/role
const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'manager', 'member'].includes(role)) {
    return res.status(400).json({ message: 'role must be one of admin, manager, member' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.role = role;
  await user.save();
  return res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};

// @desc Deactivate/reactivate a user (admin only)
// @route PATCH /api/users/:id/status
const setUserActiveStatus = async (req, res) => {
  const { isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.isActive = !!isActive;
  await user.save();
  return res.json({ user: { id: user._id, isActive: user.isActive } });
};

module.exports = { getUsers, updateUserRole, setUserActiveStatus };
