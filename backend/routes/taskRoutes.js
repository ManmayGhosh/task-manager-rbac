const express = require('express');
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  aiBreakdown,
  aiDigest,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect);

router.get('/ai-digest', aiDigest);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(authorize('admin', 'manager'), deleteTask);

router.post('/:id/ai-breakdown', aiBreakdown);

module.exports = router;
