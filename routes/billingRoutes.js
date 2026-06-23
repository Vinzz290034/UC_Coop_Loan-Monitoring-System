import express from 'express';
import { getBillingQueue, getAgingReport } from '../controllers/billingController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth verification to all routes
router.use(protect);
router.use(restrictTo('admin', 'manager'));

// Billing and Collections Queues
router.get('/due', getBillingQueue);
router.get('/aging', getAgingReport);

export default router;
