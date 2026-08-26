const Task = require('../models/Task');
const User = require('../models/User');
const { getTaskBreakdown, getDigest } = require('../utils/aiClient');

// Helper: can this user act on this task beyond just viewing?
const canModify = (user, task) => {
  if (user.role === 'admin' || user.role === 'manager') return true;
  return String(task.createdBy) === String(user._id) || String(task.assignedTo) === String(user._id);
};

// @desc Create a task
// @route POST /api/tasks
// admin & manager can assign to anyone; member can only create tasks for themselves
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    let finalAssignee = req.user._id;
    if (assignedTo) {
      if (req.user.role === 'member' && String(assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Members can only assign tasks to themselves' });
      }
      const assignee = await User.findById(assignedTo);
      if (!assignee) return res.status(404).json({ message: 'assignedTo user not found' });
      finalAssignee = assignee._id;
    }

    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      assignedTo: finalAssignee,
      createdBy: req.user._id,
    });

    return res.status(201).json({ task });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create task', error: err.message });
  }
};

// @desc Get tasks (role-scoped)
// @route GET /api/tasks
// admin: all tasks | manager: all tasks | member: only tasks they created or are assigned to
const getTasks = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'member') {
      filter.$or = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    return res.json({ count: tasks.length, tasks });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
};

// @desc Get single task
// @route GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role === 'member' && !canModify(req.user, task)) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    return res.json({ task });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch task', error: err.message });
  }
};

// @desc Update a task
// @route PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!canModify(req.user, task)) {
      return res.status(403).json({ message: 'Not authorized to modify this task' });
    }

    const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'estimatedHours', 'subtasks'];
    // Only admin/manager can reassign a task
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      allowedFields.push('assignedTo');
    }

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    return res.json({ task });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update task', error: err.message });
  }
};

// @desc Delete a task
// @route DELETE /api/tasks/:id
// Only admin and manager can delete
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await task.deleteOne();
    return res.json({ message: 'Task deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete task', error: err.message });
  }
};

// @desc AI: break a task down into subtasks + priority/effort suggestions
// @route POST /api/tasks/:id/ai-breakdown
const aiBreakdown = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!canModify(req.user, task)) {
      return res.status(403).json({ message: 'Not authorized to modify this task' });
    }

    const result = await getTaskBreakdown({ title: task.title, description: task.description });

    task.subtasks = (result.subtasks || []).map((text) => ({ text, done: false }));
    if (result.suggested_priority) task.priority = result.suggested_priority;
    if (result.estimated_hours) task.estimatedHours = result.estimated_hours;
    task.aiGenerated = true;

    await task.save();
    return res.json({ task, ai: result });
  } catch (err) {
    return res.status(502).json({ message: 'AI service request failed', error: err.message });
  }
};

// @desc AI: generate a natural-language digest of the current user's pending tasks
// @route GET /api/tasks/ai-digest
const aiDigest = async (req, res) => {
  try {
    const filter =
      req.user.role === 'member'
        ? { $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }], status: { $ne: 'completed' } }
        : { status: { $ne: 'completed' } };

    const tasks = await Task.find(filter).limit(50).select('title priority status dueDate');

    const result = await getDigest({
      tasks: tasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
      })),
      userName: req.user.name,
    });

    return res.json(result);
  } catch (err) {
    return res.status(502).json({ message: 'AI service request failed', error: err.message });
  }
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask, aiBreakdown, aiDigest };
