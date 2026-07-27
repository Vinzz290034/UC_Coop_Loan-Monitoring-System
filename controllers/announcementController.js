import { query } from '../config/db.js';

// @desc    Get all active announcements (includes joined details from users, loan_products, calendar_events)
// @route   GET /api/announcements
// @access  Protected
export const getAnnouncements = async (req, res, next) => {
  try {
    const fetchQuery = `
      SELECT 
        a.*,
        u.username AS author_username,
        lp.name AS loan_product_name,
        ce.title AS calendar_event_title,
        ce.event_date AS calendar_event_date
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN loan_products lp ON a.related_loan_product_id = lp.id
      LEFT JOIN calendar_events ce ON a.calendar_event_id = ce.id
      WHERE a.is_active = true
      ORDER BY a.created_at DESC
    `;

    const result = await query(fetchQuery);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new announcement with optional relations
// @route   POST /api/announcements
// @access  Protected (Admin / Manager)
export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, related_loan_product_id, calendar_event_id } = req.body;
    const authorId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title and content are required fields.' }
      });
    }

    const insertQuery = `
      INSERT INTO announcements (
        title, 
        content, 
        priority, 
        created_by, 
        related_loan_product_id, 
        calendar_event_id
      )
      VALUES ($1, $2, COALESCE($3, 'normal'), $4, $5, $6)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      title,
      content,
      priority,
      authorId,
      related_loan_product_id || null,
      calendar_event_id || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft-delete / Toggle announcement active status
// @route   PATCH /api/announcements/:id/status
// @access  Protected (Admin / Manager)
export const toggleAnnouncementStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updateQuery = `
      UPDATE announcements
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(updateQuery, [is_active, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found.' }
      });
    }

    res.status(200).json({
      success: true,
      message: `Announcement ${is_active ? 'activated' : 'deactivated'} successfully.`,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};