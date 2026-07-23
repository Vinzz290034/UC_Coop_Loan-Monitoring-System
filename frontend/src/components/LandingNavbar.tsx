'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

// ── Nav items config ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { name: 'Home', path: '/' },
  { name: 'Features', path: '/features' },
  { name: 'How It Works', path: '/how-it-works' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
] as const;

export default function LandingNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /** Determine if a nav item is active based on the current pathname. */
  const isActive = (itemPath: string) =>
    itemPath === '/' ? pathname === '/' : pathname.startsWith(itemPath);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/75 dark:bg-neutral-950/65 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm shadow-black/5 transition-colors duration-200">
      <div className="flex justify-between items-center w-full px-4 sm:px-6 md:px-12 max-w-7xl mx-auto h-20">

        {/* ── Logo ──────────────────────────────────────────────────── */}
        <Link href="/" className="font-brandname text-xl sm:text-2xl font-bold text-primary dark:text-secondary flex items-center gap-1 hover:opacity-90 transition-opacity">
          <img src="/SynCo_logo.png" alt="SynCo Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-contain" />
          SynCo
        </Link>

        {/* ── Desktop nav ───────────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition-all ${isActive(item.path)
                ? 'bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary'
                : 'text-on-surface/70 dark:text-neutral-300 hover:text-primary dark:hover:text-secondary hover:bg-primary/5 dark:hover:bg-secondary/5'
                }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push('/login')}
            className="hidden sm:inline-flex font-label text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 rounded-full border-2 border-on-surface/20 dark:border-neutral-700 text-on-surface dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-all active:scale-95 cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={() => router.push('/register')}
            className="font-label text-xs sm:text-sm font-bold px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-lg shadow-primary/25 dark:shadow-secondary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
          >
            Sign Up
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
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`font-body text-sm py-2.5 px-4 rounded-xl font-semibold transition-colors ${isActive(item.path)
                ? 'text-primary dark:text-secondary bg-primary/8 dark:bg-secondary/8'
                : 'text-on-surface/80 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
            >
              {item.name}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
            <button
              onClick={() => { setMobileMenuOpen(false); router.push('/login'); }}
              className="font-label text-sm w-full py-2.5 rounded-full text-center border border-primary/40 text-primary dark:text-secondary font-bold cursor-pointer hover:bg-primary/5 transition-colors"
            >
              Login
            </button>
            {/* <button
              onClick={() => { setMobileMenuOpen(false); router.push('/register'); }}
              className="font-label text-sm w-full py-2.5 rounded-full text-center bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-bold shadow-md cursor-pointer hover:opacity-95 transition-opacity"
            >
              Sign Up
            </button> */}
          </div>
        </div>
      )}
    </header>
  );
}

