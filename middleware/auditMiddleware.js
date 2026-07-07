import { query } from '../config/db.js';

/**
 * Maps route path patterns to human-readable module names and action descriptions.
 */
const routeModuleMap = {
  '/api/auth/login': { module: 'Authentication', action: 'User Login' },
  '/api/auth/register': { module: 'Authentication', action: 'User Registration' },
  '/api/auth/forgot-password': { module: 'Authentication', action: 'Password Recovery Request' },
  '/api/members': { module: 'Member Management', action: 'Member Operation' },
  '/api/accounts/share-capital': { module: 'Share Capital', action: 'Share Capital Transaction' },
  '/api/accounts/fixed-deposits': { module: 'Fixed Deposits', action: 'Fixed Deposit Operation' },
  '/api/accounts/investments': { module: 'Investments', action: 'Investment Operation' },
  '/api/loans/products': { module: 'Loan Products', action: 'Loan Product Configuration' },
  '/api/loans/repayments': { module: 'Loan Repayments', action: 'Repayment Posting' },
  '/api/loans': { module: 'Loan Management', action: 'Loan Operation' },
  '/api/billing': { module: 'Billing', action: 'Billing Operation' },
  '/api/reports': { module: 'Reports', action: 'Report Generation' },
};

/**
 * Resolves the module name and action for a given request path.
 */
function resolveModuleAndAction(method, path) {
  // Check for specific sub-routes first (longest match wins)
  if (path.includes('/disburse')) {
    return { module: 'Loan Management', action: 'Loan Disbursement' };
  }
  if (path.includes('/reject')) {
    return { module: 'Loan Management', action: 'Loan Rejection' };
  }
  if (path.includes('/status')) {
    return { module: 'Member Management', action: 'Member Status Update' };
  }
  if (path.includes('/export')) {
    return { module: 'Reports', action: 'Data Export' };
  }
  if (path.includes('/transactions') && path.includes('/investments')) {
    return { module: 'Investments', action: 'Investment Transaction' };
  }

  // Match route prefixes from the map
  for (const [routePrefix, mapping] of Object.entries(routeModuleMap)) {
    if (path.startsWith(routePrefix)) {
      // Refine the action based on HTTP method
      let action = mapping.action;
      if (method === 'POST') action = `Create ${mapping.module.split(' ').pop()}`;
      else if (method === 'PUT') action = `Update ${mapping.module.split(' ').pop()}`;
      else if (method === 'PATCH') action = `Modify ${mapping.module.split(' ').pop()}`;
      else if (method === 'DELETE') action = `Delete ${mapping.module.split(' ').pop()}`;
      return { module: mapping.module, action };
    }
  }

  return { module: 'System', action: `${method} Operation` };
}

/**
 * Redacts sensitive fields from request body before logging.
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'credit_card'];
  const sanitized = { ...body };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  
  return sanitized;
}

/**
 * Audit logging middleware.
 * Intercepts state-changing requests (POST, PUT, PATCH, DELETE) and logs them
 * asynchronously to the audit_logs table after the response is sent.
 * 
 * Non-blocking: uses fire-and-forget pattern to avoid slowing API responses.
 */
export const auditLogger = (req, res, next) => {
  // Only audit state-changing methods
  const auditableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!auditableMethods.includes(req.method)) {
    return next();
  }

  // Skip audit log and analytics endpoints to prevent recursive logging
  if (req.path.startsWith('/api/audit') || req.path.startsWith('/api/analytics')) {
    return next();
  }

  // Capture the original end method to hook into response completion
  const originalEnd = res.end;
  
  res.end = function (...args) {
    // Restore original end
    res.end = originalEnd;
    res.end(...args);
    
    // Fire-and-forget audit log write
    try {
      const { module, action } = resolveModuleAndAction(req.method, req.path);
      const userId = req.user?.id || null;
      const username = req.user?.username || null;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;
      const statusCode = res.statusCode;
      const status = statusCode >= 200 && statusCode < 400 ? 'success' : 'failed';
      
      const details = sanitizeBody(req.body);

      query(
        `INSERT INTO audit_logs (user_id, username, action, module, method, endpoint, status_code, status, ip_address, user_agent, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          username,
          action,
          module,
          req.method,
          req.originalUrl || req.path,
          statusCode,
          status,
          ipAddress,
          userAgent,
          details ? JSON.stringify(details) : null
        ]
      ).catch(err => {
        console.error('Audit log write failed:', err.message);
      });
    } catch (err) {
      console.error('Audit middleware error:', err.message);
    }
  };

  next();
};

/**
 * Activity tracker middleware.
 * Updates the user's last_activity_at timestamp on every authenticated request.
 * Non-blocking fire-and-forget.
 */
export const activityTracker = (req, res, next) => {
  if (req.user?.id) {
    query(
      'UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.user.id]
    ).catch(err => {
      console.error('Activity tracker update failed:', err.message);
    });
  }
  next();
};
