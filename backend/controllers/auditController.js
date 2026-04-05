const AuditLog = require('../models/AuditLog');
const { paginate } = require('../utils/pagination');

// Audit logger middleware
const auditLogger = (action, resource) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      // Log after successful operation (non-error response)
      if (res.statusCode < 400) {
        AuditLog.create({
          userId: req.user?._id,
          action,
          resource,
          resourceId: req.params.id || data?.id || data?._id,
          description: `${action} ${resource}`,
          changes: action === 'delete' ? {} : (req.body || {}),
          ipAddress: req.ip || req.connection?.remoteAddress || ''
        }).catch(err => console.error('Audit log error:', err.message));
      }

      return originalJson(data);
    };

    next();
  };
};

// @desc    Get audit logs (admin only)
// @route   GET /api/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { userId, action, resource, from, to, search, page, limit } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }

    const result = await paginate(AuditLog, filter, { page, limit, sort: { createdAt: -1 } }, [
      { path: 'userId', select: 'name email role' }
    ]);

    res.json({ logs: result.data, ...result.pagination });
  } catch (error) {
    next(error);
  }
};

module.exports = { auditLogger, getAuditLogs };
