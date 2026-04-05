const express = require('express');
const router = express.Router();
const {
  createEntry,
  getEntries,
  updateEntry,
  deleteEntry
} = require('../controllers/timetableController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.use(auth);

// Get timetable entries
router.get('/', getEntries);

// Create entry (admin only)
router.post('/',
  roleCheck('dept_admin', 'inst_admin', 'super_admin'),
  createEntry
);

// Update entry (admin only)
router.put('/:id',
  roleCheck('dept_admin', 'inst_admin', 'super_admin'),
  updateEntry
);

// Delete entry (admin only)
router.delete('/:id',
  roleCheck('dept_admin', 'inst_admin', 'super_admin'),
  deleteEntry
);

module.exports = router;
