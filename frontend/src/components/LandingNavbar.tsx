'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

// ── Props ─────────────────────────────────────────────────────────────────────
interface LandingNavbarProps {
  /** Index of the currently active nav item (0 = Personal, etc.). -1 = none. */
  activeIndex?: number;
}

// ── Nav items config ──────────────────────────────────────────────────────────
const NAV_ITEMS = ['Personal', 'Business', 'Enterprise', 'Developer'] as const;

export default function LandingNavbar({ activeIndex = 0 }: LandingNavbarProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/75 dark:bg-neutral-950/65 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm shadow-black/5 transition-colors duration-200">
      <div className="flex justify-between items-center w-full px-6 md:px-12 max-w-7xl mx-auto h-20">

        {/* ── Logo ──────────────────────────────────────────────────── */}
        <Link href="/" className="font-headline text-xl font-extrabold text-primary dark:text-secondary flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary dark:bg-secondary flex items-center justify-center shadow-md shadow-primary/30 dark:shadow-secondary/30">
            <Building2 className="w-4 h-4 text-white dark:text-neutral-950" />
          </div>
          LendFlow Pro
        </Link>

        {/* ── Desktop nav ───────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item}
              href="#"
              className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition-all ${
                i === activeIndex
                  ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary'
                  : 'text-on-surface/70 dark:text-neutral-300 hover:text-primary dark:hover:text-secondary hover:bg-primary/5 dark:hover:bg-secondary/5'
              }`}
            >
              {item}
            </Link>
          ))}
        </nav>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push('/login')}
            className="hidden sm:inline-flex font-label text-sm font-bold px-5 py-2 rounded-full text-on-surface dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-all active:scale-95 cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={() => router.push('/login?signup=true')}
            className="font-label text-sm font-bold px-5 py-2.5 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-lg shadow-primary/25 dark:shadow-secondary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
          >
            Get Started
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-on-surface dark:text-neutral-100 cursor-pointer rounded-lg hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ─────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-b border-outline-variant/30 px-6 py-5 flex flex-col gap-2">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item}
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              className={`font-body text-sm py-2.5 px-4 rounded-xl font-semibold transition-colors ${
                i === activeIndex
                  ? 'text-primary dark:text-secondary bg-primary/8 dark:bg-secondary/8'
                  : 'text-on-surface/80 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {item}
            </Link>
          ))}
          <button
            onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}
            className="mt-2 font-label text-sm w-full py-2.5 rounded-full text-center border border-primary/40 text-primary dark:text-secondary font-bold cursor-pointer"
          >
            Login
          </button>
        </div>
      )}
    </header>
  );
}
