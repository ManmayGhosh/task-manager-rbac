const express = require('express');
const { getUsers, updateUserRole, setUserActiveStatus } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', getUsers);
router.patch('/:id/role', updateUserRole);
router.patch('/:id/status', setUserActiveStatus);

module.exports = router;
