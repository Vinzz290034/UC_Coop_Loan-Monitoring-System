import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool, { query } from '../config/db.js';
import { generateOtp, sendOtpEmail } from '../services/emailService.js';

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
      [username.toLowerCase()]
    );

    if (userResult.rowCount === 0) {
      // Security Practice: Return a generic message or allow user to know they can try again.
      // But per A3, we restrict password resets to registered members. Let's return a generic success/friendly message
      // so it doesn't leak usernames, or let's be descriptive. Let's return error if user doesn't exist, or just standard:
      return res.status(400).json({
        success: false,
        error: { message: 'No registered member account matches this username.' }
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

    // A3: Only allow password resets for member accounts with registered emails
    if (user.role !== 'member') {
      return res.status(400).json({
        success: false,
        error: { message: 'Password reset is only available for member accounts with registered emails.' }
      });
    }

    // 2. Resolve communication channel (Fetch email based on role)
    const memberResult = await query(
      'SELECT first_name, email FROM members WHERE user_id = $1',
      [user.id]
    );

    if (memberResult.rowCount === 0 || !memberResult.rows[0].email) {
      return res.status(400).json({
        success: false,
        error: { message: 'No registered email found for this user.' }
      });
    }

    const member = memberResult.rows[0];
    const recoveryEmail = member.email;

    // 3. Generate OTP
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Invalidate any previous OTPs for this email and purpose
    await query(
      'DELETE FROM otp_verifications WHERE email = $1 AND purpose = $2',
      [recoveryEmail.toLowerCase(), 'password_reset']
    );

    // 5. Store OTP + user data
    const resetData = {
      user_id: user.id,
    };

    await query(
      `INSERT INTO otp_verifications (email, otp_code, purpose, registration_data, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [recoveryEmail.toLowerCase(), otpCode, 'password_reset', JSON.stringify(resetData), expiresAt]
    );

    // 6. Send OTP email
    const emailResult = await sendOtpEmail(recoveryEmail.toLowerCase(), otpCode, member.first_name, 'password_reset');

    const responsePayload = {
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.',
      email: recoveryEmail.toLowerCase(),
    };

    // In dev mode, include OTP in response for testing
    if (emailResult.devMode) {
      responsePayload._dev_otp = otpCode;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};


// @desc    Reset user password using a valid recovery token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide both the validation token and your new password.' }
      });
    }

    // Validate password strength policy (A2)
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 8 characters long.' }
      });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must contain at least one letter and at least one number.' }
      });
    }

    // 1. Verify the signature and expiration of the recovery token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'coop_loan_monitoring_secret_key_2026_dev'
      );
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: { message: 'The recovery link is invalid or has expired. Please request a new one.' }
      });
    }

    // 2. Extract user and check if the profile portal is frozen
    const userResult = await query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Account context could not be resolved.' }
      });
    }

    const user = userResult.rows[0];

    if (user.password_hash && user.password_hash.startsWith('PORTAL_FROZEN_')) {
      return res.status(403).json({
        success: false,
        error: { message: 'This portal account is frozen. Password modification is blocked.' }
      });
    }

    // 3. Hash the new password and commit it to storage
    const salt = await bcrypt.genSalt(10);
    const brandNewHash = await bcrypt.hash(newPassword, salt);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [brandNewHash, user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Your account password has been updated successfully. You can now log in.'
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

// @desc    Member self-registration — Step 1: Collect info, send OTP
// @route   POST /api/auth/member-register
// @access  Public
export const memberRegister = async (req, res, next) => {
  try {
    const { first_name, last_name, username, password, email } = req.body;

    // --- Input validation ---
    if (!first_name || !last_name || !username || !password || !email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide first name, last name, username, password, and email.' }
      });
    }

    if (!/^[a-zA-Z\s'-]+$/.test(first_name)) {
      return res.status(400).json({
        success: false,
        error: { message: 'First name must contain letters, spaces, hyphens, and apostrophes only, and cannot contain numbers or special characters.' }
      });
    }

    if (!/^[a-zA-Z\s'-]+$/.test(last_name)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Last name must contain letters, spaces, hyphens, and apostrophes only, and cannot contain numbers or special characters.' }
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username must be at least 3 characters long.' }
      });
    }

    if (!/^[a-zA-Z]/.test(username)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username must begin with a letter.' }
      });
    }

    if (/\s/.test(username)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username must be a single word (no spaces).' }
      });
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username can only contain letters, numbers, and underscores.' }
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 8 characters long.' }
      });
    }

    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must contain at least one letter and at least one number.' }
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid email address.' }
      });
    }

    // --- Duplicate checks ---
    const usernameCheck = await query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (usernameCheck.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Username is already taken.' }
      });
    }

    const emailCheck = await query('SELECT id FROM members WHERE email = $1', [email.toLowerCase()]);
    if (emailCheck.rowCount > 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'An account with this email already exists.' }
      });
    }

    // --- Hash password before storing ---
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // --- Generate OTP ---
    const otpCode = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // --- Invalidate any previous OTPs for this email ---
    await query(
      'DELETE FROM otp_verifications WHERE email = $1 AND purpose = $2',
      [email.toLowerCase(), 'registration']
    );

    // --- Store OTP + registration data ---
    const registrationData = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      username: username.toLowerCase(),
      password_hash: passwordHash,
      email: email.toLowerCase(),
    };

    await query(
      `INSERT INTO otp_verifications (email, otp_code, purpose, registration_data, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [email.toLowerCase(), otpCode, 'registration', JSON.stringify(registrationData), expiresAt]
    );

    // --- Send OTP email ---
    const emailResult = await sendOtpEmail(email.toLowerCase(), otpCode, first_name);

    const responsePayload = {
      success: true,
      message: 'Verification code sent to your email. Please check your inbox.',
      email: email.toLowerCase(),
    };

    // In dev mode, include OTP in response for testing
    if (emailResult.devMode) {
      responsePayload._dev_otp = otpCode;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and complete member registration — Step 2
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyRegistrationOtp = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email, otp_code, purpose = 'registration' } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide email and verification code.' }
      });
    }

    // --- Find the latest OTP record for this email and purpose ---
    const otpResult = await client.query(
      `SELECT * FROM otp_verifications
       WHERE email = $1 AND purpose = $2 AND verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase(), purpose]
    );

    if (otpResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No pending verification found for this email. Please request a new code.' }
      });
    }

    const otpRecord = otpResult.rows[0];

    // --- Check expiry ---
    if (new Date() > new Date(otpRecord.expires_at)) {
      await client.query('DELETE FROM otp_verifications WHERE id = $1', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        error: { message: 'Verification code has expired. Please request a new one.' }
      });
    }

    // --- Check max attempts (5) ---
    if (otpRecord.attempts >= 5) {
      await client.query('DELETE FROM otp_verifications WHERE id = $1', [otpRecord.id]);
      return res.status(429).json({
        success: false,
        error: { message: 'Too many failed attempts. Please request a new code.' }
      });
    }

    // --- Increment attempt count ---
    await client.query(
      'UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1',
      [otpRecord.id]
    );

    // --- Verify OTP ---
    if (otpRecord.otp_code !== otp_code) {
      const remainingAttempts = 4 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new code.'}`
        }
      });
    }

    // --- OTP is valid ---
    const regData = otpRecord.registration_data;

    if (purpose === 'password_reset') {
      // Mark OTP as verified and clean up
      await client.query(
        'UPDATE otp_verifications SET verified = true WHERE id = $1',
        [otpRecord.id]
      );

      await client.query(
        'DELETE FROM otp_verifications WHERE email = $1 AND id != $2 AND purpose = $3',
        [email.toLowerCase(), otpRecord.id, purpose]
      );

      // Generate a short-lived recovery token (JWT) valid for 15 minutes
      const recoveryToken = jwt.sign(
        { id: regData.user_id },
        process.env.JWT_SECRET || 'coop_loan_monitoring_secret_key_2026_dev',
        { expiresIn: '15m' }
      );

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully.',
        token: recoveryToken
      });
    }

    // --- Create user + member in a transaction (Registration flow) ---
    await client.query('BEGIN');

    // 1. Create user account
    const userResult = await client.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [regData.username, regData.password_hash, 'member']
    );
    const newUser = userResult.rows[0];

    // 2. Create member profile linked to user
    await client.query(
      `INSERT INTO members (user_id, first_name, last_name, email, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [newUser.id, regData.first_name, regData.last_name, regData.email]
    );

    // 3. Mark OTP as verified and clean up
    await client.query(
      'UPDATE otp_verifications SET verified = true WHERE id = $1',
      [otpRecord.id]
    );

    // 4. Clean up old OTPs for this email
    await client.query(
      'DELETE FROM otp_verifications WHERE email = $1 AND id != $2 AND purpose = $3',
      [email.toLowerCase(), otpRecord.id, purpose]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Account created successfully! You can now log in.',
      data: newUser
    });
  } catch (error) {
    await client.query('ROLLBACK');
    // Handle unique constraint violation (race condition on username)
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: { message: 'Username or email is already in use. Please try different credentials.' }
      });
    }
    next(error);
  } finally {
    client.release();
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { email, purpose = 'registration' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide an email address.' }
      });
    }

    // --- Find existing pending registration or password reset ---
    const existingResult = await query(
      `SELECT * FROM otp_verifications
       WHERE email = $1 AND purpose = $2 AND verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase(), purpose]
    );

    if (existingResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        error: { message: `No pending ${purpose.replace('_', ' ')} found for this email.` }
      });
    }

    const existing = existingResult.rows[0];

    // --- Rate limit: prevent resend within 60 seconds ---
    const timeSinceCreated = Date.now() - new Date(existing.created_at).getTime();
    if (timeSinceCreated < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - timeSinceCreated) / 1000);
      return res.status(429).json({
        success: false,
        error: { message: `Please wait ${waitSeconds} second(s) before requesting a new code.` }
      });
    }

    // --- Generate new OTP and update the record ---
    const newOtpCode = generateOtp();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `UPDATE otp_verifications
       SET otp_code = $1, expires_at = $2, attempts = 0, created_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newOtpCode, newExpiresAt, existing.id]
    );

    // --- Send new OTP email ---
    const regData = existing.registration_data;
    const emailResult = await sendOtpEmail(email.toLowerCase(), newOtpCode, regData?.first_name || '', purpose);

    const responsePayload = {
      success: true,
      message: 'A new verification code has been sent to your email.',
    };

    if (emailResult.devMode) {
      responsePayload._dev_otp = newOtpCode;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single user by ID (for admin edit form)
// @route   GET /api/auth/users/:id
// @access  Protected (Admin)
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
         u.id, u.username, u.role, u.is_active, u.last_login_at, u.last_activity_at, u.created_at,
         m.id as member_id, m.first_name, m.last_name, m.middle_name, m.email, m.phone, m.address, m.date_of_birth, m.status as member_status
       FROM users u
       LEFT JOIN members m ON m.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' }
      });
    }

    const row = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
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
          middle_name: row.middle_name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          date_of_birth: row.date_of_birth,
          status: row.member_status
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user account (role, status, username, optional password reset)
// @route   PUT /api/auth/users/:id
// @access  Protected (Admin)
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, role, is_active, new_password } = req.body;

    // --- Prevent self-demotion/self-deactivation ---
    if (id === req.user.id) {
      if (role && role !== req.user.role) {
        return res.status(400).json({
          success: false,
          error: { message: 'You cannot change your own role.' }
        });
      }
      if (is_active === false) {
        return res.status(400).json({
          success: false,
          error: { message: 'You cannot deactivate your own account.' }
        });
      }
    }

    // --- Validate role if provided ---
    if (role && !['admin', 'manager', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid role. Must be admin, manager, or member.' }
      });
    }

    // --- Check user exists ---
    const userCheck = await query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' }
      });
    }

    // --- Check username uniqueness if changed ---
    if (username && username !== userCheck.rows[0].username) {
      const dupCheck = await query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
      if (dupCheck.rowCount > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Username is already taken.' }
        });
      }
    }

    // --- Build dynamic update ---
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex}`);
      params.push(username);
      paramIndex++;
    }
    if (role) {
      updates.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }
    if (is_active !== undefined && is_active !== null) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }
    if (new_password) {
      if (new_password.length < 6) {
        return res.status(400).json({
          success: false,
          error: { message: 'New password must be at least 6 characters long.' }
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(new_password, salt);
      updates.push(`password_hash = $${paramIndex}`);
      params.push(hash);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No fields to update.' }
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, role, is_active, updated_at`,
      params
    );

    res.status(200).json({
      success: true,
      message: 'User account updated successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/users/:id
// @access  Protected (Admin)
export const deleteUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // --- Prevent self-deletion ---
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { message: 'You cannot delete your own account.' }
      });
    }

    // --- Check user exists ---
    const userCheck = await client.query('SELECT id, username, role FROM users WHERE id = $1', [id]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' }
      });
    }

    const targetUser = userCheck.rows[0];

    // --- Check for linked member with financial records ---
    const memberCheck = await client.query('SELECT id FROM members WHERE user_id = $1', [id]);
    if (memberCheck.rowCount > 0) {
      const memberId = memberCheck.rows[0].id;
      const financialCheck = await client.query(
        `SELECT
          (SELECT COUNT(*) FROM loans WHERE member_id = $1) as loan_count,
          (SELECT COUNT(*) FROM share_capital_transactions WHERE member_id = $1) as tx_count`,
        [memberId]
      );
      const { loan_count, tx_count } = financialCheck.rows[0];
      if (parseInt(loan_count, 10) > 0 || parseInt(tx_count, 10) > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Cannot delete this user. Their linked member profile has financial records. Consider deactivating the account instead.'
          }
        });
      }
    }

    await client.query('BEGIN');

    // Clean up linked member profile and logs (if no financial records)
    if (memberCheck.rowCount > 0) {
      const memberId = memberCheck.rows[0].id;
      await client.query('DELETE FROM member_status_logs WHERE member_id = $1', [memberId]);
      await client.query('DELETE FROM members WHERE id = $1', [memberId]);
    }

    // Delete the user
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `User account "${targetUser.username}" has been permanently deleted.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};
