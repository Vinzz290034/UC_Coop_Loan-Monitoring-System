import express from 'express';
import { getBillingQueue, getAgingReport, getBillingByLoanId, getPayrollCollectionList } from '../controllers/billingController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth verification to all routes
router.use(protect);
router.use(restrictTo('admin', 'staff'));

// Billing and Collections Queues
router.get('/due', getBillingQueue);
router.get('/aging', getAgingReport);
router.get('/payroll-collection', getPayrollCollectionList);

// Individual Account Ledger Breakdown
router.get('/loan/:loanId', getBillingByLoanId); // Injected targeted asset route

export default router;
