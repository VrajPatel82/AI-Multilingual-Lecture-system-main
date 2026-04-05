const express = require('express');
const router = express.Router();
const {
  getInstitutions,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getStats,
  getReports
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require admin access
router.use(auth);
router.use(roleCheck('dept_admin', 'inst_admin', 'super_admin'));

// Stats & Reports
router.get('/stats', getStats);
router.get('/reports', getReports);

// Institutions
router.get('/institutions', getInstitutions);
router.post('/institutions', createInstitution);
router.put('/institutions/:id', updateInstitution);
router.delete('/institutions/:id', deleteInstitution);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Courses
router.get('/courses', getCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

module.exports = router;
