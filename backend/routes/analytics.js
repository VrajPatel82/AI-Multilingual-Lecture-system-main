const express = require('express');
const router = express.Router();
const {
  getStudentAnalytics,
  getCourseAnalytics,
  getDepartmentAnalytics,
  getLectureUploadAnalytics,
  getLanguageUsageAnalytics
} = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.use(auth);

// Student performance analytics
router.get('/student/:id', getStudentAnalytics);

// Course analytics
router.get('/course/:id', getCourseAnalytics);

// Department analytics
router.get('/department/:id', getDepartmentAnalytics);

// Lecture upload analytics
router.get('/department/:id/lecture-uploads', getLectureUploadAnalytics);

// Language usage analytics
router.get('/department/:id/language-usage', getLanguageUsageAnalytics);

module.exports = router;
