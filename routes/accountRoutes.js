import express from 'express';
import {
  postShareCapitalTransaction,
  getShareCapital,
  createFixedDeposit,
  getFixedDeposits,
  createInvestment,
  postInvestmentTransaction,
  getInvestments
} from '../controllers/accountController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all account endpoints
router.use(protect);

// 1. Share Capital Ledger
router.route('/share-capital')
  .post(restrictTo('admin', 'manager'), postShareCapitalTransaction);

router.route('/share-capital/:memberId')
  .get(getShareCapital);

// 2. Fixed Deposit placements
router.route('/fixed-deposits')
  .post(restrictTo('admin', 'manager'), createFixedDeposit);

router.route('/fixed-deposits/:memberId')
  .get(getFixedDeposits);

// 3. Investment tracking
router.route('/investments')
  .post(restrictTo('admin', 'manager'), createInvestment);

router.route('/investments/:id/transactions')
  .post(restrictTo('admin', 'manager'), postInvestmentTransaction);

router.route('/investments/:memberId')
  .get(getInvestments);

export default router;
