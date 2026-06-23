import pool, { query } from '../config/db.js';

// @desc    Create a new member profile
// @route   POST /api/members
// @access  Protected (Admin, Manager)
export const createMember = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, middle_name, email, phone, address, date_of_birth, status, user_id } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name and last name are required.' }
      });
    }

    // Start Transaction
    await client.query('BEGIN');

    // 1. Insert Member
    const insertMemberQuery = `
      INSERT INTO members (first_name, last_name, middle_name, email, phone, address, date_of_birth, status, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const memberResult = await client.query(insertMemberQuery, [
      first_name,
      last_name,
      middle_name || null,
      email || null,
      phone || null,
      address || null,
      date_of_birth || null,
      status || 'active',
      user_id || null
    ]);

    const newMember = memberResult.rows[0];

    // 2. Log initial status
    const insertLogQuery = `
      INSERT INTO member_status_logs (member_id, previous_status, new_status, changed_by, remarks)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(insertLogQuery, [
      newMember.id,
      null,
      newMember.status,
      req.user.id,
      'Member profile created.'
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newMember
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // Handle unique constraint violation on email
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: { message: 'A member with this email or user link already exists.' }
      });
    }
    next(error);
  } finally {
    client.release();
  }
};

// @desc    Get all member profiles (with filtering & search)
// @route   GET /api/members
// @access  Protected (Admin, Manager)
export const getAllMembers = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let queryText = 'SELECT * FROM members WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex} OR 
        COALESCE(email, '') ILIKE $${paramIndex} OR
        COALESCE(phone, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY last_name ASC, first_name ASC';

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

// @desc    Get single member profile by ID (including status history logs)
// @route   GET /api/members/:id
// @access  Protected (Admin, Manager, Member-Owner)
export const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // RBAC check: Members can only see their own profile
    if (req.user.role === 'member') {
      const ownMemberCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (ownMemberCheck.rowCount === 0 || ownMemberCheck.rows[0].id !== id) {
        return res.status(403).json({
          success: false,
          error: { message: 'You are not authorized to view this profile.' }
        });
      }
    }

    // Fetch member
    const memberResult = await query('SELECT * FROM members WHERE id = $1', [id]);
    if (memberResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found.' }
      });
    }

    const member = memberResult.rows[0];

    // Fetch status change logs (with names of users who made the changes)
    const logsResult = await query(
      `SELECT l.*, u.username as changed_by_username 
       FROM member_status_logs l
       LEFT JOIN users u ON l.changed_by = u.id
       WHERE l.member_id = $1 
       ORDER BY l.changed_at DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...member,
        status_history: logsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update member profile details
// @route   PUT /api/members/:id
// @access  Protected (Admin, Manager)
export const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, middle_name, email, phone, address, date_of_birth } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name and last name are required.' }
      });
    }

    const updateQuery = `
      UPDATE members
      SET first_name = $1, last_name = $2, middle_name = $3, email = $4, phone = $5, address = $6, date_of_birth = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const result = await query(updateQuery, [
      first_name,
      last_name,
      middle_name || null,
      email || null,
      phone || null,
      address || null,
      date_of_birth || null,
      id
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found.' }
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: { message: 'Email address is already in use by another member.' }
      });
    }
    next(error);
  }
};

// @desc    Update member status & log the change for audit (Records Maintenance Engine)
// @route   PATCH /api/members/:id/status
// @access  Protected (Admin, Manager)
export const updateMemberStatus = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid status: active, suspended, or inactive.' }
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // 1. Fetch current status
    const currentMemberResult = await client.query('SELECT status FROM members WHERE id = $1 FOR UPDATE', [id]);
    if (currentMemberResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found.' }
      });
    }

    const previousStatus = currentMemberResult.rows[0].status;

    // Check if status is actually changing
    if (previousStatus === status) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: { message: `Member is already in ${status} status.` }
      });
    }

    // 2. Update Member status
    const updateStatusQuery = `
      UPDATE members
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const updatedMemberResult = await client.query(updateStatusQuery, [status, id]);

    // 3. Create Status Audit Log
    const insertLogQuery = `
      INSERT INTO member_status_logs (member_id, previous_status, new_status, changed_by, remarks)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await client.query(insertLogQuery, [
      id,
      previousStatus,
      status,
      req.user.id,
      remarks || `Status updated from ${previousStatus} to ${status}.`
    ]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: updatedMemberResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
