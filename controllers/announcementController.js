import { query } from '../config/db.js';

// @desc    Get all active announcements
// @route   GET /api/announcements
// @access  Protected
export const getAnnouncements = async (req, res, next) => {
  try {
    const fetchQuery = `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.image_url,
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

// @desc    Get single announcement by ID
// @route   GET /api/announcements/:id
// @access  Protected
export const getAnnouncementById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid announcement ID format.' },
      });
    }

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

    const result = await query(fetchQuery, [numericId]);

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

// @desc    Create a new announcement with optional image
// @route   POST /api/announcements
// @access  Protected (Admin / Staff)
export const createAnnouncement = async (req, res, next) => {
  try {
    const { 
      title, 
      content, 
      priority, 
      related_loan_product_id, 
      calendar_event_id 
    } = req.body;

    // Extract image URL from uploaded file or body parameter
    const imageUrl = req.file ? `/uploads/avatars/${req.file.filename}` : (req.body.image_url || null);
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
        image_url,
        priority, 
        created_by, 
        related_loan_product_id, 
        calendar_event_id
      )
      VALUES ($1, $2, $3, COALESCE($4, 'normal'), $5, $6, $7)
      RETURNING *;
    `;

    const parsedCalendarEventId = calendar_event_id && typeof calendar_event_id === 'string' && calendar_event_id.trim() !== '' 
      ? calendar_event_id.trim() 
      : null;

    const result = await query(insertQuery, [
      title,
      content,
      imageUrl,
      priority || 'normal',
      authorId,
      related_loan_product_id || null,
      parsedCalendarEventId,
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

// @desc    Update announcement details / image
// @route   PUT /api/announcements/:id
// @access  Protected (Admin / Staff)
export const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid announcement ID format.' },
      });
    }

    const { 
      title, 
      content, 
      priority, 
      is_active, 
      related_loan_product_id, 
      calendar_event_id 
    } = req.body;

    // Determine image URL state safely for updates
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/avatars/${req.file.filename}`;
    } else if (req.body.image_url !== undefined) {
      imageUrl = req.body.image_url;
    }

    // Convert string booleans from multipart form data
    let parsedIsActive = is_active;
    if (typeof is_active === 'string') {
      parsedIsActive = is_active.toLowerCase() === 'true';
    }

    const updateQuery = `
      UPDATE announcements
      SET 
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        image_url = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE image_url END,
        priority = COALESCE($4, priority),
        is_active = COALESCE($5, is_active),
        related_loan_product_id = COALESCE($6, related_loan_product_id),
        calendar_event_id = COALESCE($7, calendar_event_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *;
    `;

    const parsedCalendarEventId = calendar_event_id && typeof calendar_event_id === 'string' && calendar_event_id.trim() !== ''
      ? calendar_event_id.trim()
      : null;

    const result = await query(updateQuery, [
      title || null,
      content || null,
      imageUrl,
      priority || null,
      parsedIsActive !== undefined ? parsedIsActive : null,
      related_loan_product_id || null,
      parsedCalendarEventId,
      numericId,
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

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Protected (Admin / Staff)
export const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid announcement ID format.' },
      });
    }

    const deleteQuery = `
      DELETE FROM announcements
      WHERE id = $1
      RETURNING id;
    `;

    const result = await query(deleteQuery, [numericId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Announcement not found.' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Announcement deleted successfully.',
      data: { id: numericId },
    });
  } catch (error) {
    next(error);
  }
};