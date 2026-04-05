const Notification = require('../models/Notification');
const User = require('../models/User');
const { paginate } = require('../utils/pagination');

// @desc    Send notification to user(s)
// @route   POST /api/notifications/send
exports.sendNotification = async (req, res, next) => {
  try {
    const { userIds, type, title, message, link } = req.body;

    if (!userIds || !userIds.length) {
      return res.status(400).json({ message: 'At least one user ID is required' });
    }

    const notifications = userIds.map(userId => ({
      userId,
      type: type || 'general',
      title,
      message,
      link: link || ''
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({ message: `Notification sent to ${userIds.length} user(s)` });
  } catch (error) {
    next(error);
  }
};

// Helper to create notifications without API call
exports.createNotification = async (userId, type, title, message, link = '') => {
  try {
    await Notification.create({ userId, type, title, message, link });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

// Helper to notify multiple users
exports.notifyMany = async (userIds, type, title, message, link = '') => {
  try {
    const notifications = userIds.map(userId => ({
      userId, type, title, message, link
    }));
    await Notification.insertMany(notifications);
  } catch (err) {
    console.error('Failed to create notifications:', err.message);
  }
};

// @desc    Get current user's notifications
// @route   GET /api/notifications/my
exports.getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit, unreadOnly } = req.query;
    const filter = { userId: req.user._id };
    if (unreadOnly === 'true') filter.isRead = false;

    const result = await paginate(Notification, filter, {
      page,
      limit: limit || 20,
      sort: { createdAt: -1 }
    });

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.json({
      data: result.data,
      unreadCount,
      pagination: { total: result.pagination.totalItems, ...result.pagination }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
