import jwt from 'jsonwebtoken';
import pool, { query } from '../config/db.js';
import { generateNextMemberNo } from '../utils/memberIdGenerator.js';

// @desc    Protect routes - verify JWT token and extract user context
// @access  Internal Middleware
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authorized to access this resource. No token provided.' }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB to ensure they still exist and check latest data
    const userResult = await query(
      'SELECT id, username, role, profile_picture_url, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({
        success: false,
        error: { message: 'The user belonging to this token no longer exists.' }
      });
    }

    // Attach user payload to the request
    req.user = userResult.rows[0];

    // Fetch associated member profile if available
    const memberCheck = await query('SELECT * FROM members WHERE user_id = $1 LIMIT 1', [req.user.id]);
    if (memberCheck.rowCount > 0) {
      req.user.profile = memberCheck.rows[0];
    } else {
      // Auto-create or link fallback member profile if role is member
      if (req.user.role === 'member') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const memberNo = await generateNextMemberNo(client, new Date().getFullYear());
          const newMember = await client.query(
            `INSERT INTO members (member_no, user_id, first_name, last_name, email, phone, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active')
             RETURNING *`,
            [
              memberNo,
              req.user.id,
              req.user.username.split('_')[0] || req.user.username,
              req.user.username.split('_')[1] || 'Member',
              `${req.user.username}@ucmetc.coop`,
              '09170000000'
            ]
          );
          await client.query('COMMIT');
          req.user.profile = newMember.rows[0];
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      } else {
        // For admin/manager fallback, get first active member ID if needed
        const firstMember = await query('SELECT * FROM members ORDER BY created_at ASC LIMIT 1');
        if (firstMember.rowCount > 0) {
          req.user.profile = firstMember.rows[0];
        }
      }
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token. Please log in again.' }
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expired. Please log in again.' }
      });
    }
    next(error);
  }
};

// Restrict access to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'You do not have permission to perform this action.' }
      });
    }
    next();
  };
};

// Require approved & completed profile for financial & loan operations
export const requireApprovedProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required.' }
      });
    }

    // Bypass for admin and staff roles
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      return next();
    }

    // Fetch latest member status and profile completion
    const memberCheck = await query(
      'SELECT profile_completed, status, is_verified FROM members WHERE user_id = $1 LIMIT 1',
      [req.user.id]
    );

    if (memberCheck.rowCount === 0) {
      return res.status(403).json({
        success: false,
        error: { message: 'Member profile not found. Please complete your registration.' }
      });
    }

    const member = memberCheck.rows[0];
    const isApproved = ['approved', 'active'].includes(member.status) || member.is_verified === true;

    if (!isApproved) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Your personal information must be completed and approved by Admin or Staff before performing loan, investment, or financial transactions.'
        }
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
