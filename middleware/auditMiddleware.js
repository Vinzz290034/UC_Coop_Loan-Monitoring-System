import { query } from '../config/db.js';

/**
 * Maps route path patterns to human-readable module names and action descriptions.
 */
const routeModuleMap = {
  '/api/auth/login': { module: 'Account Access', action: 'Signed In' },
  '/api/auth/logout': { module: 'Account Access', action: 'Signed Out' },
  '/api/auth/register': { module: 'User Management', action: 'Created User Account' },
  '/api/auth/users': { module: 'User Management', action: 'User Account' },
  '/api/auth/forgot-password': { module: 'Account Access', action: 'Password Recovery Request' },
  '/api/auth/reset-password': { module: 'Account Access', action: 'Password Reset' },
  '/api/collections': { module: 'Collection', action: 'Collection Receipt' },
  '/api/accounts/check-vouchers': { module: 'Disbursement', action: 'Check Voucher' },
  '/api/revolving-fund': { module: 'Revolving Fund', action: 'Revolving Fund' },
  '/api/stl-liquidations': { module: 'STL Liquidation', action: 'STL Liquidation' },
  '/api/reports/bank-recon': { module: 'Bank Recon', action: 'Bank Recon Entry' },
  '/api/members': { module: 'Member Management', action: 'Member Record' },
  '/api/accounts/share-capital': { module: 'Shared Capital', action: 'Shared Capital' },
  '/api/accounts/fixed-deposits': { module: 'Fixed Deposits', action: 'Fixed Deposit' },
  '/api/accounts/investments': { module: 'Investments', action: 'Investment' },
  '/api/loans/products': { module: 'Loan Products', action: 'Loan Product' },
  '/api/loans/repayments': { module: 'Loan Repayments', action: 'Loan Repayment' },
  '/api/loans': { module: 'Loan Management', action: 'Loan Record' },
  '/api/billing': { module: 'Billings', action: 'Billing Record' },
  '/api/dividends': { module: 'Dividend', action: 'Dividend Record' },
  '/api/import': { module: 'Data Import', action: 'Data Import' },
  '/api/reports': { module: 'Reports', action: 'Report' },
  '/api/support': { module: 'Support Desk', action: 'Support Ticket' },
  '/api/announcements': { module: 'Announcements', action: 'Announcement' },
  '/api/messages': { module: 'Inbox', action: 'Message' },
  '/api/notifications': { module: 'Notifications', action: 'Notification' },
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

  // Match route prefixes from the map (longest prefix first)
  const sortedPrefixes = Object.entries(routeModuleMap).sort((a, b) => b[0].length - a[0].length);
  for (const [routePrefix, mapping] of sortedPrefixes) {
    if (path.startsWith(routePrefix)) {
      if (routePrefix.startsWith('/api/auth/login') || routePrefix.startsWith('/api/auth/logout') || routePrefix.startsWith('/api/auth/register') || routePrefix.startsWith('/api/auth/forgot-password') || routePrefix.startsWith('/api/auth/reset-password')) {
        return { module: mapping.module, action: mapping.action };
      }
      let action = mapping.action;
      if (method === 'POST') action = `Added ${mapping.action}`;
      else if (method === 'PUT') action = `Updated ${mapping.action}`;
      else if (method === 'PATCH') action = `Edited ${mapping.action}`;
      else if (method === 'DELETE') action = `Deleted ${mapping.action}`;
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
  
  if (Array.isArray(sanitized.membersData)) {
    sanitized.membersData = `[${sanitized.membersData.length} member records]`;
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
      const username = req.user?.username || (req.path.includes('/auth/login') ? req.body?.username : null) || null;
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
