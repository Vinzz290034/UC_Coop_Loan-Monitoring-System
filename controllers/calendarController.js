import { query } from '../config/db.js';

// @desc    Get all calendar events, announcements, and payment deadlines
// @route   GET /api/calendar
// @access  Protected
export const getCalendarEvents = async (req, res, next) => {
  try {
    // 1. Fetch system-wide announcements, holidays, and office duty events
    const systemEventsQuery = `
      SELECT ce.*, u.username as creator_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by = u.id
      ORDER BY ce.event_date ASC
    `;
    const systemEventsResult = await query(systemEventsQuery);
    
    // Map system events into standard format
    const events = systemEventsResult.rows.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      type: event.type,
      status: event.status,
      creator_name: event.creator_name,
      is_system: true
    }));

    // 2. Fetch payment and dues deadlines based on role
    if (req.user.role === 'member') {
      // Find member profile first
      const memberCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (memberCheck.rowCount > 0) {
        const memberId = memberCheck.rows[0].id;
        
        // Fetch unpaid repayment schedules for this member
        const memberDeadlinesQuery = `
          SELECT 
            rs.id,
            rs.installment_number,
            rs.due_date,
            rs.total_due,
            rs.principal_paid,
            rs.interest_paid,
            rs.status,
            lp.name as product_name
          FROM repayment_schedules rs
          JOIN loans l ON rs.loan_id = l.id
          JOIN loan_products lp ON l.loan_product_id = lp.id
          WHERE l.member_id = $1
            AND rs.status IN ('unpaid', 'partially_paid')
            AND l.status = 'disbursed'
        `;
        const memberDeadlinesResult = await query(memberDeadlinesQuery, [memberId]);
        
        memberDeadlinesResult.rows.forEach(sched => {
          const remaining = parseFloat(sched.total_due) - (parseFloat(sched.principal_paid) + parseFloat(sched.interest_paid));
          events.push({
            id: sched.id,
            title: `Payment Due: ${sched.product_name} (#${sched.installment_number})`,
            description: `Remaining: ₱${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Total: ₱${parseFloat(sched.total_due).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            event_date: sched.due_date,
            type: 'payment_deadline',
            status: sched.status,
            is_system: false
          });
        });
      }
    } else {
      // Admin/Manager view: Retrieve all unpaid deadlines across all disbursed loans
      const allDeadlinesQuery = `
        SELECT 
          rs.id,
          rs.installment_number,
          rs.due_date,
          rs.total_due,
          rs.principal_paid,
          rs.interest_paid,
          rs.status,
          lp.name as product_name,
          m.first_name,
          m.last_name
        FROM repayment_schedules rs
        JOIN loans l ON rs.loan_id = l.id
        JOIN loan_products lp ON l.loan_product_id = lp.id
        JOIN members m ON l.member_id = m.id
        WHERE rs.status IN ('unpaid', 'partially_paid')
          AND l.status = 'disbursed'
      `;
      const allDeadlinesResult = await query(allDeadlinesQuery);
      
      allDeadlinesResult.rows.forEach(sched => {
        const remaining = parseFloat(sched.total_due) - (parseFloat(sched.principal_paid) + parseFloat(sched.interest_paid));
        events.push({
          id: sched.id,
          title: `Due: ${sched.first_name} ${sched.last_name} - ${sched.product_name} (#${sched.installment_number})`,
          description: `Total Due: ₱${parseFloat(sched.total_due).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Remaining: ₱${remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          event_date: sched.due_date,
          type: 'payment_deadline',
          status: sched.status,
          is_system: false
        });
      });
    }

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a calendar event/announcement
// @route   POST /api/calendar
// @access  Protected (Admin, Manager)
export const createCalendarEvent = async (req, res, next) => {
  try {
    const { title, description, event_date, type, status } = req.body;

    if (!title || !event_date || !type) {
      return res.status(400).json({
        success: false,
        error: { message: 'Title, date, and type are required fields.' }
      });
    }

    const insertQuery = `
      INSERT INTO calendar_events (title, description, event_date, type, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      title,
      description || null,
      event_date,
      type,
      status || 'open',
      req.user.id
    ];

    const result = await query(insertQuery, params);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a calendar event/announcement
// @route   PUT /api/calendar/:id
// @access  Protected (Admin, Manager)
export const updateCalendarEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, event_date, type, status } = req.body;

    // Check if event exists
    const eventCheck = await query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    if (eventCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calendar event not found.' }
      });
    }

    const updateQuery = `
      UPDATE calendar_events
      SET title = $1, description = $2, event_date = $3, type = $4, status = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const params = [
      title || eventCheck.rows[0].title,
      description !== undefined ? description : eventCheck.rows[0].description,
      event_date || eventCheck.rows[0].event_date,
      type || eventCheck.rows[0].type,
      status || eventCheck.rows[0].status,
      id
    ];

    const result = await query(updateQuery, params);

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a calendar event/announcement
// @route   DELETE /api/calendar/:id
// @access  Protected (Admin, Manager)
export const deleteCalendarEvent = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const eventCheck = await query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    if (eventCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Calendar event not found.' }
      });
    }

    await query('DELETE FROM calendar_events WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: 'Calendar event deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
