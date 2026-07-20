import express from 'express';
import {
  createLoanProduct,
  getLoanProducts,
  applyForLoan,
  disburseLoan,
  getLoans,
  getLoanById,
  postRepayment,
  rejectLoanApplication,
  getLoanMetricsSummary,
  previewAmortizationSchedule
} from '../controllers/loanController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all loan routes
router.use(protect);

// ==========================================
// 1. LOAN PRODUCTS REGISTRY
// ==========================================
router.route('/products')
  .post(restrictTo('admin', 'manager'), createLoanProduct)
  .get(getLoanProducts);

// ==========================================
// 2. AMORTIZATION PREVIEW & CALCULATIONS
// ==========================================
// Placed before /:id routes to avoid route collision
router.post('/preview-schedule', previewAmortizationSchedule);

// ==========================================
// 3. LOAN METRICS & REPORTING
// ==========================================
// Placed before /:id routes to avoid route collision
router.route('/metrics/summary')
  .get(restrictTo('admin', 'manager'), getLoanMetricsSummary);

// ==========================================
// 4. REPAYMENTS
// ==========================================
router.route('/repayments')
  .post(restrictTo('admin', 'manager'), postRepayment);

// ==========================================
// 5. LOAN APPLICATIONS & LISTINGS
// ==========================================
router.route('/')
  .post(restrictTo('admin', 'manager', 'member'), applyForLoan)
  .get(getLoans);

router.route('/:id')
  .get(getLoanById);

// ==========================================
// 6. LOAN ACTIONS (DISBURSE & REJECT)
// ==========================================
router.route('/:id/disburse')
  .post(restrictTo('admin', 'manager'), disburseLoan);

router.route('/:id/reject')
  .patch(restrictTo('admin', 'manager'), rejectLoanApplication);

export default router;