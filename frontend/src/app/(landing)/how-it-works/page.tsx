import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  UserPlus,
  ShieldCheck,
  FileCheck,
  Clock,
  Headphones,
  Phone,
} from 'lucide-react';

const steps = [
  {
    num: '01',
    phase: 'Phase 1: Registration',
    icon: UserPlus,
    title: 'Register Profile',
    desc: 'Create an account online using your cooperative details. New accounts are initially set to general member privileges with instant read-only catalog preview.',
    footerType: 'note',
    footerText: 'Requires Employee or Student ID',
  },
  {
    num: '02',
    phase: 'Phase 2: Validation',
    icon: ShieldCheck,
    title: 'Admin Verification',
    desc: 'The cooperative administration board reviews and verifies your profile status to connect it to your physical ledger accounts and historical contributions safely.',
    footerType: 'status',
    footerText: 'Approval: 1–2 Business Days',
    footerSubtext: 'Priority Verification',
  },
  {
    num: '03',
    phase: 'Phase 3: Real-Time',
    icon: FileCheck,
    title: 'Access Portal',
    desc: 'Log in to view active credit balances, monitor share capital contributions, request withdrawals, or track payment schedules anytime across any device.',
    footerType: 'tags',
    tags: ['Share Capital', 'Loan Schedule'],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-14">
        {/* Hero Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:bg-secondary/10 dark:text-secondary border border-primary/20 dark:border-secondary/20 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary animate-pulse" />
            3-Minute Member Onboarding
          </div>
          <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-primary dark:text-secondary tracking-tight">
            How to Access Your Account
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            A simple 3-step setup to access member dashboards, dividend records, and digital financial statements.
          </p>
        </header>

        {/* 3 Step Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="group relative flex flex-col justify-between p-6 sm:p-7 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div>
                  {/* Top Row: Icon + Numeric Glyph */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary transition-colors group-hover:bg-primary group-hover:text-white dark:group-hover:bg-secondary dark:group-hover:text-neutral-950">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-headline text-2xl sm:text-3xl font-bold text-outline-variant/50 dark:text-neutral-700 select-none">
                      {s.num}
                    </span>
                  </div>

                  {/* Phase Badge */}
                  <div className="mt-5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-[11px] font-semibold">
                      {s.phase}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h2 className="mt-2.5 font-headline text-lg sm:text-xl font-bold text-on-surface dark:text-white">
                    {s.title}
                  </h2>
                  <p className="mt-2.5 font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {/* Bottom Step Metadata */}
                <div className="mt-6 pt-4 border-t border-outline-variant/20">
                  {s.footerType === 'note' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary dark:text-secondary group-hover:translate-x-0.5 transition-transform">
                      {s.footerText}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {s.footerType === 'status' && (
                    <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-primary dark:text-secondary" />
                        {s.footerText}
                      </span>
                      <span className="text-primary dark:text-secondary font-bold text-[11px]">
                        {s.footerSubtext}
                      </span>
                    </div>
                  )}

                  {s.footerType === 'tags' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.tags?.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Secretariat Support / Physical Desk Banner */}
        <section className="p-6 sm:p-7 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-secondary/10 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0 mt-0.5">
                <Headphones className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface dark:text-white">
                  Need Immediate Assistance?
                </h3>
                <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xl">
                  Visit the UC-METC MPC Secretariat at the Maritime Admin Complex or reach our desk support for priority passbook synchronization.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-start md:self-center flex-shrink-0 pt-2 md:pt-0">
              <div className="text-left sm:text-right">
                <div className="font-headline text-sm font-bold text-primary dark:text-secondary">
                  +63 (032) 410-8811
                </div>
                <div className="font-body text-[11px] text-neutral-500">
                  Office Hours: Mon–Fri 8am–4pm
                </div>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-bold hover:bg-primary hover:text-white dark:hover:bg-secondary dark:hover:text-neutral-950 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Contact Office
              </Link>
            </div>
          </div>
        </section>

        {/* Action Promo CTA — Matches Features Page CTA Design System */}
        <section className="p-8 bg-primary/5 dark:bg-secondary/5 border border-primary/20 dark:border-secondary/20 rounded-3xl text-center space-y-4 shadow-sm">
          <h3 className="font-headline text-xl sm:text-2xl font-bold text-on-surface dark:text-white">
            Ready to check your statements?
          </h3>
          <p className="font-body text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
            Register your campus profile or sign in to access your personal member ledger, active loans, and digital statements.
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
