import express from 'express';
import {
  getAuditLogs,
  exportAuditLogs,
  getUserActivity,
  getAuditFilters
} from '../controllers/auditController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection and restrict exclusively to Admin user "Orpheus"
const requireOrpheusAdmin = (req, res, next) => {
  const username = String(req.user?.username || '').trim().toLowerCase();
  if (req.user?.role !== 'admin' || username !== 'orpheus') {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Audit Trail is restricted to Orpheus only.' }
    });
  }
  next();
};

router.use(protect);
router.use(restrictTo('admin'));
router.use(requireOrpheusAdmin);

// Audit log listing with pagination, filtering, search
router.get('/logs', getAuditLogs);

// Export audit logs to Excel
router.get('/logs/export', exportAuditLogs);

// Filter options for UI dropdowns
router.get('/filters', getAuditFilters);

// User-specific activity timeline
router.get('/user/:userId/activity', getUserActivity);

export default router;
