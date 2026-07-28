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

// @desc    Get all FAQs and Guides
// @route   GET /api/support/faqs-guides
// @access  Protected (All authenticated users)
export const getFaqsAndGuides = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, title, content, type, category, created_at FROM faqs_guides ORDER BY created_at DESC'
    );
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error('Error fetching FAQs and guides:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve FAQs and guides' },
    });
  }
};

// @desc    Create a new FAQ or Guide
// @route   POST /api/support/faqs-guides
// @access  Protected (Admin / Staff)
export const createFaqOrGuide = async (req, res, next) => {
  try {
    const { title, content, type, category } = req.body;

    if (!title || !content || !type) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title, content, and type are required' },
      });
    }

    const result = await query(
      `INSERT INTO faqs_guides (title, content, type, category, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [title, content, type, category || 'general']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error creating FAQ/Guide:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create FAQ or guide' },
    });
  }
};

// @desc    Delete an FAQ or Guide
// @route   DELETE /api/support/faqs-guides/:id
// @access  Protected (Admin / Staff)
export const deleteFaqOrGuide = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleteResult = await query(
      'DELETE FROM faqs_guides WHERE id = $1 RETURNING *',
      [id]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'FAQ or guide not found' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting FAQ/Guide:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete item' },
    });
  }
};

// @desc    Update support ticket status
// @route   PATCH /api/support/tickets/:id/status
// @access  Protected (Admin / Staff)
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status value provided' },
      });
    }

    const result = await query(
      'UPDATE support_tickets SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Support ticket not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating ticket status:', err);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update ticket status' },
    });
  }
};