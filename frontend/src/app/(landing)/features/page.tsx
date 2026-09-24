'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  PiggyBank,
  Calculator,
  CalendarDays,
  FileSpreadsheet,
  ChevronDown,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

const features = [
  {
    num: '01',
    icon: ShieldCheck,
    title: 'Authentication & Security',
    desc: 'Secured with Role-Based Access Controls (RBAC) ensuring isolation between general cooperative administrators, managers, and member portals.',
    primaryTag: 'Session Encryption',
    secondaryTag: 'Role-Based (RBAC)',
  },
  {
    num: '02',
    icon: Users,
    title: 'Member Records Ledger',
    desc: 'Centralized registry storing member profile states (active, suspended, inactive) alongside detailed demographic, department, and seafarer records.',
    primaryTag: 'KYC & Campus ID',
    secondaryTag: 'Real-Time Sync',
  },
  {
    num: '03',
    icon: PiggyBank,
    title: 'Capital & Deposit Management',
    desc: 'Tracks member equity contributions (Share Capital) and fixed deposit placement contracts, calculating patronage refund & dividend milestones.',
    primaryTag: 'Dividend Accruals',
    secondaryTag: 'Annual Yields',
  },
  {
    num: '04',
    icon: Calculator,
    title: 'Loan Calculation Engine',
    desc: 'High-precision computational libraries supporting straight flat-rate profiles, diminishing balance formulas, and customizable grace period buffers.',
    primaryTag: 'Diminishing Balance',
    secondaryTag: '100% Accurate',
  },
  {
    num: '05',
    icon: CalendarDays,
    title: 'Billing & Collection Schedules',
    desc: 'Forecasts upcoming payroll deduction cycles and schedules, automatically classifying overdue amortization balances into 30/60/90+ day aging tranches.',
    primaryTag: 'Aging Tranches',
    secondaryTag: 'Payroll Deductible',
  },
  {
    num: '06',
    icon: FileSpreadsheet,
    title: 'Analytical Exports & Reports',
    desc: 'Generates comprehensive cash disbursement records, journal registers, and delinquency views with seamless one-click downloads in standard Excel formats.',
    primaryTag: 'XLSX & OpenXML',
    secondaryTag: 'CDA Compatible',
  },
];

const faqs = [
  {
    q: 'How does the cooperative calculate monthly loan amortization?',
    a: 'Coop Sync integrates precision computational formulas for both standard flat-rate loans and reducing diminishing-balance loans. For diminishing balance calculations, each payment is split dynamically between principal paydown and interest accrued solely on the outstanding balance, with complete amortization schedules generated before loan confirmation.',
  },
  {
    q: 'Can members track their Share Capital and Fixed Deposit yields online?',
    a: 'Yes. The Member Records Ledger tracks individual member equity contributions, including paid-up share capital, retention balances, and fixed deposit contracts. Accrued interest yields and prospective dividend distributions are updated in real time for authorized members.',
  },
  {
    q: 'How are overdue repayments and aging tranches classified?',
    a: 'The billing engine forecasts upcoming payroll deduction milestones and automatically categorizes overdue balances into clear 30, 60, and 90+ day aging tranches. This ensures total repayment transparency for members and audit compliance for the credit committee.',
  },
  {
    q: 'Can transaction histories and ledger records be exported?',
    a: 'Authorized members and administrators can export complete transaction ledgers, cash disbursement summaries, and payment schedules with one click in standard Excel (.xlsx) and OpenXML formats aligned with Cooperative Development Authority (CDA) standards.',
  },
  {
    q: 'What should I do if I notice a discrepancy in my account records?',
    a: 'Members can visit the Contact page or reach out directly to the UC-METC Cooperative Office with their Member ID. The administrative board can immediately cross-reference physical receipts with system transaction logs to perform audit verification.',
  },
];

export default function FeaturesPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  return (
    <>
      <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-14">
        {/* Hero Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary animate-pulse" />
            Academic &amp; Maritime Coop Core
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-primary dark:text-secondary tracking-tight">
            System Modules &amp; Capabilities
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Coop Sync provides institutional-grade loan calculation algorithms, immutable ledger structures, and audit compliance tracing purpose-built for maritime academies and campus cooperatives.
          </p>
        </header>

        {/* 6 Capabilities Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="group relative flex flex-col justify-between p-6 sm:p-7 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                {/* Top Row: Icon + Numeric Counter */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary transition-colors group-hover:bg-primary group-hover:text-white dark:group-hover:bg-secondary dark:group-hover:text-neutral-950">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-headline text-2xl sm:text-3xl font-bold text-outline-variant/50 dark:text-neutral-700 select-none">
                      {f.num}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h2 className="mt-5 font-headline text-lg font-bold text-on-surface dark:text-white">
                    {f.title}
                  </h2>
                  <p className="mt-2.5 font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                {/* Bottom Tags */}
                <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 dark:bg-secondary/10 font-semibold text-primary dark:text-secondary text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary" />
                    {f.primaryTag}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400 text-[11px] font-medium">
                    {f.secondaryTag}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Auditable & Compliant Banner */}
        <section className="p-6 sm:p-7 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface dark:text-white">
                    Auditable &amp; Compliant
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-[11px] font-semibold border border-primary/20 dark:border-secondary/20">
                    CDA Formats
                  </span>
                </div>
                <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                  Every financial transaction and calculation ledger generated inside the system strictly mirrors cooperative audit mandates. Export formats are cryptographically signed and verifiable.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-center flex-shrink-0 pt-2 lg:pt-0">
              <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                Engine Powered By
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-bold tracking-wide uppercase border border-primary/20 dark:border-secondary/20">
                KADT Solutions
              </span>
            </div>
          </div>
        </section>

        {/* Actionable FAQ Section */}
        <section className="p-6 sm:p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-6 shadow-sm">
          <div className="space-y-2 pb-2 border-b border-outline-variant/30">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-primary dark:text-secondary">
              <HelpCircle className="w-4 h-4" />
              User Guidelines
            </div>
            <h2 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              Concrete answers regarding calculation methods, ledger access, and member procedures.
            </p>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4 first:pt-2 last:pb-2">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between text-left gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                  >
                    <span className="font-headline text-sm sm:text-base font-bold text-on-surface dark:text-neutral-200 group-hover:text-primary dark:group-hover:text-secondary transition-colors">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-primary dark:text-secondary' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-3 pr-6 font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Member Access CTA (Before Untouched Footer) */}
        <section className="p-8 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl text-center space-y-4 shadow-sm">
          <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface dark:text-white">
            Ready to explore your cooperative portal?
          </h3>
          <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
            Register your campus profile or sign in to view your personal share capital contributions, active loans, and billing schedules.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs sm:text-sm font-bold rounded-full shadow-sm hover:translate-y-[-1px] transition-all"
            >
              Register Account
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 border border-outline-variant/60 rounded-full text-xs sm:text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all inline-flex items-center gap-1.5 text-on-surface dark:text-neutral-200"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
