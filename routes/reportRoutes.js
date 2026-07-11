import express from 'express';
import {
  getCashDisbursementReport,
  getLoanMonitoringReport,
  getTransactionReport,
  getRevenueCollectionReport
} from '../controllers/reportController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth/role middleware to all reports
router.use(protect);
router.use(restrictTo('admin', 'manager'));

router.get('/cash-disbursement', getCashDisbursementReport);
router.get('/loan-monitoring', getLoanMonitoringReport);
router.get('/transactions', getTransactionReport);
router.get('/revenue', getRevenueCollectionReport);

export default router;
