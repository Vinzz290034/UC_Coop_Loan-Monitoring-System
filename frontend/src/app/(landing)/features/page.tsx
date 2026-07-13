'use client';

import React from 'react';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';
import { ShieldCheck, Users, PiggyBank, Banknote, CalendarDays, FileSpreadsheet } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Authentication & Security',
      desc: 'Secured with Role-Based Access Controls (RBAC) ensuring isolation between general cooperative administrators, managers, and members.'
    },
    {
      icon: <Users className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Member Records Ledger',
      desc: 'Centralized registry storing member profile states (active, suspended, inactive) alongside detailed demographic records for audits.'
    },
    {
      icon: <PiggyBank className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Capital & Deposit Management',
      desc: 'Tracks member equity contributions (Share Capital) and fixed deposit placement contracts, calculating interest yield milestones.'
    },
    {
      icon: <Banknote className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Loan Calculation Engine',
      desc: 'Includes high-precision calculation libraries supporting flat-rate amortization profiles and diminishing reducing-balance interest formulas.'
    },
    {
      icon: <CalendarDays className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Billing & Collection Schedules',
      desc: 'Forecasts upcoming billing cycles and schedules installments, automatically sorting overdue balances into aging tranches (30/60/90+ days).'
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Analytical Exports & Reports',
      desc: 'Generates comprehensive cash disbursement and transaction history views, with direct download to standard Excel spreadsheets.'
    }
  ];

  return (
    <div className="bg-background dark:bg-surface-container-low text-on-surface dark:text-neutral-100 transition-colors min-h-screen">
      <LandingNavbar activeIndex={1} />

      <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-12">
        <header className="text-center space-y-4">
          <h1 className="font-headline text-4xl font-extrabold text-primary dark:text-secondary">
            System Modules &amp; Capabilities
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            SynCo provides institutional-grade loan calculation algorithms and audit compliance tracing built for campus cooperatives.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {features.map((f, i) => (
            <div key={i} className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-headline text-base font-bold">{f.title}</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Technical Notice block */}
        <section className="p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="flex-1 space-y-2">
            <h4 className="font-headline text-sm font-bold text-primary dark:text-secondary">Auditable &amp; Compliant</h4>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every financial transaction and calculation ledger generated inside the system follows strict cooperative audit compliance guidelines. Calculation results can be exported as structured OpenXML formats for reference.
            </p>
          </div>
          <div className="text-[10px] text-neutral-500 font-bold font-mono border-t md:border-t-0 md:border-l border-outline-variant/50 pt-4 md:pt-0 md:pl-6 text-center md:text-left">
            ENGINE POWERED BY KADT SOLUTIONS
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
