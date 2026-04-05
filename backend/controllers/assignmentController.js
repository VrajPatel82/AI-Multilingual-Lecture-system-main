const Assignment = require('../models/Assignment');
const { paginate } = require('../utils/pagination');
const path = require('path');
const fs = require('fs');

// @desc    Create assignment
// @route   POST /api/assignments
exports.createAssignment = async (req, res, next) => {
  try {
    const { title, description, course, dueDate, maxMarks } = req.body;

    const attachments = [];
    if (req.files && req.files.length) {
      req.files.forEach(file => {
        attachments.push({
          fileUrl: `/uploads/${file.filename}`,
          fileName: file.originalname
        });
      });
    }

    const assignment = await Assignment.create({
      title,
      description,
      course,
      dueDate: new Date(dueDate),
      maxMarks: parseInt(maxMarks),
      attachments,
      createdBy: req.user._id
    });

    await assignment.populate('course', 'name code');
    await assignment.populate('createdBy', 'name email');

    res.status(201).json({ assignment, message: 'Assignment created successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all assignments
// @route   GET /api/assignments
exports.getAssignments = async (req, res, next) => {
  try {
    const { course, search, createdBy, status, page, limit } = req.query;
    const filter = {};
    // Handle comma-separated course IDs
    if (course) {
      const courseIds = course.split(',').map(id => id.trim());
      filter.course = courseIds.length === 1 ? courseIds[0] : { $in: courseIds };
    }
    if (createdBy) filter.createdBy = createdBy;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await paginate(Assignment, filter, { page, limit }, [
      { path: 'course', select: 'name code' },
      { path: 'createdBy', select: 'name email' }
    ]);

    // For students, add their submission status
    const assignments = result.data.map(a => {
      const obj = a.toObject();
      if (req.user.role === 'student') {
        const submission = obj.submissions?.find(s => s.student.toString() === req.user._id.toString());
        obj.mySubmission = submission || null;
        obj.submissionCount = obj.submissions?.length || 0;
        delete obj.submissions; // Don't expose other students' submissions
      } else {
        obj.submissionCount = obj.submissions?.length || 0;
      }
      obj.isOverdue = new Date() > new Date(obj.dueDate);
      return obj;
    });

    // Filter by status if requested
    let filteredAssignments = assignments;
    if (status === 'pending' && req.user.role === 'student') {
      filteredAssignments = assignments.filter(a => !a.mySubmission);
    } else if (status === 'submitted' && req.user.role === 'student') {
      filteredAssignments = assignments.filter(a => a.mySubmission && a.mySubmission.status === 'pending');
    } else if (status === 'graded' && req.user.role === 'student') {
      filteredAssignments = assignments.filter(a => a.mySubmission && a.mySubmission.status === 'graded');
    }

    res.json({
      data: filteredAssignments,
      pagination: { total: result.pagination.totalItems, ...result.pagination }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
exports.getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'name code')
      .populate('createdBy', 'name email')
      .populate('submissions.student', 'name email enrollmentNumber');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const obj = assignment.toObject();

    // Students can only see their own submission
    if (req.user.role === 'student') {
      obj.submissions = obj.submissions.filter(
        s => s.student._id.toString() === req.user._id.toString()
      );
    }

    res.json({ assignment: obj });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
exports.submitAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      s => s.student.toString() === req.user._id.toString()
    );
    if (existingSubmission) {
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }

    const files = [];
    if (req.files && req.files.length) {
      req.files.forEach(file => {
        files.push({
          fileUrl: `/uploads/${file.filename}`,
          fileName: file.originalname,
          fileType: path.extname(file.originalname).slice(1)
        });
      });
    }

    if (!files.length) {
      return res.status(400).json({ message: 'Please upload at least one file' });
    }

    const isLate = new Date() > new Date(assignment.dueDate);

    assignment.submissions.push({
      student: req.user._id,
      files,
      isLate
    });

    await assignment.save();

    res.status(201).json({ message: 'Assignment submitted successfully', isLate });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all submissions for an assignment
// @route   GET /api/assignments/:id/submissions
exports.getSubmissions = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('submissions.student', 'name email enrollmentNumber')
      .populate('course', 'name code');

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({
      assignment: {
        title: assignment.title,
        course: assignment.course,
        dueDate: assignment.dueDate,
        maxMarks: assignment.maxMarks
      },
      submissions: assignment.submissions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grade a submission
// @route   PUT /api/assignments/:assignmentId/submissions/:submissionId/grade
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { marks, feedback } = req.body;
    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (marks > assignment.maxMarks) {
      return res.status(400).json({ message: `Marks cannot exceed ${assignment.maxMarks}` });
    }

    submission.marks = marks;
    submission.feedback = feedback || '';
    submission.status = 'graded';

    await assignment.save();

    res.json({ submission, message: 'Submission graded successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    if (assignment.createdBy.toString() !== req.user._id.toString() &&
        !['dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
