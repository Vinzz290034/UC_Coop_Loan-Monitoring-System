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
      'SELECT id, username, role, created_at FROM users WHERE id = $1',
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
