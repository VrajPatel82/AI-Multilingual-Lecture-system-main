const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { getAuditLogs } = require('../controllers/auditController');

// All audit log routes require admin access
router.use(auth);
router.use(roleCheck('dept_admin', 'inst_admin', 'super_admin'));

router.get('/', getAuditLogs);

module.exports = router;
