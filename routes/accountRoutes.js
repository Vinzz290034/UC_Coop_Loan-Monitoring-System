import express from 'express';
import {
  postShareCapitalTransaction,
  getShareCapital,
  createFixedDeposit,
  getFixedDeposits,
  createInvestment,
  postInvestmentTransaction,
  getInvestments,
  getPendingPlacements,
  confirmPlacementPayment
} from '../controllers/accountController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all account endpoints
router.use(protect);

// 1. Share Capital Ledger
router.route('/share-capital')
  .post(restrictTo('admin', 'staff', 'member'), postShareCapitalTransaction);

router.route('/share-capital/:memberId')
  .get(getShareCapital);

// 2. Fixed Deposit placements
router.route('/fixed-deposits')
  .post(restrictTo('admin', 'staff', 'member'), createFixedDeposit);

router.route('/fixed-deposits/:memberId')
  .get(getFixedDeposits);

// 3. Investment tracking
router.route('/investments')
  .post(restrictTo('admin', 'staff', 'member'), createInvestment);

router.route('/investments/:id/transactions')
  .post(restrictTo('admin', 'staff'), postInvestmentTransaction);

router.route('/investments/:memberId')
  .get(getInvestments);

// 4. Pending placements & office cash payment confirmation
router.route('/pending-placements')
  .get(restrictTo('admin', 'staff'), getPendingPlacements);

router.route('/confirm-placement/:type/:id')
  .put(restrictTo('admin', 'staff'), confirmPlacementPayment);

export default router;
