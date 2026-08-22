'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Globe,
  Mail,
  Cpu,
  X,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Layers,
  Banknote,
  PiggyBank,
  Clock,
  ShieldCheck,
} from 'lucide-react';

// ── Props ─────────────────────────────────────────────────────────────────────
interface LandingFooterProps {
  /** Highlight the active legal page link in the footer. */
  activeLegal?: 'terms' | 'privacy' | null;
}

interface ModalContent {
  tag: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  details: { label: string; value: string }[];
  actionLabel?: string;
  actionHref?: string;
}

const MODAL_DATA: Record<string, ModalContent> = {
  regular_loan: {
    tag: 'Cooperative Credit Product',
    title: 'Regular Cash Loans',
    icon: <Banknote className="w-6 h-6 text-primary dark:text-secondary" />,
    description:
      'Designed for major financial milestones, tuition/education funding, and personal financing for active members of the UC METC Multipurpose Cooperative.',
    details: [
      { label: 'Repayment Terms', value: 'Flexible 6 to 24 Months repayment schedules' },
      { label: 'Calculation Methods', value: 'Supported via Flat-Rate or Diminishing Balance logic' },
      { label: 'Eligibility', value: 'Active regular members with verified share capital equity' },
      { label: 'Disbursement Mode', value: 'Fast ledger crediting or direct cash release upon approval' },
    ],
    actionLabel: 'Apply for Regular Loan',
    actionHref: '/login',
  },
  stl_loan: {
    tag: 'Emergency & Fast Credit',
    title: 'Short-Term Loans (STL)',
    icon: <Clock className="w-6 h-6 text-primary dark:text-secondary" />,
    description:
      'Quick-turnaround credit assistance for urgent needs, emergency personal requirements, and short-cycle financial bridges.',
    details: [
      { label: 'Repayment Terms', value: '1 to 3 Months short-term repayment duration' },
      { label: 'Processing Time', value: 'Expedited evaluation with direct ledger verification' },
      { label: 'Payment Options', value: 'Scheduled installments or payroll/salary deduction' },
      { label: 'Borrowing Limit', value: 'Proportional to member standing and share capital balance' },
    ],
    actionLabel: 'Apply for STL',
    actionHref: '/login',
  },
  product_loan: {
    tag: 'Financing & Equipment',
    title: 'Product & Appliance Loans',
    icon: <Layers className="w-6 h-6 text-primary dark:text-secondary" />,
    description:
      'Specialized installment financing program for laptops, work appliances, educational equipment, and partner merchant goods.',
    details: [
      { label: 'Installment Terms', value: '6 to 12 Months structured monthly installments' },
      { label: 'Downpayment', value: 'Flexible or 0% downpayment subject to credit rating' },
      { label: 'Documentation', value: 'Merchant quotation/invoice & cooperative loan agreement' },
      { label: 'Interest Rate', value: 'Low cooperative interest with transparent schedule' },
    ],
    actionLabel: 'Inquire for Product Loan',
    actionHref: '/login',
  },
  share_capital: {
    tag: 'Member Equity & Growth',
    title: 'Share Capital Ledger',
    icon: <PiggyBank className="w-6 h-6 text-primary dark:text-secondary" />,
    description:
      'The foundational equity investment of every member in the UC METC Multipurpose Cooperative, which determines voting power, loan limits, and annual dividend yields.',
    details: [
      { label: 'Target Annual Yield', value: '+5.0% Target annual dividend distribution' },
      { label: 'Equity Ownership', value: 'Non-withdrawable during active membership; builds long-term net worth' },
      { label: 'Ledger Auditability', value: 'Recorded in official immutable admin-verified ledgers' },
      { label: 'Credit Multiplier', value: 'Serves as primary collateral and basis for loan borrowing limits' },
    ],
    actionLabel: 'View Member Portal',
    actionHref: '/login',
  },
  fixed_deposit: {
    tag: 'High-Yield Placements',
    title: 'Fixed Deposit Registry',
    icon: <ShieldCheck className="w-6 h-6 text-primary dark:text-secondary" />,
    description:
      'Time-deposit placement contracts offering higher fixed interest yield milestones compared to regular savings accounts.',
    details: [
      { label: 'Contract Durations', value: 'Flexible lock-in options (6, 12, or 24 Months)' },
      { label: 'Guaranteed Return', value: 'Contractual fixed yield paid upon maturity date' },
      { label: 'Certification', value: 'Official certificate of time deposit issued by the Coop office' },
      { label: 'Premature Termination', value: 'Subject to cooperative terms and interest adjustment rules' },
    ],
    actionLabel: 'Contact Coop Office',
    actionHref: '/contact',
  },
};

// ── Footer column config ──────────────────────────────────────────────────────
const FOOTER_COLUMNS = [
  {
    title: 'Loan Products',
    links: [
      { label: 'Regular Cash Loans', modalKey: 'regular_loan' },
      { label: 'Short-Term Loans (STL)', modalKey: 'stl_loan' },
      { label: 'Product & Appliance Loans', modalKey: 'product_loan' },
    ],
  },
  {
    title: 'Member Services',
    links: [
      { label: 'Share Capital Ledger', modalKey: 'share_capital' },
      { label: 'Fixed Deposit Registry', modalKey: 'fixed_deposit' },
      { label: 'Loan Schedule Calculator', href: '/how-it-works' },
    ],
  },
  {
    title: 'Cooperative',
    links: [
      { label: 'About UC METC Coop', href: '/about' },
      { label: 'Office & Contact Info', href: '/contact' },
      { label: 'Terms & Conditions', href: '/terms' },
    ],
  },
] as const;

