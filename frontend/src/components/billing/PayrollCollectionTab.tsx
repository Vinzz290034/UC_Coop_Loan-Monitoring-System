'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Printer,
  Search,
  Building2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface PayrollCollectionTabProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

export default function PayrollCollectionTab({
  startDate,
  endDate,
  onDateChange,
}: PayrollCollectionTabProps) {
  const [collectionList, setCollectionList] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Preset cutoff choices
  const setPresetCutoff = (preset: 'first_half' | 'second_half' | 'current_month') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    if (preset === 'first_half') {
      onDateChange(`${year}-${month}-01`, `${year}-${month}-15`);
    } else if (preset === 'second_half') {
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      onDateChange(`${year}-${month}-16`, `${year}-${month}-${lastDay}`);
    } else {
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      onDateChange(`${year}-${month}-01`, `${year}-${month}-${lastDay}`);
    }
  };

  const fetchPayrollCollection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/billing/payroll-collection', {
        params: { start_date: startDate, end_date: endDate },
      });
      setCollectionList(response.data.data || []);
      setSummary(response.data.summary || null);
    } catch (err: any) {
      console.error('Error fetching payroll collection matrix:', err);
      setError(err.response?.data?.message || 'Failed to load payroll collection list.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPayrollCollection();
  }, [fetchPayrollCollection]);

  const formatMoney = (num: number) => {
    if (!num || num === 0) return '—';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter members by search query
  const filteredList = collectionList.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.member_no && item.member_no.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* TOOLBAR & CUTOFF PRESETS */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl p-5 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline text-sm font-bold text-on-surface dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary dark:text-secondary" />
              Payroll Deduction Cutoff Period
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              Generate the official METC Coop Salary Deduction List for Accounting.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPresetCutoff('first_half')}
              className="px-3 py-1.5 text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
            >
              1st Half (1st–15th)
            </button>
            <button
              type="button"
              onClick={() => setPresetCutoff('second_half')}
              className="px-3 py-1.5 text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
            >
              2nd Half (16th–31st)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Endorsement Sheet
            </button>
          </div>
        </div>

        {/* Date Filter & Search Row */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-outline-variant/30">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search employee name or Member ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-outline-variant/60 rounded-xl bg-neutral-50 dark:bg-surface-container focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onDateChange(e.target.value, endDate)}
                className="px-2.5 py-1.5 border border-outline-variant rounded-xl bg-white dark:bg-surface-container focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 font-medium">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onDateChange(startDate, e.target.value)}
                className="px-2.5 py-1.5 border border-outline-variant rounded-xl bg-white dark:bg-surface-container focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PRINTABLE OFFICIAL ENDORSEMENT DOCUMENT */}
      <div className="bg-white dark:bg-surface-container-low border border-outline-variant/60 rounded-3xl p-6 sm:p-10 shadow-lg space-y-6 text-on-surface dark:text-white print:border-none print:shadow-none print:p-0 print:m-0">
        
        {/* DOCUMENT HEADER / LETTERHEAD */}
        <div className="border-b-2 border-neutral-900 dark:border-neutral-100 pb-4 space-y-1 text-center">
          <h2 className="font-headline text-lg sm:text-xl font-black uppercase tracking-wider text-neutral-900 dark:text-white">
            UNIVERSITY OF CEBU - METC MULTIPURPOSE COOPERATIVE
          </h2>
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            UC-METC Campus, Alumnos, Mambaling, Cebu City
          </p>
        </div>

        {/* MEMORANDUM DETAILS */}
        <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-outline-variant/40 rounded-2xl p-4 sm:p-5 space-y-2 text-xs font-mono print:bg-transparent print:border-none print:p-0">
          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-1">
            <span className="font-bold text-neutral-500 uppercase">TO:</span>
            <span className="font-bold text-on-surface dark:text-white">MR. CARL TECSON, CPA (Cash-Accounting Head)</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-1">
            <span className="font-bold text-neutral-500 uppercase">FROM:</span>
            <span className="font-bold text-on-surface dark:text-white">UC-METC Multipurpose Cooperative</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-1">
            <span className="font-bold text-neutral-500 uppercase">RE:</span>
            <span className="font-bold text-primary dark:text-secondary uppercase">
              Billing / Collection List for Payroll Period ({startDate} to {endDate})
            </span>
          </div>
          <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-1">
            <span className="font-bold text-neutral-500 uppercase">DATE:</span>
            <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <p className="pt-3 font-sans text-xs italic text-neutral-700 dark:text-neutral-300">
            Greetings! This is to respectfully endorse to your office the METC Coop billing or collection list of employees who will be deducted from their salary for the payroll period of <strong className="not-italic text-on-surface dark:text-white">{startDate} to {endDate}</strong>, to wit:
          </p>
        </div>

        {/* COLLECTION MATRIX TABLE */}
        {loading ? (
          <SkeletonTable rows={10} cols={12} />
        ) : (
          <div className="overflow-x-auto border border-outline-variant/60 rounded-2xl print:border-neutral-900">
            <table className="w-full text-[11px] text-left border-collapse font-sans">
              <thead>
                {/* Main Header Row */}
                <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-b border-outline-variant/60 text-center font-bold font-headline uppercase text-[10px] tracking-wider">
                  <th rowSpan={2} className="p-2 border-r border-outline-variant/40 min-w-[80px]">ID NO.</th>
                  <th rowSpan={2} className="p-2 border-r border-outline-variant/40 text-left min-w-[180px]">NAME</th>
                  <th colSpan={2} className="p-2 border-r border-outline-variant/40 bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">CALAMITY</th>
                  <th colSpan={2} className="p-2 border-r border-outline-variant/40 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">EMER</th>
                  <th colSpan={2} className="p-2 border-r border-outline-variant/40 bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">CE</th>
                  <th colSpan={2} className="p-2 border-r border-outline-variant/40 bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">SO</th>
                  <th colSpan={1} className="p-2 border-r border-outline-variant/40 bg-pink-500/10 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300">RICE / SC</th>
                  <th colSpan={2} className="p-2 border-r border-outline-variant/40 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">REG</th>
                  <th rowSpan={2} className="p-2 border-r border-outline-variant/40 min-w-[65px] bg-red-500/10 text-red-600">FINES</th>
                  <th rowSpan={2} className="p-2 border-r border-outline-variant/40 min-w-[90px] bg-cyan-500/10 text-cyan-700">FIXED DEPOSIT</th>
                  <th rowSpan={2} className="p-2 min-w-[100px] bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-black">TOTAL</th>
                </tr>
                {/* Sub-Header Row */}
                <tr className="bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-b border-outline-variant/60 text-[9px] font-mono text-center">
                  <th className="p-1 border-r border-outline-variant/40">Int</th>
                  <th className="p-1 border-r border-outline-variant/40">Calamity</th>
                  <th className="p-1 border-r border-outline-variant/40">Int</th>
                  <th className="p-1 border-r border-outline-variant/40">Emer</th>
                  <th className="p-1 border-r border-outline-variant/40">Int</th>
                  <th className="p-1 border-r border-outline-variant/40">CE</th>
                  <th className="p-1 border-r border-outline-variant/40">Int</th>
                  <th className="p-1 border-r border-outline-variant/40">SO</th>
                  <th className="p-1 border-r border-outline-variant/40">Rice/SC</th>
                  <th className="p-1 border-r border-outline-variant/40">Int</th>
                  <th className="p-1 border-r border-outline-variant/40">Reg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-mono text-xs">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="p-8 text-center text-neutral-500 font-sans">
                      No payroll deductions scheduled for the selected cutoff range ({startDate} to {endDate}).
                    </td>
                  </tr>
                ) : (
                  filteredList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="p-2 border-r border-outline-variant/30 font-bold text-primary dark:text-secondary text-center whitespace-nowrap">
                        {row.member_no}
                      </td>
                      <td className="p-2 border-r border-outline-variant/30 font-sans font-bold text-on-surface dark:text-white uppercase whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="p-2 border-r border-outline-variant/30 text-right text-neutral-500">{formatMoney(row.calamity_int)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right font-medium">{formatMoney(row.calamity_principal)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right text-neutral-500">{formatMoney(row.emer_int)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right font-medium">{formatMoney(row.emer_principal)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right text-neutral-500">{formatMoney(row.ce_int)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right font-medium">{formatMoney(row.ce_principal)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right text-neutral-500">{formatMoney(row.so_int)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right font-medium">{formatMoney(row.so_principal)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right font-medium">{formatMoney(row.rice_principal + row.rice_int)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right text-neutral-500">{formatMoney(row.reg_int)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right font-medium">{formatMoney(row.reg_principal)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right text-red-500 font-bold">{formatMoney(row.fines)}</td>
                      <td className="p-2 border-r border-outline-variant/30 text-right text-cyan-600 dark:text-cyan-400 font-bold">{formatMoney(row.fixed_deposit)}</td>
                      <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                        ₱{formatMoney(row.total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* GRAND TOTAL FOOTER */}
              {summary && (
                <tfoot>
                  <tr className="bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 font-bold font-mono text-xs border-t-2 border-neutral-900">
                    <td colSpan={2} className="p-2.5 text-center uppercase tracking-wider font-headline font-black">
                      GRAND TOTAL
                    </td>
                    <td className="p-2 text-right">{formatMoney(summary.calamity_int)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.calamity_principal)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.emer_int)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.emer_principal)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.ce_int)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.ce_principal)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.so_int)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.so_principal)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.rice_principal + summary.rice_int)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.reg_int)}</td>
                    <td className="p-2 text-right">{formatMoney(summary.reg_principal)}</td>
                    <td className="p-2 text-right text-red-400">{formatMoney(summary.fines)}</td>
                    <td className="p-2 text-right text-cyan-400">{formatMoney(summary.fixed_deposit)}</td>
                    <td className="p-2 text-right text-emerald-400 font-black text-sm">
                      ₱{formatMoney(summary.grand_total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TOTAL CALLOUT BADGE */}
        {summary && (
          <div className="pt-4 border-t border-outline-variant/40">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 print:border-neutral-900 print:bg-transparent">
              <div>
                <span className="text-xs uppercase font-bold text-neutral-600 dark:text-neutral-400 tracking-wider">
                  Total Payroll Deduction Endorsement Sum:
                </span>
                <h3 className="font-headline text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  Total – ₱{summary.grand_total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-neutral-900 px-4 py-2 rounded-xl shadow-sm border border-emerald-500/20">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                Verified & Ready for Payroll Processing
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
