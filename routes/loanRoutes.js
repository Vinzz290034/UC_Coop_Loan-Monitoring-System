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
  getLoanMetricsSummary
} from '../controllers/loanController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all loan routes
router.use(protect);

// 1. Loan Products Registry
router.route('/products')
  .post(restrictTo('admin', 'manager'), createLoanProduct)
  .get(getLoanProducts);

// 2. Loan Applications & Listings
router.route('/')
  .post(restrictTo('admin', 'manager'), applyForLoan)
  .get(getLoans);

router.route('/:id')
  .get(getLoanById);

// 3. Disbursement Action
router.route('/:id/disburse')
  .post(restrictTo('admin', 'manager'), disburseLoan);

// 4. Repayments
router.route('/repayments')
  .post(restrictTo('admin', 'manager'), postRepayment);
  
router.route('/:id/reject')
  .patch(restrictTo('admin', 'manager'), rejectLoanApplication); // Injected active routing path

// 5. Loan Metrics & Reporting
router.route('/metrics/summary')
  .get(restrictTo('admin', 'manager'), getLoanMetricsSummary);

export default router;
