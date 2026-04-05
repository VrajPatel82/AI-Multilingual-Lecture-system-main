const User = require('../models/User');
const QuizResult = require('../models/QuizResult');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');

// @desc    Export students data as JSON (CSV format can be generated client-side)
// @route   GET /api/export/students
exports.exportStudents = async (req, res, next) => {
  try {
    const { department, institution } = req.query;
    const filter = { role: 'student' };
    if (department) filter.department = department;
    if (institution) filter.institution = institution;

    const students = await User.find(filter)
      .populate('institution', 'name')
      .populate('department', 'name')
      .select('name email role institution department createdAt');

    // Format for CSV
    const csvData = students.map(s => ({
      name: s.name,
      email: s.email,
      institution: s.institution?.name || '',
      department: s.department?.name || '',
      joinedAt: s.createdAt.toISOString().split('T')[0]
    }));

    res.json({ data: csvData, count: csvData.length });
  } catch (error) {
    next(error);
  }
};

// @desc    Export course report
// @route   GET /api/export/course/:id
exports.exportCourseReport = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findById(courseId).populate('department', 'name');

    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Get quiz results for this course
    const Quiz = require('../models/Quiz');
    const quizzes = await Quiz.find({ course: courseId });
    const quizIds = quizzes.map(q => q._id);

    const results = await QuizResult.find({ quiz: { $in: quizIds } })
      .populate('student', 'name email')
      .populate('quiz', 'title');

    // Get attendance
    const attendance = await Attendance.find({ course: courseId })
      .populate('students.student', 'name email');

    res.json({
      course: { name: course.name, code: course.code, department: course.department?.name },
      quizResults: results.map(r => ({
        studentName: r.student?.name,
        studentEmail: r.student?.email,
        quizTitle: r.quiz?.title,
        score: r.totalScore,
        maxScore: r.maxScore,
        percentage: r.maxScore > 0 ? ((r.totalScore / r.maxScore) * 100).toFixed(1) : '0',
        submittedAt: r.submittedAt
      })),
      attendanceRecords: attendance.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export attendance report
// @route   GET /api/export/attendance
exports.exportAttendance = async (req, res, next) => {
  try {
    const { course, from, to } = req.query;
    const filter = {};
    if (course) {
      const courseIds = course.split(',').map(id => id.trim());
      filter.course = courseIds.length === 1 ? courseIds[0] : { $in: courseIds };
    }
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await Attendance.find(filter)
      .populate('course', 'name code')
      .populate('students.student', 'name email')
      .sort({ date: -1 });

    const data = [];
    records.forEach(r => {
      r.students.forEach(s => {
        data.push({
          courseName: r.course?.name,
          courseCode: r.course?.code,
          date: r.date.toISOString().split('T')[0],
          studentName: s.student?.name,
          studentEmail: s.student?.email,
          status: s.status
        });
      });
    });

    res.json({ data, count: data.length });
  } catch (error) {
    next(error);
  }
};
