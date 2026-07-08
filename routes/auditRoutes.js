import express from 'express';
import {
  getAuditLogs,
  exportAuditLogs,
  getUserActivity,
  getAuditFilters
} from '../controllers/auditController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection and restrict to Admin only
router.use(protect);
router.use(restrictTo('admin'));

// Audit log listing with pagination, filtering, search
router.get('/logs', getAuditLogs);

// Export audit logs to Excel
router.get('/logs/export', exportAuditLogs);

// Filter options for UI dropdowns
router.get('/filters', getAuditFilters);

// User-specific activity timeline
router.get('/user/:userId/activity', getUserActivity);

export default router;
