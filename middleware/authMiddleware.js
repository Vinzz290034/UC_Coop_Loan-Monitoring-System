import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'coop_loan_monitoring_secret_key_2026_dev');

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
        const newMember = await query(
          `INSERT INTO members (user_id, member_no, first_name, last_name, email, phone, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')
           RETURNING *`,
          [
            req.user.id,
            `MEM-${Math.floor(100000 + Math.random() * 900000)}`,
            req.user.username.split('_')[0] || req.user.username,
            req.user.username.split('_')[1] || 'Member',
            `${req.user.username}@ucmetc.coop`,
            '09170000000'
          ]
        );
        req.user.profile = newMember.rows[0];
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
