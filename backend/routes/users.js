const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateStudentSemester
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require authentication
router.use(auth);

// GET users - allowed for professor (to view their students) and admin roles
// POST, PUT, DELETE - admin only
router.get('/', roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'), getAllUsers);
router.get('/:id', roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'), getUserById);
router.post('/', roleCheck('dept_admin', 'inst_admin', 'super_admin'), createUser);
router.put('/:id', roleCheck('dept_admin', 'inst_admin', 'super_admin'), updateUser);
router.put('/:id/update-semester', roleCheck('dept_admin', 'inst_admin', 'super_admin'), updateStudentSemester);
router.delete('/:id', roleCheck('dept_admin', 'inst_admin', 'super_admin'), deleteUser);

module.exports = router;
