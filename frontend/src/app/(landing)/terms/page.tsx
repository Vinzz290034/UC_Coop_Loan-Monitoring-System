'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import {
  FileText,
  Scale,
  Lock,
  UserCheck,
  ShieldCheck,
  Printer,
  ChevronUp,
  CalendarDays,
  Mail,
} from 'lucide-react';

// ── Table of Contents ─────────────────────────────────────────────────────────
const TOC_ITEMS = [
  { id: 'introduction',  label: '1. Introduction',  icon: <FileText    className="w-3.5 h-3.5" /> },
  { id: 'membership',    label: '2. Membership',     icon: <UserCheck   className="w-3.5 h-3.5" /> },
  { id: 'platform-use',  label: '3. Platform Use',   icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'data-privacy',  label: '4. Data & Privacy', icon: <Lock        className="w-3.5 h-3.5" /> },
  { id: 'governing-law', label: '5. Governing Law',  icon: <Scale       className="w-3.5 h-3.5" /> },
] as const;

type SectionId = typeof TOC_ITEMS[number]['id'];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('introduction');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      const sections = document.querySelectorAll<HTMLElement>('section[id]');
      let current: SectionId = 'introduction';
      sections.forEach(el => {
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) {
          current = el.id as SectionId;
        }
      });
      setActiveSection(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <main className="pt-24 pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">

          <BackButton href="/" className="mb-10">Back to Home</BackButton>

          {/* ── Page header ───────────────────────────────────────────── */}
          <div className="mb-14 pb-8 border-b border-outline-variant/30 dark:border-neutral-800">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 border border-primary/15 dark:border-secondary/15 text-primary dark:text-secondary text-xs font-bold font-label">
                  <Scale className="w-3.5 h-3.5" />
                  Legal Agreement
                </div>
                <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]">
                  <span className="text-on-surface dark:text-white">Terms of</span>{' '}
                  <span
                    className="text-transparent bg-clip-text"
                    style={{ backgroundImage: 'linear-gradient(135deg, #047857 0%, #34D399 100%)' }}
                  >
                    Service
                  </span>
                </h1>
                <div className="flex items-center gap-2 text-sm text-on-surface/55 dark:text-neutral-500 font-semibold">
                  <CalendarDays className="w-4 h-4" />
                  Last Updated: September 10, 2026
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-outline-variant/40 dark:border-neutral-700 text-on-surface dark:text-white font-label text-sm font-bold hover:shadow-md dark:hover:bg-neutral-700/80 transition-all active:scale-95 flex-shrink-0"
              >
                <Printer className="w-4 h-4" />
                Print Document
              </button>
            </div>
          </div>

          {/* ── Layout: Sidebar + Content ─────────────────────────────── */}
          <div className="flex flex-col md:grid md:grid-cols-12 gap-12">

            {/* ── Sidebar ToC ───────────────────────────────────────── */}
            <aside className="md:col-span-3">
              <div className="sticky top-28 space-y-5">
                <h2 className="font-label text-xs font-extrabold text-on-surface/40 dark:text-neutral-500 tracking-widest uppercase">
                  Contents
                </h2>
                <ul className="space-y-1" role="navigation">
                  {TOC_ITEMS.map(item => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`w-full flex items-center gap-2.5 text-left py-2.5 px-3.5 rounded-xl font-body text-sm font-semibold transition-all ${
                            isActive
                              ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary'
                              : 'text-on-surface/60 dark:text-neutral-400 hover:text-primary dark:hover:text-secondary hover:bg-primary/5 dark:hover:bg-secondary/5'
                          }`}
                        >
                          <span className={isActive ? 'text-primary dark:text-secondary' : 'text-on-surface/40 dark:text-neutral-600'}>
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Support card */}
                <div className="mt-6 p-5 bg-primary/5 dark:bg-primary/8 rounded-2xl border border-primary/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-primary dark:text-secondary" />
                    <p className="font-label text-sm font-bold text-primary dark:text-secondary">Contact Us</p>
                  </div>
                  <p className="text-xs text-on-surface/60 dark:text-neutral-400 mb-3 leading-relaxed">
                    Questions about these terms? Reach out to the UC-METC MPC office.
                  </p>
                  <a
                    href="mailto:ucmetc.ecc@gmail.com"
                    className="text-sm font-bold text-primary dark:text-secondary hover:underline underline-offset-2"
                  >
                    ucmetc.ecc@gmail.com
                  </a>
                </div>
              </div>
            </aside>

            {/* ── Main content ──────────────────────────────────────── */}
            <article className="md:col-span-9 space-y-12 pb-12">

              {/* 1. Introduction */}
              <section id="introduction" className="scroll-mt-28">
                <SectionHeader number="1" title="Introduction" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm space-y-4">
                  <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed">
                    Welcome to <strong>Coop Sync</strong> — the official loan monitoring and member management platform of the <strong>University of Cebu - METC Multipurpose Cooperative (UC-METC MPC)</strong>. By accessing this system, you agree to follow the guidelines set out in these Terms of Service.
                  </p>
                  <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed">
                    These terms apply to all members, staff, and administrators who use this platform. If you have questions, please contact the Cooperative office before proceeding.
                  </p>
                </div>
              </section>

              {/* 2. Membership */}
              <section id="membership" className="scroll-mt-28">
                <SectionHeader number="2" title="Membership" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm space-y-4">
                  <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed">
                    Access to this platform is limited to verified members and authorized staff of the UC-METC Multipurpose Cooperative. Member accounts are tied to your cooperative membership status.
                  </p>
                  <ul className="space-y-3">
                    {[
                      'You are responsible for keeping your login credentials confidential.',
                      'Sharing your account with others is not allowed.',
                      'Your account reflects your current cooperative standing — inactive or suspended members may lose access.',
                      'Report any unauthorized access to cooperative staff immediately.',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-3 text-sm text-on-surface/70 dark:text-neutral-400">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 3. Platform Use */}
              <section id="platform-use" className="scroll-mt-28">
                <SectionHeader number="3" title="Platform Use" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm space-y-4">
                  <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed">
                    This platform is intended solely for managing cooperative loans, member accounts, and related financial records. Please use it responsibly and in accordance with cooperative policies.
                  </p>
                  <ul className="space-y-3">
                    {[
                      'Do not use this platform for any unauthorized or fraudulent activity.',
                      'All transactions and actions are logged for audit and compliance purposes.',
                      'Loan applications submitted through the system are subject to cooperative approval policies.',
                      'Misuse of the platform may result in suspension of your account and referral to cooperative management.',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-3 text-sm text-on-surface/70 dark:text-neutral-400">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 4. Data & Privacy */}
              <section id="data-privacy" className="scroll-mt-28">
                <SectionHeader number="4" title="Data & Privacy" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm space-y-4">
                  <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed">
                    The UC-METC Cooperative takes your data privacy seriously. Your personal and financial information is stored securely and used only for cooperative operations.
                  </p>
                  <ul className="space-y-3">
                    {[
                      'Your data is only accessible to authorized cooperative staff and administrators.',
                      'We do not sell or share your personal information with third parties.',
                      'All data is handled in accordance with the Philippine Data Privacy Act (RA 10173).',
                      'You may request a copy or correction of your personal data by contacting cooperative management.',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-3 text-sm text-on-surface/70 dark:text-neutral-400">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* 5. Governing Law */}
              <section id="governing-law" className="scroll-mt-28">
                <SectionHeader number="5" title="Governing Law" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm space-y-4">
                  <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed">
                    These Terms of Service are governed by the laws of the Republic of the Philippines, including the Cooperative Code of the Philippines (RA 9520) and applicable regulations from the Cooperative Development Authority (CDA).
                  </p>
                  <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed">
                    Any disputes arising from the use of this platform shall first be resolved through the cooperative&apos;s internal dispute resolution process before escalation to appropriate authorities.
                  </p>
                </div>
              </section>

              {/* Acceptance banner */}
              <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-xl shadow-primary/20 border border-white/10">
                <div className="absolute -right-12 -bottom-12 w-48 h-48 border-[3px] border-white/10 rounded-full pointer-events-none" />
                <div className="relative z-10">
                  <h3 className="font-headline text-2xl font-bold text-white mb-2">Understood & Agreed</h3>
                  <p className="text-white/75 max-w-md leading-relaxed text-sm">
                    By using Coop Sync, you confirm that you have read and agreed to these Terms of Service as a member of the UC-METC Multipurpose Cooperative.
                  </p>
                </div>
                <div className="flex gap-3 relative z-10 flex-shrink-0">
                  <Link
                    href="/privacy"
                    className="px-7 py-3 rounded-full bg-white/15 text-white font-label text-sm font-bold border border-white/20 hover:bg-white/25 transition-all active:scale-95 backdrop-blur"
                  >
                    Privacy Policy
                  </Link>
                </div>
              </div>

            </article>
          </div>
        </div>
      </main>

      {/* Back to top FAB */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed bottom-8 right-8 z-50 w-11 h-11 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}

// ── Sub-component: Section header ─────────────────────────────────────────────
function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-full flex-shrink-0 mt-1" />
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs font-bold text-primary/40 dark:text-secondary/30">{number}.</span>
        <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white">{title}</h2>
      </div>
    </div>
  );
}
