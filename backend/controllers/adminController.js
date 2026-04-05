const Institution = require('../models/Institution');
const Department = require('../models/Department');
const Course = require('../models/Course');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');

// ========== INSTITUTIONS ==========

// @desc    Get all institutions
// @route   GET /api/admin/institutions
exports.getInstitutions = async (req, res, next) => {
  try {
    const institutions = await Institution.aggregate([
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: 'institution',
          as: 'departments'
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);
    res.json({ data: institutions });
  } catch (error) {
    next(error);
  }
};

// @desc    Create institution
// @route   POST /api/admin/institutions
exports.createInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.create(req.body);
    res.status(201).json({ institution, message: 'Institution created successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update institution
// @route   PUT /api/admin/institutions/:id
exports.updateInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!institution) return res.status(404).json({ message: 'Institution not found' });
    res.json({ institution, message: 'Institution updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete institution
// @route   DELETE /api/admin/institutions/:id
exports.deleteInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution) return res.status(404).json({ message: 'Institution not found' });

    // Cascade: remove departments, courses, and unset user references
    const departments = await Department.find({ institution: req.params.id });
    const deptIds = departments.map(d => d._id);
    await Course.deleteMany({ department: { $in: deptIds } });
    await Department.deleteMany({ institution: req.params.id });
    await User.updateMany({ institution: req.params.id }, { $unset: { institution: 1, department: 1 } });

    res.json({ message: 'Institution and related data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ========== DEPARTMENTS ==========

// @desc    Get all departments
// @route   GET /api/admin/departments
exports.getDepartments = async (req, res, next) => {
  try {
    const { institution } = req.query;
    const filter = {};
    if (institution) filter.institution = institution;

    const departments = await Department.find(filter)
      .populate('institution', 'name code')
      .sort({ name: 1 });

    // Enhance with courses and professors info
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        // Get all courses in department
        const courses = await Course.find({ department: dept._id })
          .select('_id name code semester')
          .sort({ name: 1 });

        // Get all professors in department
        const professors = await User.find({
          department: dept._id,
          role: 'professor'
        }).select('_id name email');

        // Enrich courses with their teaching professors (from lectures)
        const enrichedCourses = await Promise.all(
          courses.map(async (course) => {
            // Find unique professors teaching this course
            const teachingProfs = await Lecture.find({ course: course._id })
              .distinct('uploadedBy');
            
            return {
              ...course.toObject(),
              teachers: professors.filter(p => teachingProfs.includes(p._id.toString()))
            };
          })
        );

        return {
          ...dept.toObject(),
          courses: enrichedCourses,
          professors,
          coursesCount: courses.length,
          professorsCount: professors.length
        };
      })
    );

    res.json({ data: enriched });
  } catch (error) {
    next(error);
  }
};

// @desc    Create department
// @route   POST /api/admin/departments
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, institution } = req.body;
    
    const deptData = { name, code, institution };
    
    // Generate departmentId if institution is provided
    if (institution) {
      const inst = await require('../models/Institution').findById(institution);
      if (inst) {
        const instCode = inst.code || 'UNK';
        const deptCode = code || 'UNK';
        deptData.departmentId = `${instCode}-${deptCode}-001`;
      }
    }
    
    const department = await Department.create(deptData);
    await department.populate('institution', 'name code');
    res.status(201).json({ department, message: 'Department created successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/admin/departments/:id
exports.updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('institution', 'name code');
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ department, message: 'Department updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete department
// @route   DELETE /api/admin/departments/:id
exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    // Cascade: remove courses under this department and unset user department references
    await Course.deleteMany({ department: req.params.id });
    await User.updateMany({ department: req.params.id }, { $unset: { department: 1 } });

    res.json({ message: 'Department and related courses deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ========== COURSES ==========

// @desc    Get all courses
// @route   GET /api/admin/courses
exports.getCourses = async (req, res, next) => {
  try {
    const { department, semester } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (semester) filter.semester = parseInt(semester);

    const courses = await Course.find(filter)
      .populate('department', 'name code')
      .sort({ name: 1 });

    res.json({ data: courses });
  } catch (error) {
    next(error);
  }
};

// @desc    Create course
// @route   POST /api/admin/courses
exports.createCourse = async (req, res, next) => {
  try {
    const course = await Course.create(req.body);
    await course.populate('department', 'name code');
    res.status(201).json({ course, message: 'Course created successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/admin/courses/:id
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('department', 'name code');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course, message: 'Course updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/admin/courses/:id
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ========== REPORTS / STATS ==========

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalProfessors,
      totalDeptAdmins,
      totalInstAdmins,
      totalInstitutions,
      totalDepartments,
      totalCourses,
      totalLectures,
      totalQuizzes,
      totalQuizResults
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'professor' }),
      User.countDocuments({ role: 'dept_admin' }),
      User.countDocuments({ role: 'inst_admin' }),
      Institution.countDocuments(),
      Department.countDocuments(),
      Course.countDocuments(),
      Lecture.countDocuments(),
      Quiz.countDocuments(),
      QuizResult.countDocuments()
    ]);

    res.json({
      totalUsers,
      totalStudents,
      totalProfessors,
      totalDeptAdmins,
      totalInstAdmins,
      totalInstitutions,
      totalDepartments,
      totalCourses,
      totalLectures,
      totalQuizzes,
      totalQuizResults
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get progress reports
// @route   GET /api/admin/reports
exports.getReports = async (req, res, next) => {
  try {
    // Top performing students
    const topStudents = await QuizResult.aggregate([
      {
        $group: {
          _id: '$student',
          totalQuizzes: { $sum: 1 },
          avgScore: { $avg: { $multiply: [{ $divide: ['$totalScore', '$maxScore'] }, 100] } }
        }
      },
      { $sort: { avgScore: -1 } },
      { $limit: 10 }
    ]);

    // Populate student names
    await User.populate(topStudents, { path: '_id', select: 'name email' });

    // Recent quiz results
    const recentResults = await QuizResult.find()
      .populate('quiz', 'title')
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ topStudents, recentResults });
  } catch (error) {
    next(error);
  }
};
