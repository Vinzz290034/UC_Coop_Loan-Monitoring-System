import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getLiquidations,
  getLiquidationById,
  createLiquidation,
  updateLiquidation,
  deleteLiquidation,
  linkCheckVoucher,
  syncVoucherAmounts,
  addLiquidationItem,
  updateLiquidationItem,
  deleteLiquidationItem,
  getRevolvingFundAccounts,
  saveRevolvingFundAccount,
  deleteRevolvingFundAccount,
  getRevolvingFundRecipients,
  saveRevolvingFundRecipient
} from '../controllers/revolvingFundController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.route('/')
  .get(getLiquidations)
  .post(createLiquidation);

router.route('/accounts')
  .get(getRevolvingFundAccounts)
  .post(saveRevolvingFundAccount);

router.route('/accounts/:name')
  .delete(deleteRevolvingFundAccount);

router.route('/recipients')
  .get(getRevolvingFundRecipients)
  .post(saveRevolvingFundRecipient);

router.route('/:id')
  .get(getLiquidationById)
  .put(updateLiquidation)
  .delete(deleteLiquidation);

router.route('/:id/link-voucher')
  .post(linkCheckVoucher);

router.route('/:id/sync-voucher-amounts')
  .post(syncVoucherAmounts);

router.route('/:id/items')
  .post(addLiquidationItem);

router.route('/items/:itemId')
  .put(updateLiquidationItem)
  .delete(deleteLiquidationItem);

export default router;
