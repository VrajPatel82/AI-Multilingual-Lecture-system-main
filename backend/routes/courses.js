const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { paginate } = require('../utils/pagination');
const auth = require('../middleware/auth');

// @route   GET /api/courses
// @desc    Get all courses (paginated, with filters)
// @access  Private (any role)
router.get('/', auth, async (req, res, next) => {
  try {
    const { department, semester, search, page, limit } = req.query;
    const filter = {};

    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await paginate(Course, filter, { page, limit, sort: { name: 1 } }, [
      { path: 'department', select: 'name code' }
    ]);

    res.json({
      data: result.data,
      pagination: { total: result.pagination.totalItems, ...result.pagination }
    });
  } catch (error) {
    next(error);
  }
});
// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Professors, Admins)
router.post('/', auth, async (req, res, next) => {
  try {
    // Basic role check - allow profs and admins
    if (!['super_admin', 'inst_admin', 'dept_admin', 'professor'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to create courses' });
    }
    
    const { name, code, semester, department } = req.body;
    
    // For professors, default to their own department if not provided
    const targetDepartment = department || req.user.department;
    
    if (!name || !code || !targetDepartment) {
      return res.status(400).json({ success: false, message: 'Name, code, and department are required' });
    }

    // Check if course code already exists
    const existing = await Course.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Course with this code already exists' });
    }

    const course = await Course.create({
      name,
      code: code.toUpperCase(),
      semester,
      department: targetDepartment
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
