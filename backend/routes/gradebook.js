const express = require('express');
const router = express.Router();
const {
  setComponents,
  enterGrades,
  getCourseGradebook,
  getStudentGrades
} = require('../controllers/gradebookController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);

// Get gradebook for a course
router.get('/:courseId', getCourseGradebook);

// Get student grades for a course
router.get('/:courseId/student/:studentId', getStudentGrades);

// Set grade components (professor & admins)
router.post('/:courseId/components',
  roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'),
  setComponents
);

// Enter grades (professor & admins)
router.post('/:courseId/grades',
  roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'),
  enterGrades
);

module.exports = router;
