import express from 'express';
import multer from 'multer';
import {
  getCashDisbursementReport,
  getLoanMonitoringReport,
  getTransactionReport,
  getRevenueCollectionReport,
  importExcelLedger,
  getMerchandiseSalesReport,
  getExpensesBreakdownReport,
  getLoanProductsReport,
  getMembershipUpdateReport,
  getBooksOfAccountsReport,
  getFinancialStatementReport,
  getStatementOfOperationsReport,
  getBankReconReport,
  upsertBankReconEntry,
  importBankReconEntries,
  deleteBankReconEntry,
  clearBankReconEntries,
  getChartOfAccounts,
  importChartOfAccounts,
  clearChartOfAccounts
} from '../controllers/reportController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

import path from 'path';
import os from 'os';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
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

// Legacy reports
router.get('/cash-disbursement', getCashDisbursementReport);
router.get('/loan-monitoring', getLoanMonitoringReport);
router.get('/transactions', getTransactionReport);
router.get('/revenue', getRevenueCollectionReport);
router.post('/import-excel', upload.single('file'), importExcelLedger);

// Cooperative General Manager 5 Content Reports + Financial Statement
router.get('/merchandise-sales', getMerchandiseSalesReport);
router.get('/expenses-breakdown', getExpensesBreakdownReport);
router.get('/loan-products', getLoanProductsReport);
router.get('/membership-update', getMembershipUpdateReport);
router.get('/books-of-accounts', getBooksOfAccountsReport);
router.get('/financial-statement', getFinancialStatementReport);
router.get('/statement-of-operations', getStatementOfOperationsReport);
router.get('/bank-recon', getBankReconReport);
router.post('/bank-recon/entry', upsertBankReconEntry);
router.post('/bank-recon/import', importBankReconEntries);
router.delete('/bank-recon/clear', clearBankReconEntries);
router.delete('/bank-recon/:id', deleteBankReconEntry);
router.get('/chart-of-accounts', getChartOfAccounts);
router.post('/chart-of-accounts/import', importChartOfAccounts);
router.delete('/chart-of-accounts', clearChartOfAccounts);

export default router;
