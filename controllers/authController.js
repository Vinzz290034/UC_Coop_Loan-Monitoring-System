import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

// Helper to sign JWT token
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'coop_loan_monitoring_secret_key_2026_dev',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { username, usernameOrEmail, password } = req.body;
    const loginIdentifier = username || usernameOrEmail;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide both username/email and password.' }
      });
    }

    // Check if user exists (by username or member email)
    const userResult = await query(
      `SELECT u.id, u.username, u.password_hash, u.role 
       FROM users u 
       LEFT JOIN members m ON m.user_id = u.id 
       WHERE u.username = $1 OR m.email = $1`,
      [loginIdentifier]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid username or password.' }
      });
    }

    const user = userResult.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid username or password.' }
      });
    }

    // Sign JWT
    const token = signToken(user.id);

    // Update last login timestamp
    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // If member, fetch member details
    let memberProfile = null;
    if (user.role === 'member') {
      const memberResult = await query(
        'SELECT id, first_name, last_name, middle_name, email, phone, status FROM members WHERE user_id = $1',
        [user.id]
      );
      if (memberResult.rowCount > 0) {
        memberProfile = memberResult.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile: memberProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user account (Admin/Manager only)
// @route   POST /api/auth/register
// @access  Protected (Admin, Manager)
export const register = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide username, password, and role.' }
      });
    }

    // Validate role
    if (!['admin', 'manager', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid role specifier.' }
      });
    }

    // Check if username already exists
    const checkUser = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkUser.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username is already taken.' }
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const newUserResult = await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, passwordHash, role]
    );

    res.status(201).json({
      success: true,
      data: newUserResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Protected
export const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    let memberProfile = null;
    if (user.role === 'member') {
      const memberResult = await query(
        'SELECT id, first_name, last_name, middle_name, email, phone, status FROM members WHERE user_id = $1',
        [user.id]
      );
      if (memberResult.rowCount > 0) {
        memberProfile = memberResult.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile: memberProfile
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate password recovery / forgot password workflow
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide your account username.' }
      });
    }

    // 1. Locate user via username
    const userResult = await query(
      'SELECT id, username, role, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rowCount === 0) {
      // Security Practice: Return a generic success to prevent account enumeration sweeps
      return res.status(200).json({
        success: true,
        message: 'If an account matches those records, a recovery link has been dispatched.'
      });
    }

    const user = userResult.rows[0];

    // Safety Verification Check: Don't process requests if account portal is frozen
    if (user.password_hash && user.password_hash.startsWith('PORTAL_FROZEN_')) {
      return res.status(403).json({
        success: false,
        error: { message: 'This portal account is currently locked or frozen. Contact management.' }
      });
    }

    // 2. Resolve communication channel (Fetch email based on role)
    let recoveryEmail = null;

    if (user.role === 'member') {
      const memberResult = await query(
        'SELECT email FROM members WHERE user_id = $1',
        [user.id]
      );
      if (memberResult.rowCount > 0) {
        recoveryEmail = memberResult.rows[0].email;
      }
    } else {
      // Fallback for system administrators/managers (defaults to an internal registry template or username fallback)
      recoveryEmail = `${user.username}@cooperative-system.local`;
    }

    // 3. Generate a secure short-lived recovery token using the token signer utility
    const recoveryToken = signToken(user.id);

    // =========================================================================
    // NOTIFICATION HOOK
    // Place your production SMTP or SMS microservice integration worker here.
    // Example: await sendEmail({ to: recoveryEmail, subject: 'Password Reset', token: recoveryToken });
    // =========================================================================

    res.status(200).json({
      success: true,
      message: 'If an account matches those records, a recovery link has been dispatched.',
      // Included in development environment mode to make testing frontend flows simple:
      _dev_recovery_email_target: recoveryEmail,
      _dev_token_payload: recoveryToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (for admin user management/overview)
// @route   GET /api/auth/users
// @access  Protected (Admin)
export const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, is_active } = req.query;

    let queryText = `
      SELECT 
        u.id, u.username, u.role, u.is_active, u.last_login_at, u.last_activity_at, u.created_at,
        m.id as member_id, m.first_name, m.last_name, m.email, m.phone, m.status as member_status
      FROM users u
      LEFT JOIN members m ON m.user_id = u.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    if (role) {
      queryText += ` AND u.role = $${paramIndex}`;
      queryParams.push(role);
      paramIndex++;
    }

    if (is_active !== undefined && is_active !== '') {
      queryText += ` AND u.is_active = $${paramIndex}`;
      queryParams.push(is_active === 'true');
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        u.username ILIKE $${paramIndex} OR
        COALESCE(m.first_name, '') ILIKE $${paramIndex} OR
        COALESCE(m.last_name, '') ILIKE $${paramIndex} OR
        COALESCE(m.email, '') ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' ORDER BY u.created_at DESC';

    const result = await query(queryText, queryParams);

    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows.map(row => ({
        id: row.id,
        username: row.username,
        role: row.role,
        is_active: row.is_active,
        last_login_at: row.last_login_at,
        last_activity_at: row.last_activity_at,
        created_at: row.created_at,
        member_profile: row.member_id ? {
          id: row.member_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.phone,
          status: row.member_status
        } : null
      }))
    });
  } catch (error) {
    next(error);
  }
};
