import { query } from '../config/db.js';

// Helper to automatically generate upcoming payment reminder notifications for members
const generateUpcomingPaymentReminders = async (user) => {
  try {
    if (user.role !== 'member' || !user.profile?.id) return;
    
    // Find unpaid schedules due within the next 3 days
    const upcomingSchedules = await query(
      `SELECT rs.id, rs.installment_number, rs.due_date, rs.total_due, rs.loan_id, lp.name as product_name
       FROM repayment_schedules rs
       JOIN loans l ON rs.loan_id = l.id
       JOIN loan_products lp ON l.loan_product_id = lp.id
       WHERE l.member_id = $1
         AND rs.status != 'paid'
         AND l.status = 'disbursed'
         AND rs.due_date >= CURRENT_DATE
         AND rs.due_date <= CURRENT_DATE + INTERVAL '3 days'`,
      [user.profile.id]
    );

    for (const schedule of upcomingSchedules.rows) {
      // Check if a reminder notification already exists for this schedule
      const existingNotif = await query(
        `SELECT id FROM notifications 
         WHERE user_id = $1 
           AND type = 'loan_due_reminder' 
           AND reference_id = $2`,
        [user.id, String(schedule.id)]
      );

      if (existingNotif.rowCount === 0) {
        const formattedDate = new Date(schedule.due_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const formattedAmount = parseFloat(schedule.total_due).toLocaleString('en-US', {
          style: 'currency',
          currency: 'PHP'
        });

        await query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id)
           VALUES ($1, $2, $3, 'loan_due_reminder', $4)`,
          [
            user.id,
            'Loan Payment Due Soon',
            `Your ${schedule.product_name} installment #${schedule.installment_number} of ${formattedAmount} is due on ${formattedDate}. Please settle your balance.`,
            String(schedule.id)
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error generating upcoming payment reminders:', error.message);
  }
};

// @desc    Get notifications for the current user (role-based visibility)
// @route   GET /api/notifications
// @access  Protected (All roles)
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { unread_only } = req.query;

    // Reactively generate upcoming reminders for member users
    if (userRole === 'member') {
      await generateUpcomingPaymentReminders(req.user);
    }

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

    // Reactively generate upcoming reminders for member users
    if (userRole === 'member') {
      await generateUpcomingPaymentReminders(req.user);
    }

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
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only allow marking a notification as read if it belongs to the user,
    // is role-targeted to their role, or is a broadcast notification.
    // This prevents IDOR (any user marking another user's notification).
    const result = await query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1
         AND (
           user_id = $2
           OR (user_id IS NULL AND role_target = $3)
           OR (user_id IS NULL AND role_target IS NULL)
         )
       RETURNING id, is_read`,
      [id, userId, userRole]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found or you do not have permission to update it.' }
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
