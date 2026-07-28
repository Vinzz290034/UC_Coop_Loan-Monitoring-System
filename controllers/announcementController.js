import { query } from '../config/db.js';

// @desc    Get all active announcements with joined relational details
// @route   GET /api/announcements
// @access  Protected
export const getAnnouncements = async (req, res, next) => {
  try {
    const fetchQuery = `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.priority,
        a.is_active,
        a.created_at,
        a.updated_at,
        a.created_by,
        u.username AS author_username,
        a.related_loan_product_id,
        lp.name AS related_loan_product_name,
        a.calendar_event_id,
        ce.title AS calendar_event_title,
        ce.event_date AS calendar_event_date
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN loan_products lp ON a.related_loan_product_id = lp.id
      LEFT JOIN calendar_events ce ON a.calendar_event_id = ce.id
      WHERE a.is_active = true
      ORDER BY a.created_at DESC;
    `;

    const result = await query(fetchQuery);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single announcement by ID with relational details
// @route   GET /api/announcements/:id
// @access  Protected
export const getAnnouncementById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const fetchQuery = `
      SELECT 
        a.*,
        u.username AS author_username,
        lp.name AS related_loan_product_name,
        ce.title AS calendar_event_title,
        ce.event_date AS calendar_event_date
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN loan_products lp ON a.related_loan_product_id = lp.id
      LEFT JOIN calendar_events ce ON a.calendar_event_id = ce.id
      WHERE a.id = $1;
    `;

    const result = await query(fetchQuery, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found.' },
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
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
    const { 
      title, 
      content, 
      priority, 
      related_loan_product_id, 
      calendar_event_id 
    } = req.body;
    
    // Automatically set created_by from the authenticated user context
    const authorId = req.user?.id || null;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title and content are required fields.' },
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
      RETURNING *;
    `;

    const result = await query(insertQuery, [
      title,
      content,
      priority || 'normal',
      authorId,
      related_loan_product_id || null,
      calendar_event_id || null,
    ]);

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an announcement and its relational links
// @route   PUT /api/announcements/:id
// @access  Protected (Admin / Manager)
export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      priority, 
      is_active, 
      related_loan_product_id, 
      calendar_event_id 
    } = req.body;

    const updateQuery = `
      UPDATE announcements
      SET 
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        priority = COALESCE($3, priority),
        is_active = COALESCE($4, is_active),
        related_loan_product_id = $5,
        calendar_event_id = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    const result = await query(updateQuery, [
      title,
      content,
      priority,
      is_active,
      related_loan_product_id !== undefined ? related_loan_product_id : null,
      calendar_event_id !== undefined ? calendar_event_id : null,
      id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found.' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully.',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an announcement (Hard delete)
// @route   DELETE /api/announcements/:id
// @access  Protected (Admin / Manager)
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleteQuery = `
      DELETE FROM announcements
      WHERE id = $1
      RETURNING id;
    `;

    const result = await query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found.' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully.',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
};