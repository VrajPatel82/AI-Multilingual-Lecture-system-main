const Gradebook = require('../models/Gradebook');
const User = require('../models/User');

// @desc    Create/update grade components for a course
// @route   POST /api/gradebook/:courseId/components
exports.setComponents = async (req, res, next) => {
  try {
    const { components } = req.body;

    // Validate total weightage = 100
    const totalWeight = components.reduce((sum, c) => sum + c.weightage, 0);
    if (totalWeight !== 100) {
      return res.status(400).json({ message: `Total weightage must be 100%, currently ${totalWeight}%` });
    }

    let gradebook = await Gradebook.findOne({ course: req.params.courseId });

    if (gradebook) {
      gradebook.components = components;
      await gradebook.save();
    } else {
      gradebook = await Gradebook.create({
        course: req.params.courseId,
        components,
        createdBy: req.user._id
      });
    }

    await gradebook.populate('course', 'name code');
    res.json({ gradebook, message: 'Grade components saved successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Enter grades for students
// @route   POST /api/gradebook/:courseId/grades
exports.enterGrades = async (req, res, next) => {
  try {
    const { grades } = req.body; // [{student, componentName, marksObtained}]

    let gradebook = await Gradebook.findOne({ course: req.params.courseId });
    if (!gradebook) {
      return res.status(404).json({ message: 'Gradebook not found. Set up components first.' });
    }

    grades.forEach(entry => {
      // Find existing grade entry or add new
      const existingIdx = gradebook.grades.findIndex(
        g => g.student.toString() === entry.student && g.componentName === entry.componentName
      );
      if (existingIdx >= 0) {
        gradebook.grades[existingIdx].marksObtained = entry.marksObtained;
        gradebook.grades[existingIdx].date = new Date();
      } else {
        gradebook.grades.push(entry);
      }
    });

    await gradebook.save();
    res.json({ message: 'Grades entered successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get gradebook for a course
// @route   GET /api/gradebook/:courseId
exports.getCourseGradebook = async (req, res, next) => {
  try {
    const gradebook = await Gradebook.findOne({ course: req.params.courseId })
      .populate('course', 'name code')
      .populate('grades.student', 'name email');

    if (!gradebook) {
      return res.status(404).json({ message: 'Gradebook not set up for this course' });
    }

    // Calculate final grades per student
    const studentMap = {};
    gradebook.grades.forEach(g => {
      const sid = g.student._id.toString();
      if (!studentMap[sid]) {
        studentMap[sid] = { student: g.student, components: {}, totalWeighted: 0 };
      }
      const component = gradebook.components.find(c => c.name === g.componentName);
      if (component) {
        const percentage = (g.marksObtained / component.maxMarks) * component.weightage;
        studentMap[sid].components[g.componentName] = {
          obtained: g.marksObtained,
          max: component.maxMarks,
          weightage: component.weightage,
          weighted: parseFloat(percentage.toFixed(2))
        };
        studentMap[sid].totalWeighted = Object.values(studentMap[sid].components)
          .reduce((sum, c) => sum + c.weighted, 0);
      }
    });

    // Calculate letter grades
    const calculateLetterGrade = (pct) => {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B';
      if (pct >= 60) return 'C';
      if (pct >= 50) return 'D';
      return 'F';
    };

    const studentGrades = Object.values(studentMap).map(s => ({
      ...s,
      totalWeighted: parseFloat(s.totalWeighted.toFixed(2)),
      letterGrade: calculateLetterGrade(s.totalWeighted)
    }));

    // Class statistics
    const totals = studentGrades.map(s => s.totalWeighted);
    const stats = totals.length ? {
      average: parseFloat((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(2)),
      highest: Math.max(...totals),
      lowest: Math.min(...totals),
      totalStudents: totals.length,
      passCount: totals.filter(t => t >= 50).length,
      failCount: totals.filter(t => t < 50).length
    } : null;

    res.json({
      gradebook: {
        course: gradebook.course,
        components: gradebook.components
      },
      studentGrades,
      stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a student's grades for a course
// @route   GET /api/gradebook/:courseId/student/:studentId
exports.getStudentGrades = async (req, res, next) => {
  try {
    const gradebook = await Gradebook.findOne({ course: req.params.courseId })
      .populate('course', 'name code');

    if (!gradebook) {
      return res.status(404).json({ message: 'Gradebook not found' });
    }

    const studentGrades = gradebook.grades.filter(
      g => g.student.toString() === req.params.studentId
    );

    let totalWeighted = 0;
    const breakdown = gradebook.components.map(comp => {
      const entry = studentGrades.find(g => g.componentName === comp.name);
      const obtained = entry ? entry.marksObtained : 0;
      const weighted = (obtained / comp.maxMarks) * comp.weightage;
      totalWeighted += weighted;
      return {
        name: comp.name,
        obtained,
        maxMarks: comp.maxMarks,
        weightage: comp.weightage,
        weighted: parseFloat(weighted.toFixed(2))
      };
    });

    const calculateLetterGrade = (pct) => {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B';
      if (pct >= 60) return 'C';
      if (pct >= 50) return 'D';
      return 'F';
    };

    res.json({
      course: gradebook.course,
      breakdown,
      totalWeighted: parseFloat(totalWeighted.toFixed(2)),
      letterGrade: calculateLetterGrade(totalWeighted)
    });
  } catch (error) {
    next(error);
  }
};
