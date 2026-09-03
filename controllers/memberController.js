import pool, { query } from '../config/db.js';
import bcrypt from 'bcryptjs';
import { exportToExcel } from '../services/reportExporter.js';
import { generateNextMemberNo } from '../utils/memberIdGenerator.js';

// @desc    Create a new member profile
// @route   POST /api/members
// @access  Protected (Admin, Manager)
export const createMember = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, middle_name, age, email, phone, address, date_of_birth, gender, civil_status, tin, title, status, user_id, is_verified, membership_type } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name and last name are required.' }
      });
    }

    if (membership_type && !['Regular', 'Associate'].includes(membership_type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid membership type. Must be Regular or Associate.' }
      });
    }

    if (gender && !['Male', 'Female'].includes(gender)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid gender option. Must be Male or Female.' }
      });
    }

    if (civil_status && !['Single', 'Married', 'Widowed', 'Separated', 'Divorced'].includes(civil_status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid civil status option.' }
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

    let assignedUserId = user_id || null;
    let provisionedUsername = null;

    // Auto-provision user login account if no existing user_id is linked
    if (!assignedUserId) {
      const cleanFirst = first_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLast = last_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      let baseUsername = `${cleanFirst}.${cleanLast}` || `user${Date.now()}`;
      let candidateUsername = baseUsername;
      let counter = 1;

      while (true) {
        const checkUserRes = await client.query(`SELECT id FROM users WHERE username = $1`, [candidateUsername]);
        if (checkUserRes.rows.length === 0) {
          break;
        }
        candidateUsername = `${baseUsername}${counter}`;
        counter++;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('UCCoop@2026', salt);

      const createUserRes = await client.query(
        `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'member') RETURNING id`,
        [candidateUsername, passwordHash]
      );
      assignedUserId = createUserRes.rows[0].id;
      provisionedUsername = candidateUsername;
    }

    // Generate atomic sequential Member ID (YYYY-N)
    const memberNo = await generateNextMemberNo(client, new Date().getFullYear());

    // 1. Insert Member
    const insertMemberQuery = `
      INSERT INTO members (member_no, first_name, last_name, middle_name, age, email, phone, address, date_of_birth, gender, civil_status, tin, title, status, user_id, membership_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const memberResult = await client.query(insertMemberQuery, [
      memberNo,
      first_name.trim(),
      last_name.trim(),
      middle_name?.trim() || null,
      computedAge,
      email?.toLowerCase() || null,
      phone?.trim() || null,
      address?.trim() || null,
      date_of_birth || null,
      gender || null,
      civil_status || null,
      tin?.trim() || null,
      title?.trim() || null,
      status || 'active',
      assignedUserId,
      membership_type || 'Regular'
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
      data: newMember,
      provisioned_account: provisionedUsername ? {
        username: provisionedUsername,
        default_password: 'UCCoop@2026'
      } : null
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
    const { search, status, sortBy, membership_type } = req.query;

    let queryText = `
      SELECT 
        m.*, 
        u.profile_picture_url,
        COALESCE((
          SELECT sct.balance_after 
          FROM share_capital_transactions sct 
          WHERE sct.member_id = m.id AND sct.status = 'completed' 
          ORDER BY sct.transaction_date DESC LIMIT 1
        ), 0) AS share_capital_balance,
        COALESCE((
          SELECT SUM(l.principal_amount) 
          FROM loans l 
          WHERE l.member_id = m.id AND l.status IN ('disbursed', 'active')
        ), 0) AS total_loans_taken,
        COALESCE((
          SELECT COUNT(*) 
          FROM loans l 
          WHERE l.member_id = m.id AND l.status IN ('disbursed', 'active')
        ), 0) AS active_loans_count,
        COALESCE((
          SELECT json_agg(json_build_object(
            'loan_id', l.id,
            'status', l.status,
            'product_name', COALESCE(lp.name, 'N/A'),
            'principal_amount', l.principal_amount
          ) ORDER BY 
            CASE WHEN l.status IN ('disbursed', 'active') THEN 1 WHEN l.status = 'pending_approval' THEN 2 ELSE 3 END,
            l.created_at DESC)
          FROM loans l
          LEFT JOIN loan_products lp ON l.loan_product_id = lp.id
          WHERE l.member_id = m.id AND l.status IN ('disbursed', 'active', 'pending_approval', 'defaulted')
        ), '[]'::json) AS member_loans
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

    if (membership_type) {
      queryText += ` AND m.membership_type = $${paramIndex}`;
      queryParams.push(membership_type);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        COALESCE(m.member_no, '') ILIKE $${paramIndex} OR
        m.first_name ILIKE $${paramIndex} OR 
        m.last_name ILIKE $${paramIndex} OR 
        COALESCE(m.middle_name, '') ILIKE $${paramIndex} OR
        COALESCE(m.email, '') ILIKE $${paramIndex} OR
        COALESCE(m.phone, '') ILIKE $${paramIndex} OR
        COALESCE(m.gender, '') ILIKE $${paramIndex} OR
        COALESCE(m.civil_status, '') ILIKE $${paramIndex} OR
        COALESCE(m.membership_type, '') ILIKE $${paramIndex}
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
    const { member_no, first_name, last_name, middle_name, age, email, phone, address, date_of_birth, gender, civil_status, tin, title, is_verified, membership_type } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name and last name are required.' }
      });
    }

    if (membership_type && !['Regular', 'Associate'].includes(membership_type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid membership type. Must be Regular or Associate.' }
      });
    }

    if (gender && !['Male', 'Female'].includes(gender)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid gender option. Must be Male or Female.' }
      });
    }

    if (civil_status && !['Single', 'Married', 'Widowed', 'Separated', 'Divorced'].includes(civil_status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid civil status option.' }
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

    const isVerifiedVal = is_verified !== undefined ? !!is_verified : undefined;
    const memberNoVal = member_no !== undefined ? (member_no?.trim() || null) : undefined;

    let updateQuery;
    let queryParams;
    if (isVerifiedVal !== undefined) {
      updateQuery = `
        UPDATE members
        SET first_name = $1, last_name = $2, middle_name = $3, age = $4, email = $5, phone = $6, address = $7, date_of_birth = $8, gender = $9, civil_status = $10, tin = $11, title = $12, is_verified = $13,
            membership_type = COALESCE($14, membership_type),
            member_no = COALESCE($15, member_no),
            status = (CASE WHEN $13 = true AND status = 'pending' THEN 'approved' ELSE status END),
            profile_completed = (CASE WHEN $13 = true THEN true ELSE profile_completed END),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $16
        RETURNING *
      `;
      queryParams = [
        first_name.trim(),
        last_name.trim(),
        middle_name?.trim() || null,
        computedAge,
        email?.toLowerCase() || null,
        phone?.trim() || null,
        address?.trim() || null,
        date_of_birth || null,
        gender || null,
        civil_status || null,
        tin?.trim() || null,
        title?.trim() || null,
        isVerifiedVal,
        membership_type || null,
        memberNoVal,
        id
      ];
    } else {
      updateQuery = `
        UPDATE members
        SET first_name = $1, last_name = $2, middle_name = $3, age = $4, email = $5, phone = $6, address = $7, date_of_birth = $8, gender = $9, civil_status = $10, tin = $11, title = $12,
            membership_type = COALESCE($13, membership_type),
            member_no = COALESCE($14, member_no),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $15
        RETURNING *
      `;
      queryParams = [
        first_name.trim(),
        last_name.trim(),
        middle_name?.trim() || null,
        computedAge,
        email?.toLowerCase() || null,
        phone?.trim() || null,
        address?.trim() || null,
        date_of_birth || null,
        gender || null,
        civil_status || null,
        tin?.trim() || null,
        title?.trim() || null,
        membership_type || null,
        memberNoVal,
        id
      ];
    }

    const result = await query(updateQuery, queryParams);

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
        error: { message: 'Email address or Member ID is already in use by another member.' }
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

    if (!status || !['active', 'suspended', 'inactive', 'pending', 'approved', 'disapproved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid status: pending, approved, disapproved, active, suspended, or inactive.' }
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

    // 2. Update status & sync is_verified and profile_completed flags
    await client.query(
      "UPDATE members SET status = $1::text::varchar, is_verified = (CASE WHEN $1::text::varchar IN ('approved', 'active') THEN true ELSE false END), profile_completed = (CASE WHEN $1::text::varchar IN ('approved', 'active') THEN true ELSE profile_completed END), updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [status, id]
    );

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


// @desc    Permanently delete a member profile and all associated financial & ledger records
// @route   DELETE /api/members/:id
// @access  Protected (Admin)
export const deleteMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const memberCheck = await query('SELECT id, user_id, first_name, last_name FROM members WHERE id = $1', [id]);
    if (memberCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found.' }
      });
    }

    const member = memberCheck.rows[0];

    // Begin cascade deletion transaction
    await query('BEGIN');

    // 1. Delete loan payment allocations for all loans belonging to this member
    await query(`
      DELETE FROM loan_payment_allocations 
      WHERE loan_payment_id IN (
        SELECT id FROM loan_payments WHERE loan_id IN (SELECT id FROM loans WHERE member_id = $1)
      )
      OR repayment_schedule_id IN (
        SELECT id FROM repayment_schedules WHERE loan_id IN (SELECT id FROM loans WHERE member_id = $1)
      )
    `, [id]);

    // 2. Delete loan payments
    await query(`
      DELETE FROM loan_payments 
      WHERE loan_id IN (SELECT id FROM loans WHERE member_id = $1)
    `, [id]);

    // 3. Delete repayment schedules
    await query(`
      DELETE FROM repayment_schedules 
      WHERE loan_id IN (SELECT id FROM loans WHERE member_id = $1)
    `, [id]);

    // 4. Delete loans
    await query('DELETE FROM loans WHERE member_id = $1', [id]);

    // 5. Delete fixed deposits & investments
    await query('DELETE FROM fixed_deposits WHERE member_id = $1', [id]);
    await query('DELETE FROM investments WHERE member_id = $1', [id]);

    // 6. Delete share capital transactions
    await query('DELETE FROM share_capital_transactions WHERE member_id = $1', [id]);

    // 7. Delete appointments
    await query('DELETE FROM appointments WHERE member_id = $1', [id]);

    // 8. Delete member status logs
    await query('DELETE FROM member_status_logs WHERE member_id = $1', [id]);

    // 9. Delete the member record
    await query('DELETE FROM members WHERE id = $1', [id]);

    // 10. Delete associated auth user record if they have a dedicated member account
    if (member.user_id) {
      await query('DELETE FROM users WHERE id = $1 AND role = \'member\'', [member.user_id]);
    }

    await query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Member profile for ${member.first_name} ${member.last_name} and all associated financial records were permanently deleted.`
    });
  } catch (error) {
    await query('ROLLBACK');
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
    const memberCheck = await query('SELECT member_no, first_name, last_name, status, investment_goal FROM members WHERE id = $1', [id]);
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
        COALESCE((
          SELECT COUNT(*) FROM loans l 
          WHERE l.member_id = $1 
            AND l.status IN ('disbursed', 'approved', 'active', 'defaulted')
            AND COALESCE((SELECT SUM(rs.total_due - (rs.principal_paid + rs.interest_paid)) FROM repayment_schedules rs WHERE rs.loan_id = l.id), 1) > 0
        ), 0) as active_loans_count,
        COALESCE((SELECT SUM(principal_amount) FROM loans WHERE member_id = $1 AND status IN ('disbursed', 'approved', 'active', 'defaulted')), 0) as original_loan_principal,
        COALESCE((SELECT COUNT(*) FROM loans WHERE member_id = $1 AND status IN ('approved', 'disbursed', 'active', 'fully_paid', 'defaulted')), 0) as historical_loans_count,
        
        -- Counts of active loans by category
        COALESCE((
          SELECT COUNT(*) 
          FROM loans l
          JOIN loan_products lp ON l.loan_product_id = lp.id
          WHERE l.member_id = $1 
            AND l.status IN ('pending_approval', 'approved', 'disbursed', 'active', 'defaulted')
            AND LOWER(lp.name) LIKE '%regular loan%'
        ), 0) as active_regular_loans_count,
        COALESCE((
          SELECT COUNT(*) 
          FROM loans l
          JOIN loan_products lp ON l.loan_product_id = lp.id
          WHERE l.member_id = $1 
            AND l.status IN ('pending_approval', 'approved', 'disbursed', 'active', 'defaulted')
            AND (LOWER(lp.name) LIKE '%short term loan%' OR LOWER(lp.name) LIKE '%stl%')
        ), 0) as active_stl_loans_count,
        COALESCE((
          SELECT EXISTS (
            SELECT 1
            FROM loans l
            JOIN loan_products lp ON l.loan_product_id = lp.id
            WHERE l.member_id = $1 
              AND l.status IN ('pending_approval', 'approved', 'disbursed', 'active', 'defaulted')
              AND (LOWER(lp.name) LIKE '%short term loan%' OR LOWER(lp.name) LIKE '%stl%')
              AND (
                COALESCE(l.disbursed_at, l.created_at) <= NOW() - INTERVAL '30 days'
                OR EXISTS (
                  SELECT 1 FROM repayment_schedules rs 
                  WHERE rs.loan_id = l.id AND (rs.status = 'paid' OR rs.status = 'partially_paid' OR rs.principal_paid > 0)
                )
              )
          )
        ), false) as has_stl_with_1month_repayment,
        COALESCE((
          SELECT SUM(principal_amount) 
          FROM loans 
          WHERE member_id = $1 
            AND status IN ('pending_approval', 'approved', 'disbursed', 'active', 'defaulted')
        ), 0) as active_loans_principal_total,
        
        -- Remaining Outstanding Balance (total due minus paid)
        COALESCE(
          (SELECT SUM(rs.total_due - (rs.principal_paid + rs.interest_paid)) 
           FROM repayment_schedules rs 
           JOIN loans l ON rs.loan_id = l.id 
           WHERE l.member_id = $1 AND l.status IN ('disbursed', 'approved', 'active', 'defaulted')),
          0
        ) as outstanding_loan_balance,

        -- Total Repaid to Date
        COALESCE(
          (SELECT SUM(rs.principal_paid + rs.interest_paid) 
           FROM repayment_schedules rs 
           JOIN loans l ON rs.loan_id = l.id 
           WHERE l.member_id = $1),
          0
        ) as total_repaid
    `;

    const summaryResult = await query(summaryQuery, [id]);
    const metrics = summaryResult.rows[0];

    const accessCountResult = await query(
      "SELECT COUNT(*) as count FROM user_access_logs WHERE user_id = (SELECT user_id FROM members WHERE id = $1) AND (LOWER(status) = 'success' OR status = 'Active')",
      [id]
    );
    const loginCount = parseInt(accessCountResult.rows[0]?.count || '1', 10);

    res.status(200).json({
      success: true,
      data: {
        member_id: id,
        member_no: memberCheck.rows[0].member_no,
        first_name: memberCheck.rows[0].first_name,
        last_name: memberCheck.rows[0].last_name,
        full_name: `${memberCheck.rows[0].first_name} ${memberCheck.rows[0].last_name}`,
        profile_status: memberCheck.rows[0].status,
        investment_goal: parseFloat(memberCheck.rows[0].investment_goal ?? 0.00),
        login_count: loginCount,
        balances: {
          share_capital: parseFloat(metrics.share_capital_balance),
          fixed_deposits: parseFloat(metrics.fixed_deposit_balance),
          investments: parseFloat(metrics.active_investments_total),
          total_assets: parseFloat(metrics.share_capital_balance) + parseFloat(metrics.fixed_deposit_balance) + parseFloat(metrics.active_investments_total)
        },
        loans: {
          active_count: parseInt(metrics.active_loans_count, 10),
          active_regular_count: parseInt(metrics.active_regular_loans_count, 10),
          active_stl_count: parseInt(metrics.active_stl_loans_count, 10),
          has_stl_with_1month_repayment: metrics.has_stl_with_1month_repayment === true || metrics.has_stl_with_1month_repayment === 't',
          active_principal: parseFloat(metrics.active_loans_principal_total),
          historical_count: parseInt(metrics.historical_loans_count, 10),
          original_principal: parseFloat(metrics.original_loan_principal),
          outstanding_balance: parseFloat(metrics.outstanding_loan_balance),
          total_repaid: parseFloat(metrics.total_repaid || 0)
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
    const { search, status, membership_type } = req.query;

    let queryText = 'SELECT id, member_no, first_name, middle_name, last_name, age, gender, civil_status, email, phone, status, membership_type, created_at FROM members WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (membership_type) {
      queryText += ` AND membership_type = $${paramIndex}`;
      queryParams.push(membership_type);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (COALESCE(member_no, '') ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR COALESCE(middle_name, '') ILIKE $${paramIndex} OR COALESCE(email, '') ILIKE $${paramIndex} OR COALESCE(phone, '') ILIKE $${paramIndex} OR COALESCE(gender, '') ILIKE $${paramIndex} OR COALESCE(civil_status, '') ILIKE $${paramIndex} OR COALESCE(membership_type, '') ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY last_name ASC, first_name ASC';
    const result = await query(queryText, queryParams);

    const formattedMembers = result.rows.map(row => ({
      ...row,
      member_id_display: row.member_no || row.id,
      full_name: `${row.last_name}, ${row.first_name}${row.middle_name ? ' ' + row.middle_name : ''}`,
      membership_type: row.membership_type || 'Regular',
      age: row.age != null ? row.age : 'N/A',
      gender: row.gender || 'N/A',
      civil_status: row.civil_status || 'N/A',
      phone: row.phone || 'N/A',
      email: row.email || 'N/A',
      created_at: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : 'N/A'
    }));

    const columns = [
      { header: 'Member ID', key: 'member_id_display', width: 15 },
      { header: 'Full Name', key: 'full_name', width: 28 },
      { header: 'Membership Type', key: 'membership_type', width: 18 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Sex / Gender', key: 'gender', width: 15 },
      { header: 'Civil Status', key: 'civil_status', width: 15 },
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

// @desc    Update investment milestone goal for a member
// @route   PATCH /api/members/:id/milestone-goal
// @access  Protected (Admin, Manager, Member-Owner)
export const updateMemberGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { investment_goal, target_amount } = req.body;
    const rawGoal = investment_goal !== undefined ? investment_goal : target_amount;

    if (rawGoal === undefined || isNaN(parseFloat(rawGoal))) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid investment goal amount.' }
      });
    }

    const goalAmount = parseFloat(rawGoal);
    if (goalAmount < 5000 || goalAmount > 150000) {
      return res.status(400).json({
        success: false,
        error: { message: 'Investment milestone goal must be between ₱5,000 and ₱150,000.' }
      });
    }

    // RBAC Check: Members can only update their own goal
    if (req.user.role === 'member') {
      const ownCheck = await query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
      if (ownCheck.rowCount === 0 || ownCheck.rows[0].id !== id) {
        return res.status(403).json({
          success: false,
          error: { message: 'You are not authorized to update this investment goal.' }
        });
      }
    }

    const result = await query(
      'UPDATE members SET investment_goal = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING investment_goal',
      [parseFloat(investment_goal), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found.' }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Investment milestone goal updated successfully.',
      data: {
        investment_goal: parseFloat(result.rows[0].investment_goal)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete member profile with deferred personal information (Step 2 Onboarding)
// @route   POST /api/members/complete-profile
// @access  Protected (Member)
export const completeMemberProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { gender, civil_status, address, tin, title } = req.body;

    if (!gender || !civil_status || !address) {
      return res.status(400).json({
        success: false,
        error: { message: 'Gender, civil status, and complete address are required.' }
      });
    }

    if (!['Male', 'Female'].includes(gender)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Gender must be Male or Female.' }
      });
    }

    if (!['Single', 'Married', 'Widowed', 'Separated', 'Divorced'].includes(civil_status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid civil status.' }
      });
    }

    const cleanAddress = address.trim();
    const cleanTin = tin ? tin.trim() : null;
    const cleanTitle = title ? title.trim() : null;

    // Update member profile
    const updateRes = await query(
      `UPDATE members
       SET gender = $1,
           civil_status = $2,
           address = $3,
           tin = $4,
           title = $5,
           profile_completed = true,
           status = 'pending',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6
       RETURNING *`,
      [gender, civil_status, cleanAddress, cleanTin, cleanTitle, userId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found for this account.' }
      });
    }

    const member = updateRes.rows[0];

    // Notify Admin and Staff about new profile submission
    try {
      const notifTitle = 'New Profile Submitted for Verification';
      const notifMsg = `Member ${member.first_name} ${member.last_name} has completed their personal information and is awaiting approval.`;
      await query(
        `INSERT INTO notifications (role_target, type, title, message, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin', 'profile_review', notifTitle, notifMsg, member.id]
      );
      await query(
        `INSERT INTO notifications (role_target, type, title, message, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        ['staff', 'profile_review', notifTitle, notifMsg, member.id]
      );
    } catch (notifErr) {
      console.error('Failed to dispatch admin/staff notification for profile completion:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Your profile has been submitted successfully. Your information is currently under review. Approval typically takes 24–48 hours.',
      data: member
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin & Staff review and approval/disapproval of member profile
// @route   PATCH /api/members/:id/approval
// @access  Protected (Admin, Staff)
export const reviewMemberProfile = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status || !['approved', 'disapproved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Status must be either approved or disapproved.' }
      });
    }

    await client.query('BEGIN');

    const memberRes = await client.query('SELECT * FROM members WHERE id = $1 FOR UPDATE', [id]);
    if (memberRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { message: 'Member profile not found.' }
      });
    }

    const member = memberRes.rows[0];
    const targetStatus = status === 'approved' ? 'approved' : 'disapproved';

    // Update status and mark profile_completed = true if approved
    const updateRes = await client.query(
      `UPDATE members SET status = $1::text::varchar, profile_completed = (CASE WHEN $1::text::varchar = 'approved' THEN true ELSE profile_completed END), updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [targetStatus, id]
    );

    // Audit log
    await client.query(
      `INSERT INTO member_status_logs (member_id, previous_status, new_status, changed_by, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, member.status, targetStatus, req.user.id, remarks || null]
    );

    // Notify Member
    if (member.user_id) {
      const notifTitle = targetStatus === 'approved' ? 'Account Profile Approved' : 'Profile Submission Decision';
      const notifMsg = targetStatus === 'approved'
        ? 'Your profile information has been approved. You now have full access to loan and investment services.'
        : `Your profile submission requires revisions. ${remarks ? `Remarks: ${remarks}` : 'Please contact support or update your information.'}`;

      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [member.user_id, 'profile_decision', notifTitle, notifMsg, member.id]
      );
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Member status updated to ${targetStatus}.`,
      data: updateRes.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};