const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getCourseAttendance,
  getStudentAttendance
} = require('../controllers/attendanceController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);

// Mark attendance (professor & admins)
router.post('/',
  roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'),
  markAttendance
);

// Get attendance for a course
router.get('/course/:courseId', getCourseAttendance);

// Get student's attendance
router.get('/student/:studentId', getStudentAttendance);

module.exports = router;
