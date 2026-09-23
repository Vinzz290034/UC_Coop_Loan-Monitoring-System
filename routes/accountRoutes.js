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
  confirmPlacementPayment,
  declinePlacementPayment,
  importCheckVouchers,
  getCheckVouchers,
  createCheckVoucher,
  updateCheckVoucher,
  deleteCheckVoucher,
  bulkDeleteCheckVouchers,
  syncCheckVoucherWithRevolvingFund,
  printCheckVoucher,
  getAllSavingsAccounts,
  getSavingsAccount,
  postSavingsDeposit,
  postSavingsWithdrawal
} from '../controllers/accountController.js';
import { protect, restrictTo, requireApprovedProfile } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all account endpoints
router.use(protect);

// 0. Savings Accounts & Passbook Ledger
router.route('/savings')
  .get(restrictTo('admin', 'staff'), getAllSavingsAccounts);

router.route('/savings/deposit')
  .post(restrictTo('admin', 'staff', 'member'), requireApprovedProfile, postSavingsDeposit);

router.route('/savings/withdraw')
  .post(restrictTo('admin', 'staff'), requireApprovedProfile, postSavingsWithdrawal);

router.route('/savings/:memberId')
  .get(getSavingsAccount);

// 1. Share Capital Ledger
router.route('/share-capital')
  .post(restrictTo('admin', 'staff', 'member'), requireApprovedProfile, postShareCapitalTransaction);

router.route('/share-capital/:memberId')
  .get(getShareCapital);

// 2. Fixed Deposit placements
router.route('/fixed-deposits')
  .post(restrictTo('admin', 'staff', 'member'), requireApprovedProfile, createFixedDeposit);

router.route('/fixed-deposits/:memberId')
  .get(getFixedDeposits);

// 3. Investment tracking
router.route('/investments')
  .post(restrictTo('admin', 'staff', 'member'), requireApprovedProfile, createInvestment);

router.route('/investments/:id/transactions')
  .post(restrictTo('admin', 'staff'), postInvestmentTransaction);

router.route('/investments/:memberId')
  .get(getInvestments);

// 4. Pending placements & office cash payment confirmation/decline
router.route('/pending-placements')
  .get(restrictTo('admin', 'staff'), getPendingPlacements);

router.route('/confirm-placement/:type/:id')
  .put(restrictTo('admin', 'staff'), confirmPlacementPayment);

router.route('/decline-placement/:type/:id')
  .put(restrictTo('admin', 'staff'), declinePlacementPayment);

// 5. Purchase Check Vouchers
router.route('/check-vouchers/import')
  .post(restrictTo('admin', 'manager', 'staff'), importCheckVouchers);

router.route('/check-vouchers/bulk-delete')
  .post(restrictTo('admin', 'staff'), bulkDeleteCheckVouchers);

router.route('/check-vouchers/:id/sync-revolving-fund')
  .post(restrictTo('admin', 'manager', 'staff'), syncCheckVoucherWithRevolvingFund);

router.route('/check-vouchers/:id/print')
  .post(restrictTo('admin', 'manager', 'staff'), printCheckVoucher);

router.route('/check-vouchers/:id')
  .put(restrictTo('admin', 'manager', 'staff'), updateCheckVoucher)
  .delete(restrictTo('admin', 'staff'), deleteCheckVoucher);

router.route('/check-vouchers')
  .get(restrictTo('admin', 'manager', 'staff'), getCheckVouchers)
  .post(restrictTo('admin', 'manager', 'staff'), createCheckVoucher);

export default router;
