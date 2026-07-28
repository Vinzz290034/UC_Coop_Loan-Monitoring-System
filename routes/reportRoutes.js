import express from 'express';
import multer from 'multer';
import {
  getCashDisbursementReport,
  getLoanMonitoringReport,
  getTransactionReport,
  getRevenueCollectionReport,
  importExcelLedger
} from '../controllers/reportController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

import path from 'path';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, '/tmp'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `import_ledger_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only .xlsx and .xls files are accepted.'));
  }
});
const router = express.Router();

// Apply auth/role middleware to all reports
router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.get('/cash-disbursement', getCashDisbursementReport);
router.get('/loan-monitoring', getLoanMonitoringReport);
router.get('/transactions', getTransactionReport);
router.get('/revenue', getRevenueCollectionReport);
router.post('/import-excel', upload.single('file'), importExcelLedger);

export default router;
