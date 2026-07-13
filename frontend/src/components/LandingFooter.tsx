'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Globe, Mail, Cpu } from 'lucide-react';

// ── Props ─────────────────────────────────────────────────────────────────────
interface LandingFooterProps {
  /** Highlight the active legal page link in the footer. */
  activeLegal?: 'terms' | 'privacy' | null;
}

// ── Footer column config ──────────────────────────────────────────────────────
const FOOTER_COLUMNS = [
  { title: 'Account', links: ['Personal Dashboard', 'Business Profile', 'Treasury Access'] },
  { title: 'Company', links: ['About Us', 'Careers', 'Privacy Policy'] },
  { title: 'Help', links: ['Support Center', 'API Status', 'Documentation'] },
] as const;

export default function LandingFooter({ activeLegal = null }: LandingFooterProps) {
  return (
    <footer className="bg-neutral-50 dark:bg-neutral-950 border-t border-outline-variant/30 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-10">

        {/* ── Main grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 border-b border-outline-variant/20 dark:border-neutral-800 pb-12">

          {/* Brand column */}
          <div className="md:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity w-fit">
              <img src="/SynCo_logo.png" alt="SynCo Logo" className="w-8 h-8 object-contain" />
              <span className="font-headline text-lg font-extrabold text-primary dark:text-secondary">SynCo</span>
            </Link>
            <p className="font-body text-xs text-neutral-500 dark:text-neutral-500 max-w-xs leading-relaxed">
              Institutional excellence in automated finance. Empowering the next generation of lenders with precision and reliability.
            </p>

            {/* Social/contact icon links */}
            <div className="flex gap-3">
              {[
                { icon: <Globe className="w-4 h-4" />, label: 'Website' },
                { icon: <Mail className="w-4 h-4" />, label: 'Email' },
              ].map(s => (
                <Link
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-primary dark:hover:text-secondary border border-outline-variant/30 dark:border-neutral-700 transition-all hover:scale-105 active:scale-95"
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
                  <li key={l}>
                    <Link
                      href="#"
                      className="text-xs text-neutral-500 dark:text-neutral-500 hover:text-primary dark:hover:text-secondary font-semibold transition-colors"
                    >
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ──────────────────────────────────────────── */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-neutral-400">
          <div className="flex flex-col gap-1.5 text-left w-full sm:w-auto">
            <div>© 2026 SynCo. All rights reserved.</div>
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
  );
}
