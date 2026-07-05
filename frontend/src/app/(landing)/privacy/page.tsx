'use client';

/**
 * Privacy Policy Page — /privacy
 *
 * Layout: Shared LandingNavbar + LandingFooter
 * Design system: globals.css (Plus Jakarta Sans headlines, Hanken Grotesk body,
 *                primary #047857, secondary #34D399, tertiary #A45049)
 *
 * Structure:
 *  1. Back button + hero header with badge, gradient headline, and meta row
 *  2. Bento-style highlight grid (key topics at a glance)
 *  3. Detailed policy sections with animated left-border indicator
 *  4. Image break
 *  5. Privacy contact / DPO card
 *  6. Footer
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  Globe,
  Database,
  Share2,
  Lock,
  UserCheck,
  Cookie,
  CalendarDays,
  Mail,
  FileDown,
  CheckCircle2,
  ChevronUp,
} from 'lucide-react';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

// ── Section data ──────────────────────────────────────────────────────────────
// Each entry maps to one <section> in the body.
const SECTIONS = [
  {
    id: 'collection',
    number: '01',
    title: 'Information We Collect',
    icon: <Database className="w-5 h-5" />,
    content: (
      <>
        <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed mb-4">
          LendFlow Pro collects high-precision data necessary to provide sophisticated loan management
          services, including institutional identifiers, transactional history, and system health metrics.
        </p>
        {/* Two-column data type grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {[
            { label: 'Institutional Data', desc: 'Entity names, tax IDs, and regulatory filings.' },
            { label: 'Financial Records', desc: 'Loan portfolios, payment structures, and risk assessments.' },
            { label: 'Usage Telemetry', desc: 'Platform interactions and feature usage patterns.' },
            { label: 'Device & Network', desc: 'IP addresses, browser type, and connection metadata.' },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-start gap-3 p-4 bg-primary/5 dark:bg-primary/8 rounded-2xl border border-primary/10 dark:border-primary/15"
            >
              <CheckCircle2 className="w-4 h-4 text-primary dark:text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-label text-sm font-bold text-on-surface dark:text-white">{item.label}</div>
                <div className="text-xs text-on-surface/60 dark:text-neutral-400 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'usage',
    number: '02',
    title: 'How We Use Your Data',
    icon: <ShieldCheck className="w-5 h-5" />,
    content: (
      <>
        <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed mb-4">
          LendFlow Pro processes data to ensure the technological sophistication of our loan management
          environment. Our primary uses include:
        </p>
        <ul className="space-y-3">
          {[
            'Automated underwriting and risk scoring algorithms.',
            'Generating institutional-grade financial reports and audits.',
            'Maintaining system health and preventing fraudulent activities.',
            'Improving platform features through aggregate analytics.',
          ].map(item => (
            <li key={item} className="flex items-center gap-3 text-on-surface/70 dark:text-neutral-400 text-sm">
              {/* Animated dot bullet */}
              <span className="w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'sharing',
    number: '03',
    title: 'Third-Party Sharing',
    icon: <Share2 className="w-5 h-5" />,
    content: (
      <>
        {/* "We do NOT sell" callout */}
        <div className="flex items-start gap-4 p-5 bg-secondary/8 dark:bg-secondary/10 rounded-2xl border border-secondary/20 mb-6">
          <Share2 className="w-5 h-5 text-primary dark:text-secondary mt-0.5 flex-shrink-0" />
          <p className="text-sm font-bold text-on-surface dark:text-white">
            We do <span className="text-primary dark:text-secondary">NOT</span> sell your data.
            We only share with essential partners under strict Data Processing Agreements (DPAs).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Cloud Infrastructure', desc: 'Secure AWS data hosting across multiple regions.' },
            { label: 'KYC Providers',         desc: 'Verification services to ensure regulatory compliance.' },
            { label: 'Payment Rails',          desc: 'Processing partners for ACH and wire transfers.' },
          ].map(p => (
            <div key={p.label} className="p-4 bg-white dark:bg-neutral-800/70 rounded-2xl border border-outline-variant/40 dark:border-neutral-700/60">
              <div className="font-label text-sm font-bold text-on-surface dark:text-white mb-1">{p.label}</div>
              <div className="text-xs text-on-surface/60 dark:text-neutral-400">{p.desc}</div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'security',
    number: '04',
    title: 'Security Measures',
    icon: <Lock className="w-5 h-5" />,
    content: (
      <>
        <p className="text-on-surface/65 dark:text-neutral-400 leading-relaxed mb-6">
          LendFlow Pro employs bank-grade AES-256 encryption for all data at rest and TLS 1.3 for
          data in transit. We maintain SOC 2 Type II compliance and undergo quarterly penetration
          testing by independent third-party cybersecurity firms.
        </p>
        {/* Security feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[
            { title: 'End-to-End Encryption', desc: 'AES-256 at rest and TLS 1.3 in transit prevent unauthorized interception.' },
            { title: 'Access Control',         desc: 'Strict RBAC ensures only authorized personnel access sensitive data shards.' },
          ].map(f => (
            <div key={f.title} className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-primary dark:text-secondary" />
              </div>
              <div>
                <div className="font-headline text-base font-bold text-on-surface dark:text-white mb-1">{f.title}</div>
                <div className="text-sm text-on-surface/60 dark:text-neutral-400">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Security visual image (generated asset served from /public) */}
        <div className="rounded-2xl overflow-hidden h-52 w-full shadow-md border border-outline-variant/30 dark:border-neutral-800">
          <img
            src="/security_visual.png"
            alt="Abstract cybersecurity network visualization showing glowing teal nodes on a dark background"
            className="w-full h-full object-cover"
          />
        </div>
      </>
    ),
  },
  {
    id: 'rights',
    number: '05',
    title: 'Your Rights',
    icon: <UserCheck className="w-5 h-5" />,
    content: (
      <div className="space-y-3">
        {[
          { right: 'Access',      desc: 'Request a full export of all personal data we hold about you.' },
          { right: 'Correction',  desc: 'Ask us to correct inaccurate or outdated institutional records.' },
          { right: 'Deletion',    desc: 'Request erasure of your data, subject to legal retention requirements.' },
          { right: 'Portability', desc: 'Receive your data in a machine-readable format (JSON / CSV).' },
          { right: 'Objection',   desc: 'Opt out of non-essential data processing activities at any time.' },
        ].map(r => (
          <div key={r.right} className="flex items-start gap-3 p-4 bg-white dark:bg-neutral-800/70 rounded-2xl border border-outline-variant/40 dark:border-neutral-700/60 hover:border-primary/30 dark:hover:border-secondary/30 transition-colors">
            <div className="w-2 h-2 rounded-full bg-primary dark:bg-secondary mt-2 flex-shrink-0" />
            <div>
              <span className="font-label text-sm font-bold text-on-surface dark:text-white">{r.right}: </span>
              <span className="text-sm text-on-surface/65 dark:text-neutral-400">{r.desc}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
export default function PrivacyPage() {
  // Track which section is currently in view for the highlight grid indicator
  const [activeSection, setActiveSection] = useState<string>('collection');
  // Back-to-top visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Scroll observer — updates activeSection as user scrolls past each section
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      const sectionEls = document.querySelectorAll('[data-section-id]');
      sectionEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Trigger when section top is within the upper 40% of the viewport
        if (rect.top <= window.innerHeight * 0.4 && rect.bottom > 0) {
          setActiveSection(el.getAttribute('data-section-id') ?? '');
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="bg-background dark:bg-neutral-950 text-on-surface dark:text-neutral-100 transition-colors min-h-screen">

      {/* ── Shared navigation ──────────────────────────────────────── */}
      {/* activeIndex={-1} so no nav item appears "selected" on legal pages */}
      <LandingNavbar activeIndex={-1} />

      <main className="pt-24 pb-24">
        <div className="max-w-5xl mx-auto px-6 md:px-12">

          {/* ── Back button ─────────────────────────────────────────── */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface/60 dark:text-neutral-400 hover:text-primary dark:hover:text-secondary transition-colors mb-10 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          {/* ── Hero header ─────────────────────────────────────────── */}
          <div className="mb-16 space-y-6">
            {/* Compliance badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 border border-primary/15 dark:border-secondary/15 text-primary dark:text-secondary text-xs font-bold font-label">
              <ShieldCheck className="w-3.5 h-3.5" />
              Compliance Standards 2026
            </div>

            {/* Gradient headline */}
            <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]">
              <span className="text-on-surface dark:text-white">Privacy</span>{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #047857 0%, #34D399 100%)' }}
              >
                Policy
              </span>
            </h1>

            <p className="font-body text-lg text-on-surface/65 dark:text-neutral-400 max-w-2xl leading-relaxed">
              At LendFlow Pro, we prioritize the absolute security of your institutional financial data.
              This policy outlines how we protect and manage your information with complete transparency.
            </p>

            {/* Meta info row */}
            <div className="flex flex-wrap gap-6 text-sm text-on-surface/50 dark:text-neutral-500 font-semibold">
              <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Last updated: October 24, 2026</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 8 min read</span>
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4" /> Global Coverage</span>
            </div>
          </div>

          {/* ── Bento highlight grid (quick overview cards) ──────────── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-20">
            {/* Primary card — Information We Collect overview */}
            <div className="md:col-span-8 bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              {/* Left accent gradient bar */}
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-secondary rounded-l-3xl" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary dark:text-secondary" />
                </div>
                <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">Information We Collect</h2>
              </div>
              <p className="text-on-surface/65 dark:text-neutral-400 text-sm leading-relaxed mb-5">
                We collect high-precision data necessary to provide sophisticated loan management services,
                including institutional identifiers, transactional history, and system health metrics.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Institutional Data', desc: 'Entity names, tax IDs, and regulatory filings.' },
                  { label: 'Financial Records', desc: 'Loan portfolios and risk assessments.' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2.5 p-3 bg-primary/5 dark:bg-primary/8 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary dark:text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-on-surface dark:text-white">{item.label}</div>
                      <div className="text-xs text-on-surface/55 dark:text-neutral-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side cards column */}
            <div className="md:col-span-4 flex flex-col gap-5">
              {/* User Rights card — prominent solid fill */}
              <div className="flex-1 bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg shadow-primary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                <UserCheck className="w-9 h-9 opacity-50 relative z-10" />
                <div className="relative z-10">
                  <h3 className="font-headline text-lg font-bold mb-1">Your Rights</h3>
                  <p className="text-white/75 text-xs leading-relaxed">
                    Full control over your data export, correction, and deletion preferences.
                  </p>
                </div>
              </div>
              {/* Cookie policy card */}
              <div className="flex-1 bg-secondary/10 dark:bg-secondary/8 rounded-3xl p-6 border border-secondary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Cookie className="w-4 h-4 text-primary dark:text-secondary" />
                  <h3 className="font-headline text-base font-bold text-on-surface dark:text-white">Cookie Policy</h3>
                </div>
                <p className="text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                  We use functional cookies to optimize dashboard performance. No tracking cookies.
                </p>
                <button className="mt-3 text-xs font-bold text-primary dark:text-secondary underline underline-offset-2 hover:no-underline transition-all">
                  Manage Settings
                </button>
              </div>
            </div>
          </div>

          {/* ── Detailed policy sections ─────────────────────────────── */}
          <div className="space-y-16">
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                data-section-id={section.id}
                className="relative pl-8 border-l-2 border-outline-variant/30 dark:border-neutral-800 group"
              >
                {/*
                 * Animated left indicator:
                 * Grows to full height on hover/active via CSS transition.
                 * The `section-indicator` class is driven by the parent group.
                 */}
                <div
                  className={`absolute left-[-2px] top-0 w-0.5 rounded-full bg-gradient-to-b from-primary to-secondary transition-all duration-500 ${
                    activeSection === section.id ? 'h-full' : 'h-10 group-hover:h-full'
                  }`}
                />

                {/* Section number + icon + title */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-mono text-xs font-bold text-primary/50 dark:text-secondary/40">{section.number}</span>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 flex items-center justify-center text-primary dark:text-secondary">
                    {section.icon}
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white">{section.title}</h2>
                </div>

                {/* Section body content */}
                <div className="font-body text-base">{section.content}</div>
              </section>
            ))}
          </div>

          {/* ── Decorative image break ───────────────────────────────── */}
          {/*
           * Image generated by AI (see generate_image call), served from /public.
           * Using an <img> with href attribute as requested (not next/image).
           */}
          <div className="my-20 rounded-3xl overflow-hidden h-64 w-full shadow-lg border border-outline-variant/30 dark:border-neutral-800 relative group">
            <a href="/privacy_hero.png" target="_blank" rel="noopener noreferrer" aria-label="View full image">
              <img
                src="/privacy_hero.png"
                alt="Minimalist corporate workspace with a laptop showing financial charts, representing LendFlow Pro's secure data environment"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent" />
            </a>
          </div>

          {/* ── Privacy Contact / DPO card ───────────────────────────── */}
          <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-3xl p-10 md:p-14 text-center border border-outline-variant/30 dark:border-neutral-800">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-6 h-6 text-primary dark:text-secondary" />
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white mb-3">Privacy Inquiries</h2>
            <p className="text-on-surface/65 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed mb-8">
              Have specific questions about how your institutional data is handled? Our dedicated Data
              Protection Officer is available for direct consultation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {/* DPO contact */}
              <a
                href="mailto:privacy@lendflowpro.com"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-bold shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95"
              >
                <Mail className="w-4 h-4" />
                Contact DPO
              </a>
              {/* Download PDF */}
              <button className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white dark:bg-neutral-800 border border-outline-variant/50 dark:border-neutral-700 text-on-surface dark:text-white font-label text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-700/80 hover:shadow-md transition-all active:scale-95">
                <FileDown className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Shared footer with Privacy highlighted ──────────────────── */}
      <LandingFooter activeLegal="privacy" />

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
    </div>
  );
}
