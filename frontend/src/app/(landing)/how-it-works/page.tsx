import React from 'react';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';
import Link from 'next/link';
import { ArrowRight, UserPlus, FileCheck, ShieldCheck } from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      icon: <UserPlus className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Register Profile',
      desc: 'Create an account online using your cooperative details. New accounts are initially set to general member privileges.'
    },
    {
      num: '02',
      icon: <ShieldCheck className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Admin Verification',
      desc: 'The cooperative administration board reviews and verifies your profile status to connect it to your physical ledger accounts.'
    },
    {
      num: '03',
      icon: <FileCheck className="w-6 h-6 text-primary dark:text-secondary" />,
      title: 'Access Portal',
      desc: 'Log in to view active credit balances, monitor share capital contributions, request withdrawals, or track payment schedules.'
    }
  ];

  return (
    <div className="bg-background dark:bg-surface-container-low text-on-surface dark:text-neutral-100 transition-colors min-h-screen">
      <LandingNavbar activeIndex={2} />

      <main className="pt-28 pb-16 max-w-5xl mx-auto px-6 space-y-16">
        <header className="text-center space-y-4">
          <h1 className="font-headline text-4xl font-extrabold text-primary dark:text-secondary">
            How to Access Your Account
          </h1>
          <p className="font-body text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            A simple 3-step setup to access member dashboards and financial statements.
          </p>
        </header>

        {/* Steps Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative p-6 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl space-y-4 shadow-sm">
              <div className="absolute top-4 right-6 font-mono font-black text-3xl text-neutral-200 dark:text-neutral-800">
                {s.num}
              </div>
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                {s.icon}
              </div>
              <h3 className="font-headline text-base font-bold">{s.title}</h3>
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Action Promo */}
        <section className="p-8 bg-white dark:bg-neutral-900 border border-outline-variant/60 rounded-3xl text-center space-y-5 max-w-xl mx-auto shadow-sm">
          <h3 className="font-headline text-lg font-bold">Ready to check your statements?</h3>
          <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
            Sign up today or access the login screen using your verified campus account details.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="px-6 py-2.5 bg-primary dark:bg-secondary text-white dark:text-neutral-950 text-xs font-bold rounded-full shadow hover:translate-y-[-1px] transition-all"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 border border-outline-variant rounded-full text-xs font-bold hover:bg-neutral/5 transition-all inline-flex items-center gap-1"
            >
              Go to Login <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
