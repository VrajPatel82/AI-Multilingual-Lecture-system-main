const express = require('express');
const router = express.Router();
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
  deleteAssignment
} = require('../controllers/assignmentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');

router.use(auth);

// Get all assignments
router.get('/', getAssignments);

// Get single assignment
router.get('/:id', getAssignmentById);

// Create assignment (professor & admins)
router.post('/',
  roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'),
  upload.array('files', 5),
  createAssignment
);

// Submit assignment (students)
router.post('/:id/submit',
  upload.array('files', 5),
  submitAssignment
);

// Get submissions for an assignment (professor & admins)
router.get('/:id/submissions',
  roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'),
  getSubmissions
);

// Grade a submission (professor & admins)
router.put('/:assignmentId/submissions/:submissionId/grade',
  roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'),
  gradeSubmission
);

// Delete assignment (professor & admins)
router.delete('/:id',
  roleCheck('professor', 'dept_admin', 'inst_admin', 'super_admin'),
  deleteAssignment
);

module.exports = router;
