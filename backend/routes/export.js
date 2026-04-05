const express = require('express');
const router = express.Router();
const {
  exportStudents,
  exportCourseReport,
  exportAttendance
} = require('../controllers/exportController');
const { getAuditLogs } = require('../controllers/auditController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);
router.use(roleCheck('dept_admin', 'inst_admin', 'super_admin'));

// Export students data
router.get('/students', exportStudents);

// Export course report
router.get('/course/:id', exportCourseReport);

// Export attendance
router.get('/attendance', exportAttendance);

// Audit logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
