'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  ShoppingBag,
  Wrench,
  Layers,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Eye,
  Check,
  HelpCircle,
  FileText
} from 'lucide-react';
import { CollectionItem, CollectionTab } from '@/app/dashboard/collection/page';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (items: CollectionItem[], mode: 'append' | 'replace') => void;
  currentUser: string;
}

interface ParsedRowBreakdown {
  id: string;
  date: string;
  payee: string;
  invoiceNo: string;
  cashOnHand: number;
  details: string;
  items: CollectionItem[];
  rowTotal: number;
  isDiscrepancy: boolean;
}

export default function InvoiceArExcelImportModal({
  isOpen,
  onClose,
  onImportComplete,
  currentUser
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

  const [parsedBreakdowns, setParsedBreakdowns] = useState<ParsedRowBreakdown[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<'all' | CollectionTab>('all');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSheetDropdownOpen, setIsSheetDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSheetDropdownOpen(false);
      }
    };
    if (isSheetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSheetDropdownOpen]);

  // Robust date parser for Excel (prevents UTC/local timezone day-shift)
  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];

    // 1. Direct formatted string (e.g., "9/1/2026", "09/01/2026", "2026-09-01")
    if (typeof val === 'string') {
      const trimmed = val.trim();
      const parts = trimmed.split(/[/.-]/);
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // Month/Day/Year (e.g. 9/1/2026 -> 2026-09-01)
          const m = parts[0].padStart(2, '0');
          const d = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
        } else if (parts[0].length === 4) {
          // Year-Month-Day (e.g. 2026-09-01)
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
      const directDate = new Date(trimmed);
      if (!isNaN(directDate.getTime())) {
        const adjusted = new Date(directDate.getTime() + 12 * 60 * 60 * 1000);
        const y = adjusted.getUTCFullYear();
        const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
        const d = String(adjusted.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    // 2. JavaScript Date object from SheetJS (neutralize UTC+8 timezone rollback)
    if (val instanceof Date && !isNaN(val.getTime())) {
      const adjusted = new Date(val.getTime() + 12 * 60 * 60 * 1000);
      const y = adjusted.getUTCFullYear();
      const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
      const d = String(adjusted.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // 3. Numeric Excel serial date (e.g. 46266 for 2026-09-01)
    if (typeof val === 'number') {
      const utcMs = Math.round((val - 25569) * 86400 * 1000);
      const date = new Date(utcMs);
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    return new Date().toISOString().split('T')[0];
  };

  // Robust numeric parser
  const parseExcelNum = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/,/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle file drop / selection
  const handleFile = async (selected: File) => {
    setFile(selected);
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const buffer = await selected.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);

      // Prioritize current/latest month sheet or the active sheet (e.g., SEPTEMBER-2026, AR)
      const targetSheet =
        wb.SheetNames.find(s => /sep|aug|jul|jun|ar/i.test(s) && !/sum/i.test(s)) ||
        wb.SheetNames[0];

      setSelectedSheet(targetSheet);
      parseSheet(wb, targetSheet);
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setErrorMessage(err.message || 'Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse specific sheet within workbook
  const parseSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert sheet to 2D array of cells
    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rawRows || rawRows.length < 2) {
      setErrorMessage(`Sheet "${sheetName}" does not contain enough data.`);
      setParsedBreakdowns([]);
      return;
    }

    // Locate header row containing 'Payee' or 'INVOICE' or 'Date'
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const rowStr = rawRows[r].map(c => String(c).toLowerCase()).join(' ');
      if (rowStr.includes('payee') || (rowStr.includes('invoice') && rowStr.includes('date'))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 1; // Default to row 2 (0-indexed 1)
    }

    const groupHeaderRow = headerRowIdx > 0 ? rawRows[headerRowIdx - 1] : [];
    const subHeaderRow = rawRows[headerRowIdx];

    // Build normalized column descriptors with merged-group inheritance
    let lastGroupHeader = '';
    const colMetadata: {
      index: number;
      group: string;
      sub: string;
      label: string;
    }[] = [];

    const maxCols = Math.max(groupHeaderRow.length, subHeaderRow.length);
    for (let c = 0; c < maxCols; c++) {
      const g = String(groupHeaderRow[c] || '').trim();
      const s = String(subHeaderRow[c] || '').trim();

      if (g) {
        lastGroupHeader = g;
      }

      const activeGroup = (g || (s.toLowerCase() === 'interest' ? lastGroupHeader : g)).trim();
      const combined = `${activeGroup} ${s}`.trim();

      colMetadata.push({
        index: c,
        group: activeGroup,
        sub: s,
        label: combined.toLowerCase()
      });
    }

    // Locate basic columns
    const dateCol = colMetadata.findIndex(m => /date/i.test(m.sub || m.group));
    const payeeCol = colMetadata.findIndex(m => /payee|borrower|member|client/i.test(m.sub || m.group));
    const invoiceCol = colMetadata.findIndex(m => /invoice\s*no|or\s*no|receipt/i.test(m.sub || m.group));
    const cashOnHandCol = colMetadata.findIndex(m => /cash\s*on\s*hand|total/i.test(m.sub || m.group));
    const detailsCol = colMetadata.findIndex(m => /detail|particular|remark|payment\s*mode/i.test(m.sub || m.group));

    const finalBreakdowns: ParsedRowBreakdown[] = [];

    // Parse each data row
    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawPayee = String(row[payeeCol !== -1 ? payeeCol : 1] || '').trim();
      // Skip empty or summary rows
      if (!rawPayee || /^(total|grand\s*total|subtotal|summary)/i.test(rawPayee)) continue;

      const dateColIdx = dateCol !== -1 ? dateCol : 0;
      const cellAddr = XLSX.utils.encode_cell({ r, c: dateColIdx });
      const cellObj = ws[cellAddr];
      const rawDate = cellObj?.w || row[dateColIdx];
      const parsedDate = parseExcelDate(rawDate);

      const rawInvoice = String(row[invoiceCol !== -1 ? invoiceCol : 2] || '').trim();
      const invoiceNo = rawInvoice ? (rawInvoice.startsWith('INV#') ? rawInvoice : `INV#${rawInvoice}`) : `INV#${Math.floor(1000 + Math.random() * 9000)}`;

      const rawCashOnHand = parseExcelNum(row[cashOnHandCol !== -1 ? cashOnHandCol : 3]);
      const rawDetails = String(row[detailsCol !== -1 ? detailsCol : 4] || '').trim();

      // Determine Payment Method
      let paymentMethod: CollectionItem['payment_method'] = 'Cash';
      const dLower = rawDetails.toLowerCase();
      if (dLower.includes('transfer') || dLower.includes('bank')) paymentMethod = 'Bank Transfer';
      else if (dLower.includes('payroll') || dLower.includes('deduct')) paymentMethod = 'Payroll Deduction';
      else if (dLower.includes('gcash')) paymentMethod = 'GCash';
      else if (dLower.includes('check')) paymentMethod = 'Check';

      const rowItems: CollectionItem[] = [];

      // Helper to match column amount
      const getAmount = (predicate: (m: typeof colMetadata[0]) => boolean) => {
        const found = colMetadata.find(predicate);
        return found ? parseExcelNum(row[found.index]) : 0;
      };

      // 1. REGULAR LOAN (Repayment & Interest)
      const regRepayment = getAmount(m => /regular/i.test(m.group || m.label) && /repay|principal/i.test(m.sub));
      const regInterest = getAmount(m => /regular/i.test(m.group || m.label) && /interest/i.test(m.sub));
      if (regRepayment > 0 || regInterest > 0) {
        rowItems.push({
          id: `imp-${r}-reg-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Regular Loan',
          principal_amount: regRepayment,
          interest_amount: regInterest,
          amount: regRepayment + regInterest,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Regular Loan Repayment',
          collected_by: currentUser
        });
      }

      // 2. CALAMITY LOAN
      const calRepayment = getAmount(m => /calamity/i.test(m.group || m.label) && /repay|principal/i.test(m.sub));
      const calInterest = getAmount(m => /calamity/i.test(m.group || m.label) && /interest/i.test(m.sub));
      if (calRepayment > 0 || calInterest > 0) {
        rowItems.push({
          id: `imp-${r}-cal-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Calamity Loan',
          principal_amount: calRepayment,
          interest_amount: calInterest,
          amount: calRepayment + calInterest,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Calamity Loan Repayment',
          collected_by: currentUser
        });
      }

      // 3. UTILITY LOAN
      const utRepayment = getAmount(m => /utility/i.test(m.group || m.label) && /repay|principal/i.test(m.sub));
      const utInterest = getAmount(m => /utility/i.test(m.group || m.label) && /interest/i.test(m.sub));
      if (utRepayment > 0 || utInterest > 0) {
        rowItems.push({
          id: `imp-${r}-ut-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Utility Loan',
          principal_amount: utRepayment,
          interest_amount: utInterest,
          amount: utRepayment + utInterest,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Utility Loan Repayment',
          collected_by: currentUser
        });
      }

      // 4. CASH EXPRESS LOAN
      const ceRepayment = getAmount(m => /cash\s*express/i.test(m.group || m.label) && /repay|principal/i.test(m.sub));
      const ceInterest = getAmount(m => /cash\s*express/i.test(m.group || m.label) && /interest/i.test(m.sub));
      if (ceRepayment > 0 || ceInterest > 0) {
        rowItems.push({
          id: `imp-${r}-ce-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Cash Express Loan',
          principal_amount: ceRepayment,
          interest_amount: ceInterest,
          amount: ceRepayment + ceInterest,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Cash Express Repayment',
          collected_by: currentUser
        });
      }

      // 5. SPECIAL OCCASION LOAN
      const soRepayment = getAmount(m => /special\s*occasion/i.test(m.group || m.label) && /repay|principal/i.test(m.sub));
      const soInterest = getAmount(m => /special\s*occasion/i.test(m.group || m.label) && /interest/i.test(m.sub));
      if (soRepayment > 0 || soInterest > 0) {
        rowItems.push({
          id: `imp-${r}-so-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Special Occasion Loan',
          principal_amount: soRepayment,
          interest_amount: soInterest,
          amount: soRepayment + soInterest,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Special Occasion Repayment',
          collected_by: currentUser
        });
      }

      // 6. EMERGENCY LOAN
      const emRepayment = getAmount(m => /emergency/i.test(m.group || m.label) && /repay|principal/i.test(m.sub));
      const emInterest = getAmount(m => /emergency/i.test(m.group || m.label) && /interest/i.test(m.sub));
      if (emRepayment > 0 || emInterest > 0) {
        rowItems.push({
          id: `imp-${r}-em-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Emergency Loan',
          principal_amount: emRepayment,
          interest_amount: emInterest,
          amount: emRepayment + emInterest,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Emergency Loan Repayment',
          collected_by: currentUser
        });
      }

      // 7. RICE LOAN PAYMENT
      const riceLoan = getAmount(m => /rice\s*loan/i.test(m.group || m.label || m.sub));
      if (riceLoan > 0) {
        rowItems.push({
          id: `imp-${r}-rl-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Rice Loan',
          principal_amount: riceLoan,
          interest_amount: 0,
          amount: riceLoan,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Rice Loan Payment',
          collected_by: currentUser
        });
      }

      // 8. LAUNDRY SOAP LOAN PAYMENT
      const soapLoan = getAmount(m => /laundry\s*soap\s*loan/i.test(m.group || m.label || m.sub));
      if (soapLoan > 0) {
        rowItems.push({
          id: `imp-${r}-sl-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Laundry Soap Loan',
          principal_amount: soapLoan,
          interest_amount: 0,
          amount: soapLoan,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Laundry Soap Loan Payment',
          collected_by: currentUser
        });
      }

      // 9. FINES & PENALTIES
      const fines = getAmount(m => /fine/i.test(m.group || m.label || m.sub));
      if (fines > 0) {
        rowItems.push({
          id: `imp-${r}-fn-${Math.random().toString(36).substring(7)}`,
          tab: 'services',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          service_type: 'Fines & Late Charges',
          amount: fines,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Penalty fee collection',
          collected_by: currentUser
        });
      }

      // 10. MEMBERSHIP FEE
      const memFee = getAmount(m => /membership\s*fee/i.test(m.group || m.label || m.sub));
      if (memFee > 0) {
        rowItems.push({
          id: `imp-${r}-mf-${Math.random().toString(36).substring(7)}`,
          tab: 'services',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          service_type: 'Membership Application Fee',
          amount: memFee,
          payment_method: paymentMethod,
          remarks: rawDetails || 'New member PMES/Onboarding fee',
          collected_by: currentUser
        });
      }

      // 11. INSURANCE CLIMBS / COOP
      const insClimbs = getAmount(m => /insurance\s*climbs|climbs/i.test(m.group || m.label || m.sub));
      if (insClimbs > 0) {
        rowItems.push({
          id: `imp-${r}-ic-${Math.random().toString(36).substring(7)}`,
          tab: 'services',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          service_type: 'CLIMBS / Coop Insurance',
          amount: insClimbs,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Insurance remittance',
          collected_by: currentUser
        });
      }

      // 12. CIPL INSURANCE
      const cipl = getAmount(m => /cipl/i.test(m.group || m.label || m.sub));
      if (cipl > 0) {
        rowItems.push({
          id: `imp-${r}-cp-${Math.random().toString(36).substring(7)}`,
          tab: 'services',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          service_type: 'CIPL Insurance',
          amount: cipl,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Credit Life Insurance Protection',
          collected_by: currentUser
        });
      }

      // 13. RICE SALES
      const riceSales = getAmount(m => /rice\s*sales/i.test(m.group || m.label || m.sub));
      if (riceSales > 0) {
        rowItems.push({
          id: `imp-${r}-rs-${Math.random().toString(36).substring(7)}`,
          tab: 'sales',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          item_name: 'Rice (Store Sales)',
          item_category: 'Merchandise',
          quantity: 1,
          unit_price: riceSales,
          amount: riceSales,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Store rice sales',
          collected_by: currentUser
        });
      }

      // 14. LAUNDRY SOAP SALES
      const soapSales = getAmount(m => /laundry\s*soap\s*sales/i.test(m.group || m.label || m.sub));
      if (soapSales > 0) {
        rowItems.push({
          id: `imp-${r}-ss-${Math.random().toString(36).substring(7)}`,
          tab: 'sales',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          item_name: 'Laundry Soap (Store Sales)',
          item_category: 'Merchandise',
          quantity: 1,
          unit_price: soapSales,
          amount: soapSales,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Store laundry soap sales',
          collected_by: currentUser
        });
      }

      // 15. MERCHANDISE / UNIFORMS
      const merch = getAmount(m => /merchandise|uniform/i.test(m.group || m.label || m.sub));
      if (merch > 0) {
        rowItems.push({
          id: `imp-${r}-mc-${Math.random().toString(36).substring(7)}`,
          tab: 'sales',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          item_name: 'Store Merchandise / Uniforms',
          item_category: 'Merchandise',
          quantity: 1,
          unit_price: merch,
          amount: merch,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Merchandise sales',
          collected_by: currentUser
        });
      }

      // 16. SHARED CAPITAL / FIXED DEPOSIT
      const sharedCap = getAmount(m => /shared\s*capital|share\s*capital|fixed\s*deposit/i.test(m.group || m.label || m.sub));
      if (sharedCap > 0) {
        rowItems.push({
          id: `imp-${r}-sc-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Shared Capital / Fixed Deposit',
          particulars: 'Shared Capital / Fixed Deposit Contribution',
          principal_amount: sharedCap,
          interest_amount: 0,
          other_category: 'Share Capital',
          amount: sharedCap,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Share capital deposit',
          collected_by: currentUser
        });
      }

      // 17. DONATION
      const donation = getAmount(m => m.label.includes('donation') && !m.label.includes('grant'));
      if (donation > 0) {
        rowItems.push({
          id: `imp-${r}-dn-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Member Donation',
          particulars: 'Member Donation',
          principal_amount: donation,
          interest_amount: 0,
          other_category: 'Donation',
          amount: donation,
          payment_method: paymentMethod,
          remarks: rawDetails || 'General donation',
          collected_by: currentUser
        });
      }

      // 18. GRANTS & DONATION
      const grants = getAmount(m => /grant/i.test(m.label));
      if (grants > 0) {
        rowItems.push({
          id: `imp-${r}-gd-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: 'Grants & Institutional Donation',
          particulars: 'Grants & Institutional Donation',
          principal_amount: grants,
          interest_amount: 0,
          other_category: 'Grants & Donation',
          amount: grants,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Institutional grant',
          collected_by: currentUser
        });
      }

      // Fallback: If cashOnHand > 0 but none of the specific breakdown columns had values
      if (rowItems.length === 0 && rawCashOnHand > 0) {
        rowItems.push({
          id: `imp-${r}-misc-${Math.random().toString(36).substring(7)}`,
          tab: 'credit',
          date: parsedDate,
          or_no: invoiceNo,
          payor_name: rawPayee,
          loan_account: rawDetails || 'Collection Receipt',
          particulars: rawDetails || 'Collection Receipt',
          principal_amount: rawCashOnHand,
          interest_amount: 0,
          other_category: 'General Collection',
          amount: rawCashOnHand,
          payment_method: paymentMethod,
          remarks: rawDetails || 'Imported receipt',
          collected_by: currentUser
        });
      }

      const sumItems = rowItems.reduce((acc, it) => acc + it.amount, 0);
      const isDiscrepancy = rawCashOnHand > 0 && Math.abs(sumItems - rawCashOnHand) > 0.05;

      finalBreakdowns.push({
        id: `row-${r}`,
        date: parsedDate,
        payee: rawPayee,
        invoiceNo,
        cashOnHand: rawCashOnHand,
        details: rawDetails,
        items: rowItems,
        rowTotal: sumItems,
        isDiscrepancy
      });
    }

    setParsedBreakdowns(finalBreakdowns);
  };

  // Switch sheet
  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    if (workbook) {
      parseSheet(workbook, sheet);
    }
  };

  // Flattened all items to import
  const allParsedItems = useMemo(() => {
    return parsedBreakdowns.flatMap(b => b.items);
  }, [parsedBreakdowns]);

  // Statistics
  const stats = useMemo(() => {
    let creditTotal = 0;
    let salesTotal = 0;
    let servicesTotal = 0;

    let creditCount = 0;
    let salesCount = 0;
    let servicesCount = 0;

    for (const item of allParsedItems) {
      if (item.tab === 'credit') {
        creditTotal += item.amount;
        creditCount++;
      } else if (item.tab === 'sales') {
        salesTotal += item.amount;
        salesCount++;
      } else if (item.tab === 'services') {
        servicesTotal += item.amount;
        servicesCount++;
      }
    }

    const totalCashOnHand = parsedBreakdowns.reduce((sum, b) => sum + (b.cashOnHand || b.rowTotal), 0);
    const discrepanciesCount = parsedBreakdowns.filter(b => b.isDiscrepancy).length;

    return {
      totalRows: parsedBreakdowns.length,
      totalItems: allParsedItems.length,
      totalCashOnHand,
      creditTotal,
      creditCount,
      salesTotal,
      salesCount,
      servicesTotal,
      servicesCount,
      discrepanciesCount
    };
  }, [parsedBreakdowns, allParsedItems]);

  // Filtered preview items
  const filteredPreviewBreakdowns = useMemo(() => {
    if (activePreviewTab === 'all') return parsedBreakdowns;
    return parsedBreakdowns.filter(b => b.items.some(it => it.tab === activePreviewTab));
  }, [parsedBreakdowns, activePreviewTab]);

  // Execute import
  const handleConfirmImport = () => {
    if (allParsedItems.length === 0) return;
    onImportComplete(allParsedItems, importMode);
    onClose();
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-container-lowest border border-outline-variant/60 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-outline-variant/50 flex items-center justify-between bg-neutral-50/50 dark:bg-surface-container-low/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-headline text-neutral-900 dark:text-white flex items-center gap-2">
                Import Invoice & Acknowledgement Receipts
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  .XLSX Parser
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Directly maps your 2026 monthly invoice sheets into Credit, Sales, Services & Others collections.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload Dropzone */}
          {!file ? (
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-4 ring-emerald-500/10'
                  : 'border-outline-variant/60 hover:border-emerald-500 hover:bg-neutral-50/50 dark:hover:bg-surface-container-low/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-4 border border-emerald-600/20">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Upload your "INVOICE & Acknowledgement Receipt 2026.xlsx"
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-4">
                Drag and drop your Excel spreadsheet here, or click to browse files. The parser automatically detects all columns (Regular, Calamity, Utility, Rice, Shared Capital, etc.).
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-mono font-medium text-neutral-600 dark:text-neutral-300">
                <span>Supported: .xlsx, .xls</span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* File Info & Sheet Switcher */}
              <div className="p-4 rounded-2xl border border-outline-variant/50 bg-neutral-50/70 dark:bg-surface-container-low/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-600/20">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <span>{file.name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                      <span>Parsed from active sheet:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">
                        {selectedSheet}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Animated Sheet Selector Dropdown */}
                  <div ref={dropdownRef} className="relative flex items-center gap-1.5">
                    <span className="text-xs text-neutral-500 font-medium">Sheet Tab:</span>
                    <button
                      type="button"
                      onClick={() => setIsSheetDropdownOpen(prev => !prev)}
                      className="inline-flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-600/40 bg-white dark:bg-surface-container-lowest text-neutral-900 dark:text-white shadow-2xs hover:border-emerald-500 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <span className="truncate max-w-[150px]">{selectedSheet || 'Select Sheet'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ${
                          isSheetDropdownOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {isSheetDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1.5 w-60 max-h-64 overflow-y-auto rounded-2xl border border-outline-variant/60 bg-white dark:bg-neutral-900 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1 border-b border-outline-variant/30 mb-1 flex items-center justify-between">
                          <span>Sheets in Workbook</span>
                          <span className="text-neutral-500 font-mono font-normal">({sheetNames.length})</span>
                        </div>
                        <div className="space-y-0.5">
                          {sheetNames.map(sheet => {
                            const isSelected = sheet === selectedSheet;
                            return (
                              <button
                                key={sheet}
                                type="button"
                                onClick={() => {
                                  handleSheetChange(sheet);
                                  setIsSheetDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                                  isSelected
                                    ? 'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold'
                                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                              >
                                <span className="truncate">{sheet}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300 shrink-0 ml-1" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Change file */}
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setWorkbook(null);
                      setParsedBreakdowns([]);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 flex items-center gap-3 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Statistics Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl border border-outline-variant/50 bg-white dark:bg-surface-container-lowest">
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Total Payees
                  </div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    {stats.totalRows}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {stats.totalItems} collection records
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-emerald-600/30 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    <span>Credit</span>
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-900 dark:text-emerald-200 mt-1">
                    ₱{stats.creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                    {stats.creditCount} amortizations & shares
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-outline-variant/50 bg-white dark:bg-surface-container-lowest">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" />
                    <span>Sales</span>
                  </div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    ₱{stats.salesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {stats.salesCount} store items
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-outline-variant/50 bg-white dark:bg-surface-container-lowest">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    <span>Services</span>
                  </div>
                  <div className="text-lg font-black font-mono text-neutral-900 dark:text-white mt-1">
                    ₱{stats.servicesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">
                    {stats.servicesCount} fees & insurance
                  </div>
                </div>
              </div>

              {/* Preview Table Header & Category Tabs */}
              <div className="border border-outline-variant/60 rounded-2xl overflow-hidden bg-white dark:bg-surface-container-lowest">
                <div className="p-3.5 border-b border-outline-variant/40 flex items-center justify-between bg-neutral-50/50 dark:bg-surface-container-low/30 flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activePreviewTab === 'all'
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      All Payees ({parsedBreakdowns.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('credit')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activePreviewTab === 'credit'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>Credit ({stats.creditCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('sales')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activePreviewTab === 'sales'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>Sales ({stats.salesCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('services')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activePreviewTab === 'services'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Services ({stats.servicesCount})</span>
                    </button>
                  </div>

                  <div className="text-xs text-neutral-500 font-mono">
                    Total Sheet Cash on Hand:{' '}
                    <span className="font-bold text-neutral-900 dark:text-white">
                      ₱{stats.totalCashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-20 bg-neutral-100 dark:bg-neutral-800 shadow-xs border-b border-outline-variant/60">
                      <tr>
                        <th className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold">Date</th>
                        <th className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold">Invoice #</th>
                        <th className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold">Payee / Member</th>
                        <th className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold">Details</th>
                        <th className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold">Breakdown Items</th>
                        <th className="py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-right">Cash On Hand</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {filteredPreviewBreakdowns.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-neutral-400">
                            No records found under this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewBreakdowns.map(row => (
                          <tr key={row.id} className="hover:bg-neutral-50/70 dark:hover:bg-surface-container-low/30">
                            <td className="py-2.5 px-3 font-mono text-neutral-600 dark:text-neutral-400">
                              {row.date}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 dark:text-white">
                              {row.invoiceNo}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-neutral-800 dark:text-neutral-200">
                              {row.payee}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-500">
                              {row.details || '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1">
                                {row.items.map(item => (
                                  <span
                                    key={item.id}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      item.tab === 'credit'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                        : item.tab === 'sales'
                                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300'
                                        : item.tab === 'services'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                                    }`}
                                  >
                                    <span>
                                      {item.loan_account || item.item_name || item.service_type || item.particulars || item.tab}:
                                    </span>
                                    <span>₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-neutral-900 dark:text-white">
                              ₱{row.cashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Options */}
              <div className="p-4 rounded-2xl border border-outline-variant/50 bg-neutral-50/50 dark:bg-surface-container-low/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                    Import Mode:
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Choose whether to append these entries to existing collections or replace existing records.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'append'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'border border-outline-variant/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                    }`}
                  >
                    Append to Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'border border-outline-variant/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                    }`}
                  >
                    Replace All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/50 flex items-center justify-between bg-neutral-50/50 dark:bg-surface-container-low/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {file && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={allParsedItems.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Check className="w-4 h-4" />
              <span>
                Import {allParsedItems.length} Records into Collection (₱{stats.totalCashOnHand.toLocaleString('en-US', { minimumFractionDigits: 2 })})
              </span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
