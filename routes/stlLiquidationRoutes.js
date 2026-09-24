import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getStlLiquidations,
  getStlLiquidationById,
  createStlLiquidation,
  updateStlLiquidation,
  deleteStlLiquidation,
  linkCheckVoucher,
  searchLoansForLiquidation
} from '../controllers/stlLiquidationController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.route('/')
  .get(getStlLiquidations)
  .post(createStlLiquidation);

router.route('/loans')
  .get(searchLoansForLiquidation);

router.route('/:id')
  .get(getStlLiquidationById)
  .put(updateStlLiquidation)
  .delete(deleteStlLiquidation);

router.route('/:id/link-voucher')
  .post(linkCheckVoucher);

export default router;
