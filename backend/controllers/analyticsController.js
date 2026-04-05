const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Lecture = require('../models/Lecture');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');

// @desc    Get student performance analytics
// @route   GET /api/analytics/student/:id
exports.getStudentAnalytics = async (req, res, next) => {
  try {
    const studentId = req.params.id;

    // Quiz performance over time
    const quizResults = await QuizResult.find({ student: studentId })
      .populate('quiz', 'title course createdAt')
      .sort({ createdAt: 1 });

    const quizScores = quizResults.map(r => ({
      quizTitle: r.quiz?.title,
      score: r.totalScore,
      maxScore: r.maxScore,
      percentage: r.maxScore > 0 ? parseFloat(((r.totalScore / r.maxScore) * 100).toFixed(1)) : 0,
      date: r.createdAt
    }));

    // Average score
    const avgScore = quizScores.length
      ? parseFloat((quizScores.reduce((sum, q) => sum + q.percentage, 0) / quizScores.length).toFixed(1))
      : 0;

    // Attendance stats
    const attendanceRecords = await Attendance.find({ 'students.student': studentId });
    let totalClasses = 0, presentCount = 0;
    attendanceRecords.forEach(r => {
      const entry = r.students.find(s => s.student.toString() === studentId);
      if (entry) {
        totalClasses++;
        if (entry.status === 'present' || entry.status === 'late') presentCount++;
      }
    });
    const attendancePercentage = totalClasses > 0 ? parseFloat(((presentCount / totalClasses) * 100).toFixed(1)) : 0;

    // Rank among all students (by avg quiz score)
    const allResults = await QuizResult.aggregate([
      { $group: { _id: '$student', avgPct: { $avg: { $multiply: [{ $divide: ['$totalScore', '$maxScore'] }, 100] } } } },
      { $sort: { avgPct: -1 } }
    ]);
    const rank = allResults.findIndex(r => r._id.toString() === studentId) + 1;

    res.json({
      quizScores,
      avgScore,
      totalQuizzes: quizScores.length,
      attendancePercentage,
      totalClasses,
      rank: rank || null,
      totalStudents: allResults.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get course analytics
// @route   GET /api/analytics/course/:id
exports.getCourseAnalytics = async (req, res, next) => {
  try {
    const courseId = req.params.id;

    // Quizzes for this course
    const quizzes = await Quiz.find({ course: courseId });
    const quizIds = quizzes.map(q => q._id);

    // All results for these quizzes
    const results = await QuizResult.find({ quiz: { $in: quizIds } });

    // Average score
    const scores = results.map(r => r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0);
    const avgScore = scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;

    // Unique students who attempted
    const uniqueStudents = [...new Set(results.map(r => r.student.toString()))];

    // Per-quiz breakdown
    const quizBreakdown = await Promise.all(quizzes.map(async (quiz) => {
      const qResults = results.filter(r => r.quiz.toString() === quiz._id.toString());
      const qScores = qResults.map(r => r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0);
      return {
        quizTitle: quiz.title,
        totalAttempts: qResults.length,
        avgScore: qScores.length ? parseFloat((qScores.reduce((a, b) => a + b, 0) / qScores.length).toFixed(1)) : 0,
        highestScore: qScores.length ? Math.max(...qScores).toFixed(1) : 0,
        lowestScore: qScores.length ? Math.min(...qScores).toFixed(1) : 0
      };
    }));

    // Lectures count
    const lectureCount = await Lecture.countDocuments({ course: courseId });

    // Assignment stats
    const assignments = await Assignment.find({ course: courseId });
    const assignmentCount = assignments.length;

    // Attendance stats
    const attendanceRecords = await Attendance.find({ course: courseId });
    const avgAttendance = attendanceRecords.length > 0
      ? parseFloat((attendanceRecords.reduce((sum, r) => {
          const present = r.students.filter(s => s.status === 'present' || s.status === 'late').length;
          return sum + (r.students.length > 0 ? (present / r.students.length) * 100 : 0);
        }, 0) / attendanceRecords.length).toFixed(1))
      : 0;

    res.json({
      avgScore,
      totalStudents: uniqueStudents.length,
      totalQuizzes: quizzes.length,
      lectureCount,
      assignmentCount,
      quizBreakdown,
      avgAttendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get department analytics
// @route   GET /api/analytics/department/:id
exports.getDepartmentAnalytics = async (req, res, next) => {
  try {
    const deptId = req.params.id;

    const [totalStudents, totalProfessors, courses, lectures, attendanceRecords] = await Promise.all([
      User.countDocuments({ department: deptId, role: 'student' }),
      User.countDocuments({ department: deptId, role: 'professor' }),
      Course.find({ department: deptId }),
      require('../models/Lecture').find({}), // Will filter by course
      require('../models/Attendance').find({}) // Will filter by course
    ]);

    const courseIds = courses.map(c => c._id);

    // Get lectures for this department
    const deptLectures = lectures.filter(l => courseIds.some(id => id.toString() === l.course?.toString()));
    const totalLectures = deptLectures.length;

    // Get attendance for this department's courses
    const deptAttendance = attendanceRecords.filter(a => courseIds.some(id => id.toString() === a.course?.toString()));
    
    // Calculate average attendance percentage
    let avgAttendance = 0;
    if (deptAttendance.length > 0) {
      let totalAttendancePercent = 0;
      let recordCount = 0;
      
      deptAttendance.forEach(record => {
        if (record.students && record.students.length > 0) {
          const presentCount = record.students.filter(s => s.status === 'present' || s.status === 'late').length;
          const percentage = (presentCount / record.students.length) * 100;
          totalAttendancePercent += percentage;
          recordCount++;
        }
      });
      
      avgAttendance = recordCount > 0 ? parseFloat((totalAttendancePercent / recordCount).toFixed(1)) : 0;
    }

    // Quiz results for department courses
    const quizzes = await require('../models/Quiz').find({ course: { $in: courseIds } });
    const quizIds = quizzes.map(q => q._id);
    const results = await require('../models/QuizResult').find({ quiz: { $in: quizIds } });

    const scores = results.map(r => r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0);
    const avgScore = scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;
    const passCount = scores.filter(s => s >= 50).length;
    const passPercentage = scores.length ? parseFloat(((passCount / scores.length) * 100).toFixed(1)) : 0;

    // Top students
    const topStudentResults = await require('../models/QuizResult').aggregate([
      { $match: { quiz: { $in: quizIds } } },
      { $group: { _id: '$student', avgPct: { $avg: { $multiply: [{ $divide: ['$totalScore', '$maxScore'] }, 100] } }, quizCount: { $sum: 1 } } },
      { $sort: { avgPct: -1 } },
      { $limit: 10 }
    ]);
    await User.populate(topStudentResults, { path: '_id', select: 'name email' });

    // Course-wise stats
    const courseStats = await Promise.all(courses.map(async (c) => {
      const cQuizzes = quizzes.filter(q => q.course.toString() === c._id.toString());
      const cQuizIds = cQuizzes.map(q => q._id);
      const cResults = results.filter(r => cQuizIds.some(id => id.toString() === r.quiz.toString()));
      const cScores = cResults.map(r => r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0);

      return {
        courseName: c.name,
        courseCode: c.code,
        totalQuizzes: cQuizzes.length,
        avgScore: cScores.length ? parseFloat((cScores.reduce((a, b) => a + b, 0) / cScores.length).toFixed(1)) : 0,
        totalAttempts: cResults.length
      };
    }));

    res.json({
      totalStudents,
      totalProfessors,
      totalCourses: courses.length,
      totalLectures,
      avgAttendance,
      avgScore,
      passPercentage,
      topStudents: topStudentResults,
      courseStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lecture upload analytics for department
// @route   GET /api/analytics/department/:id/lecture-uploads
exports.getLectureUploadAnalytics = async (req, res, next) => {
  try {
    const deptId = req.params.id;
    
    // Get all professors in department
    const professors = await User.find({ department: deptId, role: 'professor' }).select('name professorId');
    const profIds = professors.map(p => p._id);
    
    // Get all lectures uploaded by these professors
    const lectures = await Lecture.find({ uploadedBy: { $in: profIds } });
    
    // Group by professor
    const professorStats = professors.map(prof => {
      const profLectures = lectures.filter(l => l.uploadedBy.toString() === prof._id.toString());
      
      // Count by month
      const monthlyCount = {};
      profLectures.forEach(l => {
        const monthKey = new Date(l.createdAt).toISOString().slice(0, 7); // YYYY-MM
        monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
      });
      
      return {
        professorName: prof.name,
        professorId: prof.professorId,
        totalLectures: profLectures.length,
        lecturesByType: {
          lecture: profLectures.filter(l => l.type === 'lecture').length,
          lab: profLectures.filter(l => l.type === 'lab').length
        },
        monthlyUploads: monthlyCount
      };
    });
    
    // Department-wide stats
    const totalLectures = lectures.length;
    const avgLecturesPerProf = professors.length > 0 ? parseFloat((totalLectures / professors.length).toFixed(1)) : 0;
    
    res.json({
      totalLectures,
      totalProfessors: professors.length,
      avgLecturesPerProf,
      professorStats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get language usage analytics for department
// @route   GET /api/analytics/department/:id/language-usage
exports.getLanguageUsageAnalytics = async (req, res, next) => {
  try {
    const deptId = req.params.id;
    
    // Get all professors in department
    const professors = await User.find({ department: deptId, role: 'professor' }).select('name professorId');
    const profIds = professors.map(p => p._id);
    
    // Get all lectures uploaded by these professors
    const lectures = await Lecture.find({ uploadedBy: { $in: profIds } });
    
    // Group by professor and calculate language percentages
    const professorLanguageStats = professors.map(prof => {
      const profLectures = lectures.filter(l => l.uploadedBy.toString() === prof._id.toString());
      
      if (profLectures.length === 0) {
        return {
          professorName: prof.name,
          professorId: prof.professorId,
          totalLectures: 0,
          languageDistribution: {
            English: 0,
            Hindi: 0,
            Gujarati: 0,
            Mixed: 0
          }
        };
      }
      
      // Count teaching languages
      const languageCount = {
        English: 0,
        Hindi: 0,
        Gujarati: 0,
        Mixed: 0
      };
      
      profLectures.forEach(l => {
        const lang = l.teachingLanguage || 'English';
        if (languageCount.hasOwnProperty(lang)) {
          languageCount[lang]++;
        }
      });
      
      // Calculate percentages
      const languageDistribution = {};
      Object.keys(languageCount).forEach(lang => {
        languageDistribution[lang] = parseFloat(((languageCount[lang] / profLectures.length) * 100).toFixed(1));
      });
      
      return {
        professorName: prof.name,
        professorId: prof.professorId,
        totalLectures: profLectures.length,
        languageDistribution
      };
    });
    
    // Department-wide language stats
    const totalLanguageCount = {
      English: 0,
      Hindi: 0,
      Gujarati: 0,
      Mixed: 0
    };
    
    lectures.forEach(l => {
      const lang = l.teachingLanguage || 'English';
      if (totalLanguageCount.hasOwnProperty(lang)) {
        totalLanguageCount[lang]++;
      }
    });
    
    const deptLanguageDistribution = {};
    Object.keys(totalLanguageCount).forEach(lang => {
      deptLanguageDistribution[lang] = lectures.length > 0 ? parseFloat(((totalLanguageCount[lang] / lectures.length) * 100).toFixed(1)) : 0;
    });
    
    res.json({
      totalLectures: lectures.length,
      departmentLanguageDistribution: deptLanguageDistribution,
      professorLanguageStats
    });
  } catch (error) {
    next(error);
  }
};
