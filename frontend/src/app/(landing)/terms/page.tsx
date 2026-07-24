'use client';

/**
 * Terms of Service Page — /terms
 *
 * Layout: Shared LandingNavbar + LandingFooter
 * Design system: globals.css (Plus Jakarta Sans headlines, Hanken Grotesk body,
 *                primary #047857, secondary #34D399)
 *
 * Structure:
 *  1. Back button + hero header with badge and gradient headline
 *  2. Sticky ToC sidebar + main content (12-column grid)
 *  3. Five detailed sections with scrollspy active states
 *  4. Acceptance / confirmation banner at the bottom
 *  5. Footer
 *
 * Scrollspy: A scroll listener updates the active TOC link as the user reads
 *            through sections, giving a "live reading progress" feel.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Scale,
  Lock,
  Ban,
  Landmark,
  Printer,
  ChevronUp,
  CheckCircle2,
  CalendarDays,
  Mail,
} from 'lucide-react';


// ── Table of Contents config ──────────────────────────────────────────────────
const TOC_ITEMS = [
  { id: 'introduction', label: '1. Introduction', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'authorized-use', label: '2. Authorized Use', icon: <Ban className="w-3.5 h-3.5" /> },
  { id: 'lending-terms', label: '3. Lending Terms', icon: <Landmark className="w-3.5 h-3.5" /> },
  { id: 'data-security', label: '4. Data Security', icon: <Lock className="w-3.5 h-3.5" /> },
  { id: 'governing-law', label: '5. Governing Law', icon: <Scale className="w-3.5 h-3.5" /> },
] as const;

type SectionId = typeof TOC_ITEMS[number]['id'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function TermsPage() {
  // Tracks which section the user is currently reading (scrollspy)
  const [activeSection, setActiveSection] = useState<SectionId>('introduction');
  // Controls back-to-top FAB visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  // ── Scrollspy effect ────────────────────────────────────────────────────────
  // Updates activeSection whenever a section enters the upper viewport region
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);

      // Walk each section and pick the one whose top is closest to 25% viewport height
      const sections = document.querySelectorAll<HTMLElement>('section[id]');
      let current: SectionId = 'introduction';
      sections.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.35) {
          current = el.id as SectionId;
        }
      });
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to a section when a TOC link is clicked
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <>

      <main className="pt-24 pb-24">
        <div className="max-w-7xl mx-auto px-6 md:px-12">

          <BackButton href="/" className="mb-10">Back to Home</BackButton>

          {/* ── Page header ─────────────────────────────────────────── */}
          <div className="mb-14 pb-8 border-b border-outline-variant/30 dark:border-neutral-800">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                {/* Legal badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 border border-primary/15 dark:border-secondary/15 text-primary dark:text-secondary text-xs font-bold font-label">
                  <Scale className="w-3.5 h-3.5" />
                  Legal Agreement
                </div>
                {/* Gradient headline */}
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
                  Last Updated: October 24, 2026
                </div>
              </div>

              {/* Print button */}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-outline-variant/40 dark:border-neutral-700 text-on-surface dark:text-white font-label text-sm font-bold hover:shadow-md dark:hover:bg-neutral-700/80 transition-all active:scale-95 flex-shrink-0"
              >
                <Printer className="w-4 h-4" />
                Print Document
              </button>
            </div>
          </div>

          {/* ── 12-column layout: ToC sidebar + content ──────────────── */}
          <div className="flex flex-col md:grid md:grid-cols-12 gap-12">

            {/* ── Sticky Table of Contents sidebar ───────────────────── */}
            <aside className="md:col-span-3">
              <div className="sticky top-28 space-y-5">
                <h2 className="font-label text-xs font-extrabold text-on-surface/40 dark:text-neutral-500 tracking-widest uppercase">
                  Contents
                </h2>

                {/* TOC links — active item highlighted via scrollspy state */}
                <ul className="space-y-1" role="navigation" aria-label="Page sections">
                  {TOC_ITEMS.map(item => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`w-full flex items-center gap-2.5 text-left py-2.5 px-3.5 rounded-xl font-body text-sm font-semibold transition-all ${isActive
                            ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary'
                            : 'text-on-surface/60 dark:text-neutral-400 hover:text-primary dark:hover:text-secondary hover:bg-primary/5 dark:hover:bg-secondary/5'
                            }`}
                        >
                          {/* Icon changes color with active state */}
                          <span className={isActive ? 'text-primary dark:text-secondary' : 'text-on-surface/40 dark:text-neutral-600'}>
                            {item.icon}
                          </span>
                          {item.label}
                          {/* Active arrow indicator */}
                          {isActive && <ArrowRight className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Legal support card */}
                <div className="mt-6 p-5 bg-primary/5 dark:bg-primary/8 rounded-2xl border border-primary/15 dark:border-primary/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-primary dark:text-secondary" />
                    <p className="font-label text-sm font-bold text-primary dark:text-secondary">Legal Support</p>
                  </div>
                  <p className="text-xs text-on-surface/60 dark:text-neutral-400 mb-3 leading-relaxed">
                    Questions about our terms? Our legal team is here to help institutional partners.
                  </p>
                  <a
                    href="mailto:legal@lendflowpro.com"
                    className="text-sm font-bold text-primary dark:text-secondary hover:underline underline-offset-2"
                  >
                    legal@lendflowpro.com
                  </a>
                </div>
              </div>
            </aside>

            {/* ── Main content area ────────────────────────────────────── */}
            <article className="md:col-span-9 space-y-14 pb-12">

              {/* Section helper: renders the gradient left bar + number + title */}
              {/* ── 1. Introduction ──────────────────────────────────── */}
              <section id="introduction" className="scroll-mt-28">
                <SectionHeader number="1" title="Introduction" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm">
                  <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed mb-4">
                    Welcome to Coop Sync. These Terms of Service (&quot;Terms&quot;) constitute a legally
                    binding agreement between you (&quot;User,&quot; &quot;Partner,&quot; or &quot;Lender&quot;) and Coop Sync
                    (&quot;Company,&quot; &quot;we,&quot; or &quot;us&quot;). By accessing or using our institutional loan management
                    platform, you agree to be bound by these Terms and our Privacy Policy.
                  </p>
                  <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                    Coop Sync provides high-performance technological infrastructure for institutional
                    lenders. Our services are designed for sophisticated financial entities and require
                    absolute compliance with the operational standards set forth in this document.
                  </p>
                </div>
              </section>

              {/* ── 2. Authorized Use ───────────────────────────────── */}
              <section id="authorized-use" className="scroll-mt-28">
                <SectionHeader number="2" title="Authorized Use" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm space-y-6">
                  {/* Two-column policy grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      {
                        label: 'System Integrity',
                        desc: 'Users must not attempt to bypass security measures, reverse engineer the proprietary lending algorithms, or use automated scripts to scrape data without express written consent.',
                      },
                      {
                        label: 'Credential Management',
                        desc: 'Account holders are responsible for maintaining the confidentiality of administrative credentials. Unauthorized access must be reported immediately to our security operations center.',
                      },
                    ].map(col => (
                      <div key={col.label} className="space-y-2">
                        <div className="font-label text-xs font-extrabold text-primary dark:text-secondary uppercase tracking-wider">{col.label}</div>
                        <p className="text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed">{col.desc}</p>
                      </div>
                    ))}
                  </div>
                  {/* Prohibition callout */}
                  <div className="p-5 bg-tertiary/8 dark:bg-tertiary/10 border-l-4 border-tertiary rounded-r-2xl">
                    <div className="flex items-start gap-3">
                      <Ban className="w-4 h-4 text-tertiary mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-semibold text-tertiary leading-relaxed">
                        <span className="font-bold">Prohibition:</span> Any use of the platform for money laundering,
                        terrorist financing, or other illegal financial activities will result in immediate account
                        termination and referral to federal authorities.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 3. Lending Terms ─────────────────────────────────── */}
              <section id="lending-terms" className="scroll-mt-28">
                <SectionHeader number="3" title="Lending Terms" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-outline-variant/20 dark:border-neutral-700/50">
                    <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                      The Coop Sync platform facilitates the orchestration of loan products but does
                      not act as the lender of record. All financial obligations, credit assessments, and
                      regulatory filings remain the sole responsibility of the Partner institution.
                    </p>
                  </div>
                  {/* Three-column feature breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-outline-variant/20 dark:divide-neutral-700/50">
                    {[
                      { icon: <Landmark className="w-5 h-5" />, title: 'Protocol Compliance', desc: 'All loans processed through the system must adhere to the configured underwriting protocols approved during onboarding.' },
                      { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Disbursement Logic', desc: "Automated disbursements are executed based on Smart Contracts. Coop Sync is not liable for errors in third-party banking APIs." },
                      { icon: <FileText className="w-5 h-5" />, title: 'Default Management', desc: 'Our system provides automated flagging for delinquent accounts, but remediation actions are at the discretion of the Lender.' },
                    ].map(f => (
                      <div key={f.title} className="p-6 space-y-2">
                        <div className="text-primary dark:text-secondary">{f.icon}</div>
                        <div className="font-label text-sm font-bold text-on-surface dark:text-white">{f.title}</div>
                        <p className="text-xs text-on-surface/60 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── 4. Data Security ─────────────────────────────────── */}
              <section id="data-security" className="scroll-mt-28">
                <SectionHeader number="4" title="Data Security" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm relative overflow-hidden">
                  {/* Decorative radial glow (non-interactive) */}
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 dark:bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row gap-10 items-start">
                      <div className="flex-1">
                        <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed mb-6">
                          Coop Sync employs bank-grade AES-256 encryption for all data at rest and
                          TLS 1.3 for data in transit. We maintain SOC 2 Type II compliance and undergo
                          quarterly penetration testing by independent third-party cybersecurity firms.
                        </p>
                        {/* Security checklist */}
                        <ul className="space-y-3">
                          {[
                            'Multi-factor Authentication (MFA) enforcement',
                            'Zero-knowledge architecture options',
                            'Automated audit trails for every transaction',
                          ].map(item => (
                            <li key={item} className="flex items-center gap-3 text-sm text-on-surface/70 dark:text-neutral-400">
                              <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Security image — links to full image as requested */}
                      <a
                        href="/security_visual.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full md:w-64 h-44 rounded-2xl overflow-hidden flex-shrink-0 block shadow-md border border-outline-variant/30 dark:border-neutral-700 hover:shadow-lg hover:scale-[1.02] transition-all"
                        aria-label="View security visualization"
                      >
                        <img
                          src="/security_visual.png"
                          alt="Futuristic cybersecurity data network visualization with glowing teal nodes"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 5. Governing Law ─────────────────────────────────── */}
              <section id="governing-law" className="scroll-mt-28">
                <SectionHeader number="5" title="Governing Law" />
                <div className="bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm">
                  <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed mb-6">
                    These Terms shall be governed by and construed in accordance with the laws of the
                    State of Delaware, without regard to its conflict of law principles. Institutional
                    partners agree to submit to the exclusive jurisdiction of the federal and state courts
                    located within Delaware for the resolution of any disputes.
                  </p>
                  <div className="pt-6 border-t border-outline-variant/20 dark:border-neutral-700">
                    <blockquote className="font-body text-sm italic text-on-surface/50 dark:text-neutral-500">
                      &quot;The reliability of Coop Sync&rsquo;s infrastructure is matched only by the
                      clarity of its governance.&quot; — Legal Review, 2026
                    </blockquote>
                  </div>
                </div>
              </section>

              {/* ── Acceptance / confirmation banner ─────────────────── */}
              {/*
               * Styled to match the CTA banner design language used on the landing page.
               * Green gradient background with white text and accept button.
               */}
              <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden shadow-xl shadow-primary/20 border border-white/10">
                {/* Decorative ring */}
                <div className="absolute -right-12 -bottom-12 w-48 h-48 border-[3px] border-white/10 rounded-full pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />

                <div className="relative z-10">
                  <h3 className="font-headline text-2xl font-bold text-white mb-2">Ready to proceed?</h3>
                  <p className="text-white/75 max-w-md leading-relaxed text-sm">
                    By continuing to use our dashboard, you acknowledge that you have read and understood
                    these updated terms of service.
                  </p>
                </div>
                <div className="flex gap-3 relative z-10 flex-shrink-0">
                  <button className="px-7 py-3 rounded-full bg-white text-primary font-label text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95">
                    Accept Terms
                  </button>
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


      {/* ── Back to top FAB ─────────────────────────────────────────── */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
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
/**
 * Renders the gradient left-bar + section number + section title
 * that appears at the top of every policy section.
 */
function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-start gap-4 mb-6">
      {/* Animated gradient bar (scales from 32px) */}
      <div className="w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-full flex-shrink-0 mt-1" />
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs font-bold text-primary/40 dark:text-secondary/30">{number}.</span>
        <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white">{title}</h2>
      </div>
    </div>
  );
}
