import { query } from '../config/db.js';

// @desc    Submit a support ticket to administrative staff
// @route   POST /api/support/contact
// @access  Protected
export const contactSupportDesk = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subject, message, category } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: { message: 'Subject and message are required fields.' }
      });
    }

    const insertTicket = `
      INSERT INTO support_tickets (user_id, subject, message, category, status)
      VALUES ($1, $2, $3, COALESCE($4, 'general'), 'open')
      RETURNING *
    `;

    const result = await query(insertTicket, [
      userId,
      subject,
      message,
      category
    ]);

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tickets for logged-in user or all tickets for admin/manager
// @route   GET /api/support/tickets
// @access  Protected
export const getSupportTickets = async (req, res, next) => {
  try {
    let ticketsQuery = '';
    const params = [];

    if (req.user.role === 'member') {
      ticketsQuery = `
        SELECT * FROM support_tickets 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      params.push(req.user.id);
    } else {
      // Admin/Manager view includes user details
      ticketsQuery = `
        SELECT st.*, m.email, m.first_name, m.last_name
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
        LEFT JOIN members m ON u.id = m.user_id
        ORDER BY st.created_at DESC
      `;
    }

    const result = await query(ticketsQuery, params);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};