import { query } from '../config/db.js';

// @desc    Get notifications for the current user (role-based visibility)
// @route   GET /api/notifications
// @access  Protected (All roles)
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { unread_only } = req.query;

    // Notifications visible to this user:
    // 1. Directly targeted (user_id = current user)
    // 2. Role-targeted (role_target = user's role, user_id IS NULL)
    // 3. Broadcast (both user_id and role_target are NULL)
    let queryText = `
      SELECT id, user_id, role_target, type, title, message, reference_id, is_read, created_at
      FROM notifications
      WHERE (
        user_id = $1
        OR (user_id IS NULL AND role_target = $2)
        OR (user_id IS NULL AND role_target IS NULL)
      )
    `;
    const queryParams = [userId, userRole];
    let paramIndex = 3;

    if (unread_only === 'true') {
      queryText += ` AND is_read = false`;
    }

    queryText += ' ORDER BY created_at DESC LIMIT 100';

    const result = await query(queryText, queryParams);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count for badge display
// @route   GET /api/notifications/unread-count
// @access  Protected (All roles)
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE (
         user_id = $1
         OR (user_id IS NULL AND role_target = $2)
         OR (user_id IS NULL AND role_target IS NULL)
       )
       AND is_read = false`,
      [userId, userRole]
    );

    res.status(200).json({
      success: true,
      count: parseInt(result.rows[0].count, 10)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Protected (All roles)
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING id, is_read`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found.' }
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all visible notifications as read
// @route   PUT /api/notifications/read-all
// @access  Protected (All roles)
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await query(
      `UPDATE notifications SET is_read = true
       WHERE is_read = false
       AND (
         user_id = $1
         OR (user_id IS NULL AND role_target = $2)
         OR (user_id IS NULL AND role_target IS NULL)
       )`,
      [userId, userRole]
    );

    res.status(200).json({
      success: true,
      message: `${result.rowCount} notification(s) marked as read.`
    });
  } catch (error) {
    next(error);
  }
};
