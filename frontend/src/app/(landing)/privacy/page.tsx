'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import {
  ShieldCheck,
  Database,
  Share2,
  Lock,
  UserCheck,
  CalendarDays,
  Mail,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

// ── Section data ──────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'collection',
    number: '01',
    title: 'Information We Collect',
    icon: <Database className="w-5 h-5" />,
    content: (
      <>
        <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed mb-4">
          To provide cooperative services, we collect basic personal and financial information from members and staff. This includes:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {[
            { label: 'Personal Information', desc: 'Name, contact details, and government-issued ID.' },
            { label: 'Financial Records', desc: 'Loan applications, payment history, and share capital.' },
            { label: 'Account Activity', desc: 'Login history and system activity for security purposes.' },
            { label: 'Contact Details', desc: 'Email address and phone number for communications.' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 p-4 bg-primary/5 dark:bg-primary/8 rounded-2xl border border-primary/10 dark:border-primary/15">
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
        <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed mb-4">
          Your information is used solely to operate and improve cooperative services. Specifically, we use it to:
        </p>
        <ul className="space-y-3">
          {[
            'Process and manage your loan applications and repayments.',
            'Maintain accurate member records and share capital ledgers.',
            'Send important notices about your account or cooperative updates.',
            'Ensure the security and integrity of the platform.',
            'Comply with regulatory requirements under Philippine cooperative law.',
          ].map(item => (
            <li key={item} className="flex items-start gap-3 text-on-surface/70 dark:text-neutral-400 text-sm">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
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
    title: 'Data Sharing',
    icon: <Share2 className="w-5 h-5" />,
    content: (
      <>
        <div className="flex items-start gap-4 p-5 bg-secondary/8 dark:bg-secondary/10 rounded-2xl border border-secondary/20 mb-6">
          <Share2 className="w-5 h-5 text-primary dark:text-secondary mt-0.5 flex-shrink-0" />
          <p className="text-sm font-bold text-on-surface dark:text-white">
            We do <span className="text-primary dark:text-secondary">NOT</span> sell your personal information to anyone.
          </p>
        </div>
        <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed mb-4">
          Your data is only shared when necessary for cooperative operations or required by law:
        </p>
        <ul className="space-y-3">
          {[
            'With authorized cooperative staff and administrators managing your account.',
            'With government agencies (e.g., CDA, BIR) when legally required.',
            'With auditors during official cooperative audits.',
          ].map(item => (
            <li key={item} className="flex items-start gap-3 text-on-surface/70 dark:text-neutral-400 text-sm">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    number: '04',
    title: 'Data Security',
    icon: <Lock className="w-5 h-5" />,
    content: (
      <>
        <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed mb-6">
          We take the security of your information seriously. Coop Sync uses secure encryption and access controls to protect your data from unauthorized access.
        </p>
        <ul className="space-y-3">
          {[
            'All data is encrypted during transmission and storage.',
            'Access is restricted to authorized staff only, based on their role.',
            'All actions on the platform are logged for security and audit purposes.',
            'Passwords are hashed and never stored in plain text.',
          ].map(item => (
            <li key={item} className="flex items-start gap-3 text-on-surface/70 dark:text-neutral-400 text-sm">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-primary dark:bg-secondary flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'rights',
    number: '05',
    title: 'Your Rights',
    icon: <UserCheck className="w-5 h-5" />,
    content: (
      <>
        <p className="text-on-surface/70 dark:text-neutral-400 leading-relaxed mb-4">
          Under the Philippine Data Privacy Act (RA 10173), you have the following rights regarding your personal data:
        </p>
        <div className="space-y-3">
          {[
            { right: 'Access', desc: 'Request a copy of the personal data we hold about you.' },
            { right: 'Correction', desc: 'Ask us to correct any inaccurate or outdated information.' },
            { right: 'Deletion', desc: 'Request removal of your data, subject to legal retention rules.' },
            { right: 'Objection', desc: 'Object to the processing of your data in certain circumstances.' },
          ].map(r => (
            <div key={r.right} className="flex items-start gap-3 p-4 bg-white dark:bg-neutral-800/70 rounded-2xl border border-outline-variant/40 dark:border-neutral-700/60">
              <div className="w-2 h-2 rounded-full bg-primary dark:bg-secondary mt-2 flex-shrink-0" />
              <div>
                <span className="font-label text-sm font-bold text-on-surface dark:text-white">{r.right}: </span>
                <span className="text-sm text-on-surface/65 dark:text-neutral-400">{r.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-on-surface/70 dark:text-neutral-400 text-sm mt-4 leading-relaxed">
          To exercise any of these rights, contact the cooperative office at{' '}
          <a href="mailto:ucmetc.ecc@gmail.com" className="text-primary dark:text-secondary font-bold hover:underline">
            ucmetc.ecc@gmail.com
          </a>.
        </p>
      </>
    ),
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────
export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState<string>('collection');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      const sectionEls = document.querySelectorAll('[data-section-id]');
      sectionEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.4 && rect.bottom > 0) {
          setActiveSection(el.getAttribute('data-section-id') ?? '');
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <main className="pt-24 pb-24">
        <div className="max-w-5xl mx-auto px-6 md:px-12">

          <BackButton href="/" className="mb-10">Back to Home</BackButton>

          {/* ── Hero header ───────────────────────────────────────────── */}
          <div className="mb-16 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 border border-primary/15 dark:border-secondary/15 text-primary dark:text-secondary text-xs font-bold font-label">
              <ShieldCheck className="w-3.5 h-3.5" />
              Data Privacy
            </div>

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
              The UC-METC Multipurpose Cooperative is committed to protecting your personal information. This policy explains how we collect, use, and safeguard your data.
            </p>

            <div className="flex items-center gap-2 text-sm text-on-surface/50 dark:text-neutral-500 font-semibold">
              <CalendarDays className="w-4 h-4" />
              Last updated: September 10, 2026
            </div>
          </div>

          {/* ── Highlight grid ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-20">
            {/* Primary card */}
            <div className="md:col-span-8 bg-white dark:bg-neutral-800/70 rounded-3xl p-8 border border-outline-variant/40 dark:border-neutral-700/50 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary to-secondary rounded-l-3xl" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary dark:text-secondary" />
                </div>
                <h2 className="font-headline text-lg font-bold text-on-surface dark:text-white">What We Collect</h2>
              </div>
              <p className="text-on-surface/65 dark:text-neutral-400 text-sm leading-relaxed mb-5">
                We only collect information necessary to manage your cooperative membership and loan records — nothing more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Member Information', desc: 'Name, contact details, and ID.' },
                  { label: 'Financial Records', desc: 'Loans, payments, and share capital.' },
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

            {/* Side cards */}
            <div className="md:col-span-4 flex flex-col gap-5">
              <div className="flex-1 bg-gradient-to-br from-primary to-emerald-600 rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg shadow-primary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />
                <UserCheck className="w-9 h-9 opacity-50 relative z-10" />
                <div className="relative z-10">
                  <h3 className="font-headline text-lg font-bold mb-1">Your Rights</h3>
                  <p className="text-white/75 text-xs leading-relaxed">
                    You have the right to access, correct, or request deletion of your personal data at any time.
                  </p>
                </div>
              </div>
              <div className="flex-1 bg-secondary/10 dark:bg-secondary/8 rounded-3xl p-6 border border-secondary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-primary dark:text-secondary" />
                  <h3 className="font-headline text-base font-bold text-on-surface dark:text-white">Data Security</h3>
                </div>
                <p className="text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                  Your data is encrypted and access is limited to authorized cooperative staff only.
                </p>
              </div>
            </div>
          </div>

          {/* ── Detailed sections ─────────────────────────────────────── */}
          <div className="space-y-16">
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                data-section-id={section.id}
                className="relative pl-8 border-l-2 border-outline-variant/30 dark:border-neutral-800 group"
              >
                <div
                  className={`absolute left-[-2px] top-0 w-0.5 rounded-full bg-gradient-to-b from-primary to-secondary transition-all duration-500 ${
                    activeSection === section.id ? 'h-full' : 'h-10 group-hover:h-full'
                  }`}
                />
                <div className="flex items-center gap-3 mb-5">
                  <span className="font-mono text-xs font-bold text-primary/50 dark:text-secondary/40">{section.number}</span>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/15 border border-primary/20 flex items-center justify-center text-primary dark:text-secondary">
                    {section.icon}
                  </div>
                  <h2 className="font-headline text-2xl font-bold text-on-surface dark:text-white">{section.title}</h2>
                </div>
                <div className="font-body text-base">{section.content}</div>
              </section>
            ))}
          </div>

          {/* ── Contact card ──────────────────────────────────────────── */}
          <div className="mt-20 bg-neutral-50 dark:bg-neutral-900/60 rounded-3xl p-10 md:p-14 text-center border border-outline-variant/30 dark:border-neutral-800">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-6 h-6 text-primary dark:text-secondary" />
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white mb-3">Privacy Inquiries</h2>
            <p className="text-on-surface/65 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed mb-8">
              Have questions about how your data is handled? Contact the UC-METC Cooperative office and we will be happy to assist you.
            </p>
            <a
              href="mailto:ucmetc.ecc@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-bold shadow-lg shadow-primary/25 hover:-translate-y-0.5 hover:shadow-xl transition-all active:scale-95"
            >
              <Mail className="w-4 h-4" />
              ucmetc.ecc@gmail.com
            </a>
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

