import pool, { query } from '../config/db.js';
import { exportToExcel } from '../services/reportExporter.js'; // Ensure this line is present

// @desc    Create a new member profile
// @route   POST /api/members
// @access  Protected (Admin, Manager)
export const createMember = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, middle_name, age, email, phone, address, date_of_birth, status, user_id } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name and last name are required.' }
      });
    }

    let computedAge = age ? parseInt(age, 10) : null;
    if (!computedAge && date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      let calculated = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculated--;
      }
      if (!isNaN(calculated) && calculated >= 0) {
        computedAge = calculated;
      }
    }

    // Start Transaction
    await client.query('BEGIN');

    // 1. Insert Member
    const insertMemberQuery = `
      INSERT INTO members (first_name, last_name, middle_name, age, email, phone, address, date_of_birth, status, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const memberResult = await client.query(insertMemberQuery, [
      first_name.trim(),
      last_name.trim(),
      middle_name?.trim() || null,
      computedAge,
      email?.toLowerCase() || null,
      phone?.trim() || null,
      address?.trim() || null,
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

// @desc    Get all member profiles (with filtering, search, & sorting)
// @route   GET /api/members
// @access  Protected (Admin, Manager)
export const getAllMembers = async (req, res, next) => {
  try {
    const { search, status, sortBy } = req.query;

    let queryText = `
      SELECT m.*, u.profile_picture_url
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND m.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        m.first_name ILIKE $${paramIndex} OR 
        m.last_name ILIKE $${paramIndex} OR 
        COALESCE(m.middle_name, '') ILIKE $${paramIndex} OR
        COALESCE(m.email, '') ILIKE $${paramIndex} OR
        COALESCE(m.phone, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Dynamic sorting
    switch (sortBy) {
      case 'name_desc':
      case 'name_z_a':
        queryText += ' ORDER BY m.last_name DESC, m.first_name DESC';
        break;
      case 'age_asc':
        queryText += ' ORDER BY COALESCE(m.age, 999) ASC, m.last_name ASC';
        break;
      case 'age_desc':
        queryText += ' ORDER BY COALESCE(m.age, 0) DESC, m.last_name ASC';
        break;
      case 'created_at_asc':
      case 'oldest':
        queryText += ' ORDER BY m.created_at ASC';
        break;
      case 'created_at_desc':
      case 'newest':
        queryText += ' ORDER BY m.created_at DESC';
        break;
      case 'status':
        queryText += " ORDER BY CASE WHEN m.status = 'active' THEN 1 WHEN m.status = 'suspended' THEN 2 ELSE 3 END, m.last_name ASC";
        break;
      case 'updated_at_desc':
      case 'updated':
        queryText += ' ORDER BY m.updated_at DESC';
        break;
      case 'name_asc':
      case 'name_a_z':
      default:
        queryText += ' ORDER BY m.last_name ASC, m.first_name ASC';
        break;
    }

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
    const memberResult = await query(
      `SELECT m.*, u.profile_picture_url 
       FROM members m 
       LEFT JOIN users u ON m.user_id = u.id 
       WHERE m.id = $1`,
      [id]
    );
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
    const { first_name, last_name, middle_name, age, email, phone, address, date_of_birth } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name and last name are required.' }
      });
    }

    let computedAge = age ? parseInt(age, 10) : null;
    if (!computedAge && date_of_birth) {
      const birthDate = new Date(date_of_birth);
      const today = new Date();
      let calculated = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculated--;
      }
      if (!isNaN(calculated) && calculated >= 0) {
        computedAge = calculated;
      }
    }

    const updateQuery = `
      UPDATE members
      SET first_name = $1, last_name = $2, middle_name = $3, age = $4, email = $5, phone = $6, address = $7, date_of_birth = $8, updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `;

    const result = await query(updateQuery, [
      first_name.trim(),
      last_name.trim(),
      middle_name?.trim() || null,
      computedAge,
      email?.toLowerCase() || null,
      phone?.trim() || null,
      address?.trim() || null,
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

    // If status hasn't changed, return early
    if (previousStatus === status) {
      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        message: `Member status is already ${status}.`
      });
    }

    // 2. Update status
    await client.query('UPDATE members SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);

    // 3. Log status change
    await client.query(
      `INSERT INTO member_status_logs (member_id, previous_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, previousStatus, status, req.user.id, remarks || null]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Member status successfully updated from ${previousStatus} to ${status}.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};


// @desc    Delete a member profile (Hard delete for clean profiles only)
// @route   DELETE /api/members/:id
// @access  Protected (Admin)
export const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const memberCheck = await query('SELECT first_name, last_name FROM members WHERE id = $1', [id]);
    if (memberCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found.' }
      });
    }

    const ledgerCheck = await query(`
      SELECT 
        (SELECT COUNT(*) FROM loans WHERE member_id = $1) as loan_count,
        (SELECT COUNT(*) FROM share_capital_transactions WHERE member_id = $1) as transaction_count
    `, [id]);

    const { loan_count, transaction_count } = ledgerCheck.rows[0];

    if (parseInt(loan_count, 10) > 0 || parseInt(transaction_count, 10) > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Cannot delete member. This profile has historical financial ledger records or loans attached to it. Please update their status to "inactive" instead.' 
        }
      });
    }

    await query('DELETE FROM member_status_logs WHERE member_id = $1', [id]);
    await query('DELETE FROM members WHERE id = $1', [id]);

    res.status(200).json({
      success: true,
      message: `Member profile for ${memberCheck.rows[0].first_name} ${memberCheck.rows[0].last_name} was permanently removed from the system.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complete real-time financial dashboard summary for a single member
// @route   GET /api/members/:id/dashboard-summary
// @access  Protected (Admin, Manager, Member-Owner)
export const getMemberDashboardSummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    // RBAC Check: Members can only view their own dashboard summary
    if (req.user.role === 'member') {
      const ownCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (ownCheck.rowCount === 0 || ownCheck.rows[0].id !== id) {
        return res.status(403).json({
          success: false,
          error: { message: 'You are not authorized to view this financial summary.' }
        });
      }
    }

    // Verify member exists first
    const memberCheck = await query('SELECT first_name, last_name, status FROM members WHERE id = $1', [id]);
    if (memberCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found.' }
      });
    }

    // Run parallel summary aggregations across financial ledgers
    const summaryQuery = `
      SELECT
        -- Share Capital Balance (latest completed balance)
        COALESCE((SELECT balance_after FROM share_capital_transactions WHERE member_id = $1 AND status = 'completed' ORDER BY transaction_date DESC LIMIT 1), 0) as share_capital_balance,
        
        -- Fixed Deposit Balance
        COALESCE((SELECT SUM(principal_amount) FROM fixed_deposits WHERE member_id = $1 AND status = 'active'), 0) as fixed_deposit_balance,
        
        -- Total Investments Placement
        COALESCE((SELECT SUM(current_balance) FROM investments WHERE member_id = $1 AND status = 'active'), 0) as active_investments_total,
        
        -- Outstanding Active Loans Summary
        COALESCE((SELECT COUNT(*) FROM loans WHERE member_id = $1 AND status = 'disbursed'), 0) as active_loans_count,
        COALESCE((SELECT SUM(principal_amount) FROM loans WHERE member_id = $1 AND status = 'disbursed'), 0) as original_loan_principal,
        
        -- Remaining Outstanding Principal
        COALESCE(
          (SELECT SUM(l.principal_amount) FROM loans l WHERE l.member_id = $1 AND l.status = 'disbursed') - 
          (SELECT COALESCE(SUM(rs.principal_paid), 0) FROM repayment_schedules rs JOIN loans l ON rs.loan_id = l.id WHERE l.member_id = $1 AND l.status = 'disbursed'),
          0
        ) as outstanding_loan_balance
    `;

    const summaryResult = await query(summaryQuery, [id]);
    const metrics = summaryResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        member_id: id,
        full_name: `${memberCheck.rows[0].first_name} ${memberCheck.rows[0].last_name}`,
        profile_status: memberCheck.rows[0].status,
        balances: {
          share_capital: parseFloat(metrics.share_capital_balance),
          fixed_deposits: parseFloat(metrics.fixed_deposit_balance),
          investments: parseFloat(metrics.active_investments_total),
          total_assets: parseFloat(metrics.share_capital_balance) + parseFloat(metrics.fixed_deposit_balance) + parseFloat(metrics.active_investments_total)
        },
        loans: {
          active_count: parseInt(metrics.active_loans_count, 10),
          original_principal: parseFloat(metrics.original_loan_principal),
          outstanding_balance: parseFloat(metrics.outstanding_loan_balance)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export filtered/searched member directory list straight to Excel sheet
// @route   GET /api/members/export/excel
// @access  Protected (Admin, Manager)
export const exportMembersReport = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    let queryText = 'SELECT id, first_name, middle_name, last_name, age, email, phone, status, created_at FROM members WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR COALESCE(middle_name, '') ILIKE $${paramIndex} OR COALESCE(email, '') ILIKE $${paramIndex} OR COALESCE(phone, '') ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY last_name ASC, first_name ASC';
    const result = await query(queryText, queryParams);

    const formattedMembers = result.rows.map(row => ({
      ...row,
      full_name: `${row.last_name}, ${row.first_name}${row.middle_name ? ' ' + row.middle_name : ''}`,
      age: row.age != null ? row.age : 'N/A',
      phone: row.phone || 'N/A',
      email: row.email || 'N/A',
      created_at: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'N/A'
    }));

    const columns = [
      { header: 'Member ID', key: 'id', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 28 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Mobile/Contact Number', key: 'phone', width: 22 },
      { header: 'Email Address', key: 'email', width: 25 },
      { header: 'Account Status', key: 'status', width: 15 },
      { header: 'Registration Date', key: 'created_at', width: 18 }
    ];

    return await exportToExcel(
      res,
      'Cooperative_Members_Directory',
      'Members_List',
      columns,
      formattedMembers
    );
  } catch (error) {
    next(error);
  }
};