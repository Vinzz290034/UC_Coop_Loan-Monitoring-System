'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileCheck,
  RefreshCw,
  Link2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Layers,
  Banknote,
  DollarSign,
  ChevronDown
} from 'lucide-react';

interface RevolvingFundImportPreviewProps {
  fileName: string;
  sheetNames: string[];
  candidateSheets: string[];
  activeSheet: string;
  form: any;
  suggestedVouchers: any[];
  onSheetChange: (sheet: string) => Promise<void>;
  onExecuteImport: (form: any, cvId: string | null) => Promise<void>;
  onReset: () => void;
  isExecuting: boolean;
  isLoadingSheet: boolean;
}

export default function RevolvingFundImportPreview({
  fileName,
  sheetNames,
  candidateSheets,
  activeSheet,
  form,
  suggestedVouchers,
  onSheetChange,
  onExecuteImport,
  onReset,
  isExecuting,
  isLoadingSheet
}: RevolvingFundImportPreviewProps) {
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);

  if (!form) {
    return (
      <div className="p-12 text-center text-xs text-neutral-500 bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="font-bold text-sm">No Liquidation Form data found in sheet &ldquo;{activeSheet}&rdquo;.</p>
        <p className="mt-1">Try switching to one of the other sheets in your workbook.</p>
      </div>
    );
  }

  const authAmt = Number(form.authorized_amount || 0);
  const liqAmt = Number(form.total_liquidated || 0);
  const balAmt = authAmt - liqAmt;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-surface-container-low p-5 rounded-3xl border border-outline-variant/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
              Revolving Fund Liquidation Inspection
            </span>
            <span className="text-xs text-neutral-500">
              File: <strong className="text-neutral-800 dark:text-neutral-200">{fileName}</strong>
            </span>
            {form.existsInDb && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                Already in database (Will be updated)
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-headline text-on-surface dark:text-white mt-1">
            Review Liquidation Form: <span className="text-emerald-600 dark:text-emerald-400 font-mono">{form.lf_no}</span>
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            Verify the parsed RF voucher expenses, optionally link to its replenishment check voucher, and confirm import.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full hover:bg-neutral-200 transition-all cursor-pointer"
          >
            Choose Different File
          </button>
          <button
            onClick={() => onExecuteImport(form, selectedCvId)}
            disabled={isExecuting || !form.lf_no}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
          >
            {isExecuting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck className="w-4 h-4" />
            )}
            Import Liquidation Form ({form.lf_no})
          </button>
        </div>
      </div>

      {/* Sheet Selector Bar */}
      <div className="bg-white dark:bg-surface-container-low p-5 rounded-3xl border border-outline-variant/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Active Sheet Selected
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={activeSheet}
                onChange={e => onSheetChange(e.target.value)}
                disabled={isLoadingSheet || isExecuting}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-bold bg-neutral-100 dark:bg-neutral-800 border border-outline-variant/60 rounded-xl text-on-surface dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-xs sm:max-w-md"
              >
                {sheetNames.map(s => (
                  <option key={s} value={s}>
                    📄 {s} {candidateSheets.includes(s) ? '★ (RF Form)' : ''}
                  </option>
                ))}
              </select>
              {isLoadingSheet && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Scanning sheet...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick candidate switch tabs */}
        {candidateSheets.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-neutral-500 mr-1">RF Sheets:</span>
            {candidateSheets.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onSheetChange(s)}
                disabled={isLoadingSheet || isExecuting}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  s === activeSheet
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-on-surface'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            LF Identifier
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
            {form.lf_no}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Sheet: {activeSheet}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Amount for Liquidation
          </div>
          <div className="text-xl sm:text-2xl font-bold font-headline text-on-surface dark:text-white mt-1">
            ₱{authAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Authorized allocation
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Total Liquidated
          </div>
          <div className="text-xl sm:text-2xl font-bold font-headline text-emerald-600 dark:text-emerald-400 mt-1">
            ₱{liqAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {form.items?.filter((i: any) => !i.is_cancelled).length || 0} valid line items
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/50 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Remaining Balance
          </div>
          <div className="text-xl sm:text-2xl font-bold font-headline text-amber-600 dark:text-amber-400 mt-1">
            ₱{balAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            To replenish
          </div>
        </div>
      </div>

      {/* Optional: Link to Check Voucher Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-surface-container-low border border-outline-variant/60 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
          <Link2 className="w-4 h-4 text-emerald-600" />
          <span>Link to Replenishment Check Voucher (Optional):</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <select
            value={selectedCvId || ''}
            onChange={e => setSelectedCvId(e.target.value || null)}
            className="w-full sm:w-auto flex-1 px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 border border-outline-variant rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            <option value="">— Do not link now (can link anytime later) —</option>
            {suggestedVouchers.map(v => (
              <option key={v.id} value={v.id}>
                CV #{v.voucher_no} • {v.payee} • {v.bank} Check #{v.check_no || '—'} • ₱{Number(v.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {v.particulars ? `(${v.particulars})` : ''}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-neutral-500">
            Auto-filtered for Revolving Fund vouchers.
          </span>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white dark:bg-surface-container-low rounded-3xl border border-outline-variant/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/40 flex items-center justify-between">
          <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Discovered Line Items ({form.items?.length || 0})
          </h4>
          <span className="text-xs text-neutral-500">
            {form.period_start && `Period: ${form.period_start} to ${form.period_end || ''}`}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 z-10 bg-neutral-100/95 dark:bg-neutral-800/95 backdrop-blur-xs border-b border-outline-variant/40 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Purchase / Release Date</th>
                <th className="px-4 py-3">Particulars</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Remarks / Category</th>
                <th className="px-4 py-3">Notes / Purpose</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body">
              {(!form.items || form.items.length === 0) ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-400">
                    No items found on this sheet.
                  </td>
                </tr>
              ) : (
                form.items.map((item: any, idx: number) => (
                  <tr
                    key={idx}
                    className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/30 ${
                      item.is_cancelled ? 'opacity-50 line-through text-neutral-400' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-neutral-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono">
                      {item.item_date_raw || item.item_date || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-semibold">
                      {item.particulars}
                      {item.is_cancelled && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 no-underline">
                          CANCELLED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-neutral-700 dark:text-neutral-300">
                      {item.account_name || '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.category ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {item.category}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600 dark:text-neutral-400">
                      {item.remarks || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-right whitespace-nowrap">
                      {item.amount > 0 ? `₱${Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-neutral-100/60 dark:bg-neutral-800/60 font-bold border-t border-outline-variant/40">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right uppercase text-[11px]">
                  Total Liquidated:
                </td>
                <td className="px-4 py-3 font-mono text-right text-emerald-700 dark:text-emerald-400 text-sm">
                  ₱{liqAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