export default function LandingFooter({ activeLegal = null }: LandingFooterProps) {
  const [activeModalKey, setActiveModalKey] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModalKey(null);
      }
    };
    if (activeModalKey) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [activeModalKey]);

  const activeModalData = activeModalKey ? MODAL_DATA[activeModalKey] : null;

  return (
    <>
      <footer className="bg-neutral-50 dark:bg-neutral-950 border-t border-outline-variant/30 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-12 sm:pt-16 pb-10">

          {/* ── Main grid ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 md:gap-10 border-b border-outline-variant/20 dark:border-neutral-800 pb-12">

            {/* Brand column */}
            <div className="md:col-span-2 space-y-5">
              <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity w-fit">
                <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" className="w-8 h-8 object-contain" />
                <span className="font-brandname text-lg font-extrabold text-primary dark:text-secondary">Coop Sync</span>
              </Link>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 max-w-xs leading-relaxed">
                Transparent loan monitoring, automated amortization computation, and member ledger management for the <span className="font-semibold text-on-surface dark:text-neutral-200">University of Cebu - METC Multipurpose Cooperative</span>.
              </p>

              {/* Social/contact icon links */}
              <div className="flex gap-3">
                {[
                  { icon: <Globe className="w-4 h-4" />, label: 'About Us', href: '/about' },
                  { icon: <Mail className="w-4 h-4" />, label: 'Contact Office', href: '/contact' },
                ].map(s => (
                  <Link
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-primary dark:hover:text-secondary border border-outline-variant/30 dark:border-neutral-700 transition-all hover:scale-105 active:scale-95"
                  >
                    {s.icon}
                  </Link>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_COLUMNS.map(col => (
              <div key={col.title}>
                <h4 className="font-headline text-xs font-extrabold text-on-surface dark:text-white mb-4 tracking-wide uppercase">
                  {col.title}
                </h4>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l.label}>
                      {'modalKey' in l ? (
                        <button
                          type="button"
                          onClick={() => setActiveModalKey(l.modalKey)}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-secondary font-medium transition-colors text-left cursor-pointer flex items-center gap-1 group"
                        >
                          <span>{l.label}</span>
                          <span className="text-[10px] text-primary/60 dark:text-secondary/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            ↗
                          </span>
                        </button>
                      ) : (
                        <Link
                          href={l.href}
                          className="text-xs text-neutral-600 dark:text-neutral-400 hover:text-primary dark:hover:text-secondary font-medium transition-colors"
                        >
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── Bottom bar ──────────────────────────────────────────── */}
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex flex-col gap-1.5 text-left w-full sm:w-auto">
              <div>© 2026 UC Coop Loans / Coop Sync. All rights reserved.</div>
              <div className="text-[10px] text-neutral-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                Engineered &amp; Maintained by{' '}
                <span className="text-on-surface dark:text-white font-extrabold">KADT Solutions</span>
              </div>
            </div>

            {/* Legal links — cross-link Terms ↔ Privacy */}
            <div className="flex gap-6 self-start sm:self-center">
              <Link
                href="/terms"
                className={`transition-colors ${activeLegal === 'terms'
                  ? 'text-primary dark:text-secondary font-bold underline underline-offset-2'
                  : 'hover:text-primary dark:hover:text-secondary'
                  }`}
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className={`transition-colors ${activeLegal === 'privacy'
                  ? 'text-primary dark:text-secondary font-bold underline underline-offset-2'
                  : 'hover:text-primary dark:hover:text-secondary'
                  }`}
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Informational Detail Modal ───────────────────────────────── */}
      {activeModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-950/65 backdrop-blur-xs animate-modal-backdrop"
          onClick={() => setActiveModalKey(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl border border-outline-variant/60 dark:border-neutral-700/80 shadow-2xl p-6 sm:p-8 animate-modal-pop overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Top decorative gradient glow */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5 relative z-10">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  {activeModalData.icon}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/8 dark:bg-secondary/10 text-primary dark:text-secondary text-[11px] font-bold font-label mb-1">
                    <Building2 className="w-3 h-3" />
                    {activeModalData.tag}
                  </div>
                  <h3 className="font-headline text-xl sm:text-2xl font-extrabold text-on-surface dark:text-white">
                    {activeModalData.title}
                  </h3>
                </div>
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => setActiveModalKey(null)}
                className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-on-surface dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 relative z-10">
              <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {activeModalData.description}
              </p>

              {/* Detail Items Grid */}
              <div className="space-y-2.5 bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-outline-variant/40 dark:border-neutral-700/60">
                {activeModalData.details.map((d, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400 font-semibold flex items-center gap-1.5 flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                      {d.label}:
                    </span>
                    <span className="font-medium text-on-surface dark:text-neutral-200 sm:text-right">
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModalKey(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-outline-variant/60 dark:border-neutral-700 text-on-surface dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                {activeModalData.actionHref && (
                  <Link
                    href={activeModalData.actionHref}
                    onClick={() => setActiveModalKey(null)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <span>{activeModalData.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
