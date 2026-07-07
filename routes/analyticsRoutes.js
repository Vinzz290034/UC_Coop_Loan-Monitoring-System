import express from 'express';
import {
  getDashboardSummary,
  getLoanTrends,
  getRepaymentTrends,
  getMemberGrowth,
  getLoanStatusDistribution,
  getFinancialSummary
} from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection and role restriction to all analytics routes
router.use(protect);
router.use(restrictTo('admin', 'manager'));

// Dashboard KPI summary
router.get('/dashboard-summary', getDashboardSummary);

// Time-series trends
router.get('/loan-trends', getLoanTrends);
router.get('/repayment-trends', getRepaymentTrends);
router.get('/member-growth', getMemberGrowth);

// Distribution & breakdowns
router.get('/loan-status-distribution', getLoanStatusDistribution);
router.get('/loan-distribution', getLoanStatusDistribution); // Alias for compatibility
router.get('/financial-summary', getFinancialSummary);

export default router;
