import express from 'express';
import {
  createLoanProduct,
  getLoanProducts,
  updateLoanProductStatus,
  applyForLoan,
  disburseLoan,
  getLoans,
  getLoanById,
  postRepayment,
  rejectLoanApplication,
  getLoanMetricsSummary,
  previewAmortizationSchedule,
  getMyLoanHistory

} from '../controllers/loanController.js';
import { protect, restrictTo, requireApprovedProfile } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all loan routes
router.use(protect);

// ==========================================
// 1. LOAN PRODUCTS REGISTRY
// ==========================================
router.route('/products')
  .post(restrictTo('admin', 'staff'), createLoanProduct)
  .get(getLoanProducts);

router.patch('/products/:id/status', restrictTo('admin', 'staff'), updateLoanProductStatus);

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
  .get(restrictTo('admin', 'staff'), getLoanMetricsSummary);

// ==========================================
// 4. REPAYMENTS
// ==========================================
router.route('/repayments')
  .post(restrictTo('admin', 'staff'), postRepayment);

// ==========================================

// 5. MEMBER SPECIFIC HISTORY
// ==========================================
// Placed before /:id routes to avoid route collision
router.route('/my-history')
  .get(restrictTo('member'), getMyLoanHistory);

// ==========================================
// 6. LOAN APPLICATIONS & LISTING
// ==========================================
router.route('/')
  .post(restrictTo('admin', 'staff', 'member'), requireApprovedProfile, applyForLoan)
  .get(getLoans);

router.route('/:id')
  .get(getLoanById);

// ==========================================
// 7. LOAN ACTIONS (DISBURSE & REJECT)
// ==========================================
router.route('/:id/disburse')
  .post(restrictTo('admin', 'staff'), disburseLoan);

router.route('/:id/reject')
  .patch(restrictTo('admin', 'staff'), rejectLoanApplication);

export default router;