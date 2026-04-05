const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { paginate } = require('../utils/pagination');

// @desc    Mark attendance for a class session
// @route   POST /api/attendance
exports.markAttendance = async (req, res, next) => {
  try {
    const { course, date, students } = req.body;

    if (!students || !students.length) {
      return res.status(400).json({ message: 'Students list is required' });
    }

    // Check for existing attendance on that date for that course
    const normalizedDate = new Date(new Date(date).setHours(0, 0, 0, 0));
    const existing = await Attendance.findOne({
      course,
      date: normalizedDate
    });

    if (existing) {
      // Update existing
      existing.students = students;
      existing.markedBy = req.user._id;
      await existing.save();
      return res.json({ attendance: existing, message: 'Attendance updated successfully' });
    }

    const attendance = await Attendance.create({
      course,
      date: normalizedDate,
      markedBy: req.user._id,
      students
    });

    res.status(201).json({ attendance, message: 'Attendance marked successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance for a course
// @route   GET /api/attendance/course/:courseId
exports.getCourseAttendance = async (req, res, next) => {
  try {
    const { from, to, page, limit, course } = req.query;
    const filter = {};
    if (course) {
      const courseIds = course.split(',').map(id => id.trim());
      filter.course = courseIds.length === 1 ? courseIds[0] : { $in: courseIds };
    } else {
      filter.course = req.params.courseId;
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const result = await paginate(Attendance, filter, { page, limit, sort: { date: -1 } }, [
      { path: 'students.student', select: 'name email' },
      { path: 'markedBy', select: 'name' },
      { path: 'course', select: 'name code' }
    ]);

    res.json({ attendance: result.data, ...result.pagination });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's attendance history
// @route   GET /api/attendance/student/:studentId
exports.getStudentAttendance = async (req, res, next) => {
  try {
    const { course } = req.query;
    const studentId = req.params.studentId;

    const filter = { 'students.student': studentId };
    if (course) filter.course = course;

    const records = await Attendance.find(filter)
      .populate('course', 'name code')
      .sort({ date: -1 });

    // Calculate stats
    let totalClasses = 0;
    let present = 0;
    let absent = 0;
    let late = 0;

    records.forEach(record => {
      const entry = record.students.find(s => s.student.toString() === studentId);
      if (entry) {
        totalClasses++;
        if (entry.status === 'present') present++;
        else if (entry.status === 'absent') absent++;
        else late++;
      }
    });

    const percentage = totalClasses > 0 ? ((present + late) / totalClasses * 100).toFixed(1) : 0;

    res.json({
      records,
      stats: { totalClasses, present, absent, late, percentage: parseFloat(percentage) }
    });
  } catch (error) {
    next(error);
  }
};
