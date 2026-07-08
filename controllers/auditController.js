import { query } from '../config/db.js';
import { exportToExcel } from '../services/reportExporter.js';

// @desc    Get paginated, filterable audit logs
// @route   GET /api/audit/logs
// @access  Protected (Admin only)
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      module,
      status,
      start_date,
      end_date,
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (user_id) {
      whereClause += ` AND al.user_id = $${paramIndex}`;
      queryParams.push(user_id);
      paramIndex++;
    }

    if (action) {
      whereClause += ` AND al.action ILIKE $${paramIndex}`;
      queryParams.push(`%${action}%`);
      paramIndex++;
    }

    if (module) {
      whereClause += ` AND al.module ILIKE $${paramIndex}`;
      queryParams.push(`%${module}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND al.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (start_date) {
      whereClause += ` AND al.created_at >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND al.created_at <= $${paramIndex}::timestamp + INTERVAL '1 day'`;
      queryParams.push(end_date);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (
        al.action ILIKE $${paramIndex} OR 
        al.module ILIKE $${paramIndex} OR 
        al.username ILIKE $${paramIndex} OR
        al.endpoint ILIKE $${paramIndex} OR
        al.details::text ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Count total matching records
    const countQuery = `SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].total, 10);

    // Fetch paginated results
    const dataQuery = `
      SELECT 
        al.id,
        al.user_id,
        al.username,
        al.action,
        al.module,
        al.method,
        al.endpoint,
        al.status_code,
        al.status,
        al.ip_address,
        al.user_agent,
        al.details,
        al.created_at
      FROM audit_logs al
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limitNum, offset);

    const result = await query(dataQuery, queryParams);

    res.status(200).json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limitNum)
      },
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export audit logs to Excel
// @route   GET /api/audit/logs/export
// @access  Protected (Admin only)
export const exportAuditLogs = async (req, res, next) => {
  try {
    const { user_id, action, module, status, start_date, end_date, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (user_id) {
      whereClause += ` AND al.user_id = $${paramIndex}`;
      queryParams.push(user_id);
      paramIndex++;
    }

    if (action) {
      whereClause += ` AND al.action ILIKE $${paramIndex}`;
      queryParams.push(`%${action}%`);
      paramIndex++;
    }

    if (module) {
      whereClause += ` AND al.module ILIKE $${paramIndex}`;
      queryParams.push(`%${module}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND al.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (start_date) {
      whereClause += ` AND al.created_at >= $${paramIndex}`;
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND al.created_at <= $${paramIndex}::timestamp + INTERVAL '1 day'`;
      queryParams.push(end_date);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (al.action ILIKE $${paramIndex} OR al.module ILIKE $${paramIndex} OR al.username ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const dataQuery = `
      SELECT 
        al.username,
        al.action,
        al.module,
        al.method,
        al.endpoint,
        al.status_code,
        al.status,
        al.ip_address,
        al.created_at
      FROM audit_logs al
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT 10000
    `;

    const result = await query(dataQuery, queryParams);

    const formattedData = result.rows.map(row => ({
      ...row,
      created_at: new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 19)
    }));

    const columns = [
      { header: 'Timestamp', key: 'created_at', width: 22 },
      { header: 'User', key: 'username', width: 20 },
      { header: 'Action', key: 'action', width: 30 },
      { header: 'Module', key: 'module', width: 20 },
      { header: 'Method', key: 'method', width: 10 },
      { header: 'Endpoint', key: 'endpoint', width: 35 },
      { header: 'Status Code', key: 'status_code', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'IP Address', key: 'ip_address', width: 18 }
    ];

    return await exportToExcel(
      res,
      'Audit_Trail_Report',
      'Audit_Logs',
      columns,
      formattedData
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity timeline for a specific user
// @route   GET /api/audit/user/:userId/activity
// @access  Protected (Admin only)
export const getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const offset = (pageNum - 1) * limitNum;

    // Get user info
    const userResult = await query(
      'SELECT id, username, role, is_active, last_login_at, last_activity_at, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' }
      });
    }

    // Count total
    const countResult = await query(
      'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = $1',
      [userId]
    );
    const totalRecords = parseInt(countResult.rows[0].total, 10);

    // Get activity logs
    const activityResult = await query(
      `SELECT id, action, module, method, endpoint, status_code, status, ip_address, user_agent, details, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limitNum, offset]
    );

    // Get activity summary stats
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_actions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_actions,
        COUNT(CASE WHEN action ILIKE '%Login%' THEN 1 END) as login_attempts,
        MIN(created_at) as first_activity,
        MAX(created_at) as last_activity
       FROM audit_logs WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({
      success: true,
      user: userResult.rows[0],
      stats: statsResult.rows[0],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total_records: totalRecords,
        total_pages: Math.ceil(totalRecords / limitNum)
      },
      data: activityResult.rows
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct modules and actions for filter dropdowns
// @route   GET /api/audit/filters
// @access  Protected (Admin only)
export const getAuditFilters = async (req, res, next) => {
  try {
    const [modulesResult, actionsResult] = await Promise.all([
      query('SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL ORDER BY module'),
      query('SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL ORDER BY action')
    ]);

    res.status(200).json({
      success: true,
      data: {
        modules: modulesResult.rows.map(r => r.module),
        actions: actionsResult.rows.map(r => r.action)
      }
    });
  } catch (error) {
    next(error);
  }
};
