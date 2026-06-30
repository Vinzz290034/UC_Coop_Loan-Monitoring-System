'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Wallet,
  Coins,
  Shield,
  ShieldCheck,
  Fingerprint,
  Building2,
  Award,
  Zap,
  Cloud,
  Cpu,
  Database,
  GitMerge,
  Code,
  Hexagon,
  CheckCircle2,
  ChevronDown,
  Globe,
  Mail,
  Menu,
  X
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <div className="bg-background dark:bg-surface-container-low text-on-surface dark:text-neutral-100 transition-colors min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border-b border-outline-variant/30 shadow-sm transition-colors duration-200">
        <div className="flex justify-between items-center w-full px-6 md:px-12 max-w-7xl mx-auto h-20">
          <div className="font-headline text-2xl font-bold text-primary dark:text-secondary flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary dark:text-secondary" />
            LendFlow Pro
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="font-body text-sm font-bold text-primary dark:text-secondary border-b-2 border-primary dark:border-secondary pb-1" href="#">
              Personal
            </Link>
            {/* Optimized typography color weighting for text-on-surface for optimal demographic legibility */}
            <Link className="font-body text-sm font-semibold text-on-surface dark:text-neutral-200 hover:text-primary dark:hover:text-secondary transition-colors" href="#">
              Business
            </Link>
            <Link className="font-body text-sm font-semibold text-on-surface dark:text-neutral-200 hover:text-primary dark:hover:text-secondary transition-colors" href="#">
              Enterprise
            </Link>
            <Link className="font-body text-sm font-semibold text-on-surface dark:text-neutral-200 hover:text-primary dark:hover:text-secondary transition-colors" href="#">
              Developer
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push('/login')}
              className="hidden sm:inline-flex font-label text-sm font-bold px-6 py-2.5 rounded-full text-primary dark:text-secondary hover:bg-primary/10 dark:hover:bg-secondary/10 transition-all active:scale-95 border border-primary/30 dark:border-secondary/30 cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/login?signup=true')}
              className="font-label text-sm font-bold px-6 py-2.5 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md shadow-primary/15 dark:shadow-secondary/15 hover:translate-y-[-1px] transition-all active:scale-95 hover:shadow-lg cursor-pointer"
            >
              Sign Up
            </button>
            <button
              className="md:hidden p-2 text-on-surface dark:text-neutral-100 cursor-pointer rounded-lg hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu — Updated to support the semi-transparent glass aesthetic */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg border-b border-outline-variant/40 px-6 py-4 flex flex-col gap-4 animate-fade-in text-on-surface dark:text-neutral-100">
            <Link className="font-body text-sm text-primary dark:text-secondary py-2 border-b border-outline-variant/20 font-bold" href="#" onClick={() => setMobileMenuOpen(false)}>
              Personal
            </Link>
            <Link className="font-body text-sm text-on-surface dark:text-neutral-200 py-2 border-b border-outline-variant/20 font-semibold" href="#" onClick={() => setMobileMenuOpen(false)}>
              Business
            </Link>
            <Link className="font-body text-sm text-on-surface dark:text-neutral-200 py-2 border-b border-outline-variant/20 font-semibold" href="#" onClick={() => setMobileMenuOpen(false)}>
              Enterprise
            </Link>
            <Link className="font-body text-sm text-on-surface dark:text-neutral-200 py-2 font-semibold" href="#" onClick={() => setMobileMenuOpen(false)}>
              Developer
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                router.push('/login');
              }}
              className="font-label text-sm w-full py-2.5 rounded-full text-center border border-primary/45 text-primary dark:text-secondary font-bold cursor-pointer"
            >
              Login
            </button>
          </div>
        )}
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="z-10 text-left space-y-6">
              <h1 className="text-on-surface font-headline text-4xl sm:text-5xl lg:text-6xl leading-tight font-extrabold tracking-tight">
                Enhance your Finance with <span className="text-primary dark:text-secondary">LendFlow Pro</span>
              </h1>
              <p className="text-on-surface/75 dark:text-neutral-300 font-body text-lg max-w-lg leading-relaxed font-semibold">
                Institutional-grade automated finance tools designed for high-performance lenders. Manage liquidity, automate risk, and scale with absolute precision.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => router.push('/login')}
                  className="px-8 py-4 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-bold shadow-lg hover:translate-y-[-2px] hover:shadow-primary/25 dark:hover:shadow-secondary/25 transition-all active:scale-95"
                >
                  Get started now
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-8 py-4 rounded-full border-2 border-outline dark:border-neutral-600 text-on-surface dark:text-white font-label text-sm font-bold hover:bg-neutral/10 dark:hover:bg-neutral-800/50 transition-all active:scale-95"
                >
                  View Demo
                </button>
              </div>
            </div>

            {/* Floating Assets Container */}
            <div className="relative h-[450px] flex items-center justify-center">
              <div className="animate-float z-20">
                <div className="w-80 h-48 bg-gradient-to-tr from-primary to-secondary/80 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col justify-between p-6 transform -rotate-12 border border-white/20">
                  <div className="flex justify-between items-start">
                    <CreditCard className="text-white w-10 h-10" />
                    <div className="w-12 h-8 bg-white/20 rounded-md"></div>
                  </div>
                  <div className="text-white space-y-2">
                    <div className="text-xs opacity-90 tracking-widest font-mono">LENDFLOW ELITE</div>
                    <div className="font-mono text-lg font-bold">•••• •••• •••• 8842</div>
                  </div>
                </div>
              </div>
              <div className="absolute top-10 right-10 animate-float" style={{ animationDelay: '1s' }}>
                <div className="p-5 bg-white dark:bg-neutral-800 rounded-full shadow-xl border border-outline-variant/40">
                  <Wallet className="text-primary dark:text-secondary w-10 h-10" />
                </div>
              </div>
              <div className="absolute bottom-10 left-10 animate-float" style={{ animationDelay: '2s' }}>
                <div className="p-4 bg-white dark:bg-neutral-800 rounded-full shadow-lg border border-outline-variant/40">
                  <Coins className="text-tertiary w-8 h-8" />
                </div>
              </div>
              {/* Subtle Decorative Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/10 dark:bg-secondary/5 blur-[80px] rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Metrics Bar */}
        <section className="bg-neutral-100 dark:bg-neutral-800/40 border-y border-outline-variant/60 py-12">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex gap-8 items-center divide-x divide-outline-variant/50">
                <div className="text-center md:text-left">
                  <div className="font-headline text-3xl md:text-4xl font-extrabold text-primary dark:text-secondary">75K+</div>
                  <div className="font-label text-sm text-on-surface dark:text-neutral-200 font-bold mt-1">Active Institutional Users</div>
                </div>
                <div className="pl-8 text-center md:text-left">
                  <div className="font-headline text-3xl md:text-4xl font-extrabold text-primary dark:text-secondary">92%</div>
                  <div className="font-label text-sm text-on-surface dark:text-neutral-200 font-bold mt-1">Instant Approval Rate</div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12 opacity-60 grayscale dark:foreground">
                <span className="font-headline text-lg font-extrabold tracking-tighter">FINTECH CORP</span>
                <span className="font-headline text-lg font-extrabold tracking-tighter">GLOBAL BANK</span>
                <span className="font-headline text-lg font-extrabold tracking-tighter">EQUITY PLUS</span>
                <span className="font-headline text-lg font-extrabold tracking-tighter">FLOW PARTNERS</span>
              </div>
            </div>
          </div>
        </section>

        {/* Strategic Choice Section */}
        <section className="py-24 bg-white dark:bg-neutral-900/50">
          <div className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-16 space-y-3">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface dark:text-white">
              The Strategic Choice for Modern Lenders
            </h2>
            <p className="font-body text-base text-on-surface/75 dark:text-neutral-300 max-w-2xl mx-auto font-semibold">
              Our architecture is built on four pillars of institutional excellence, ensuring your capital is always optimized.
            </p>
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            {/* Left Columns */}
            <div className="space-y-12 md:text-right">
              <div className="group space-y-2">
                <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-primary/10 mb-2 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-primary/20">
                  <Shield className="text-primary dark:text-secondary w-7 h-7" />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Security</h3>
                <p className="font-body text-sm text-on-surface/75 dark:text-neutral-300 font-semibold leading-relaxed">
                  Bank-grade encryption for every micro-transaction and data packet.
                </p>
              </div>
              <div className="group space-y-2">
                <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-primary/10 mb-2 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-primary/20">
                  <ShieldCheck className="text-primary dark:text-secondary w-7 h-7" />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Safety</h3>
                <p className="font-body text-sm text-on-surface/75 dark:text-neutral-300 font-semibold leading-relaxed">
                  Multi-layered protocol protection against automated market volatility.
                </p>
              </div>
            </div>

            {/* Center Mockup */}
            <div className="relative flex justify-center">
              <div className="relative w-72 h-[480px] rounded-[2.5rem] border-[8px] border-neutral-700 dark:border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl">
                <div className="absolute top-0 w-full h-8 flex justify-center pt-2">
                  <div className="w-16 h-4 bg-neutral-800 rounded-full"></div>
                </div>
                <div className="p-6 pt-12 space-y-6">
                  <div className="h-36 w-full rounded-2xl bg-gradient-to-tr from-primary to-secondary p-4 flex flex-col justify-between shadow-lg transform -rotate-3 border border-white/20">
                    <div className="flex justify-between items-center">
                      <div className="w-8 h-8 bg-white/20 rounded"></div>
                      <span className="text-white font-bold text-xs">VISA</span>
                    </div>
                    <div className="text-white text-xs tracking-widest font-mono font-bold">•••• 4412</div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-24 bg-neutral-800 rounded"></div>
                    <div className="h-10 w-full bg-neutral-800 rounded-xl"></div>
                    <div className="h-10 w-full bg-neutral-800 rounded-xl"></div>
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 w-[120%] h-[120%] top-[-10%] bg-primary/5 dark:bg-secondary/5 rounded-full blur-3xl"></div>
            </div>

            {/* Right Columns */}
            <div className="space-y-12">
              <div className="group space-y-2">
                <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-tertiary/10 mb-2 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-tertiary/20">
                  <Fingerprint className="text-tertiary w-7 h-7" />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Authentication</h3>
                <p className="font-body text-sm text-on-surface/75 dark:text-neutral-300 font-semibold leading-relaxed">
                  Biometric and hardware-key support for institutional access controls.
                </p>
              </div>
              <div className="group space-y-2">
                <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-primary/10 mb-2 group-hover:scale-105 transition-transform duration-300 shadow-sm border border-primary/20">
                  <Building2 className="text-primary dark:text-secondary w-7 h-7" />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Account</h3>
                <p className="font-body text-sm text-on-surface/75 dark:text-neutral-300 font-semibold leading-relaxed">
                  Unified management for primary and sub-custodial lending pools.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Section */}
        <section className="py-24 bg-neutral-50 dark:bg-neutral-900/30">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Card 1: Earn Rewards */}
              <div className="md:col-span-4 bg-white dark:bg-neutral-800 p-8 rounded-3xl border border-outline-variant/60 flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                <div className="space-y-3">
                  <Award className="text-primary dark:text-secondary w-10 h-10" />
                  <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Earn Rewards</h3>
                  <p className="font-body text-sm text-on-surface/75 dark:text-neutral-300 font-semibold leading-relaxed">
                    Maximize your yield with automated reinvestment protocols.
                  </p>
                </div>
                <div className="mt-8">
                  <div className="h-28 w-full bg-primary/10 rounded-2xl flex items-center justify-center">
                    <div className="text-primary dark:text-secondary font-headline text-2xl font-extrabold">+4.2% APY</div>
                  </div>
                </div>
              </div>

              {/* Card 2: Always Protected */}
              <div className="md:col-span-8 bg-neutral-950 text-white p-8 rounded-3xl overflow-hidden relative group border border-neutral-850">
                <div className="z-10 relative md:w-1/2 space-y-4">
                  <h3 className="font-headline text-2xl font-bold">Always Protected</h3>
                  <p className="text-neutral-300 font-body text-sm font-semibold leading-relaxed">
                    Our real-time dashboard monitors global market swings 24/7 to safeguard your principal capital.
                  </p>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-2.5 rounded-full border border-white/30 hover:bg-white hover:text-on-surface transition-all font-label text-xs font-bold"
                  >
                    View Dashboard
                  </button>
                </div>
                <div className="absolute right-[-10%] bottom-[-10%] w-[60%] h-[120%] rotate-[-10deg] transition-transform group-hover:rotate-0 duration-700 hidden md:block">
                  <div className="w-full h-full bg-neutral-900 border border-white/10 rounded-2xl p-6">
                    <div className="flex gap-2 mb-6">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 w-3/4 bg-white/10 rounded"></div>
                      <div className="h-3 w-full bg-white/10 rounded"></div>
                      <div className="h-20 w-full bg-primary/20 rounded-xl border border-primary/45 flex items-end p-2 gap-1">
                        <div className="w-full bg-primary h-1/4 rounded-sm"></div>
                        <div className="w-full bg-primary h-1/2 rounded-sm"></div>
                        <div className="w-full bg-primary h-3/4 rounded-sm"></div>
                        <div className="w-full bg-primary h-full rounded-sm"></div>
                        <div className="w-full bg-primary h-2/3 rounded-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: No Volatility */}
              <div className="md:col-span-7 bg-primary text-white p-8 rounded-3xl flex items-center gap-6 border border-primary-container">
                <div className="w-1/2 space-y-2">
                  <h3 className="font-headline text-xl font-bold">No Volatility</h3>
                  <p className="text-primary-fixed/90 font-body text-sm font-semibold">
                    Smart-hedging technology that neutralizes downside risk instantly.
                  </p>
                </div>
                <div className="w-1/2 flex justify-center">
                  <div className="w-full h-20 bg-white/10 rounded-full flex items-center justify-center p-4">
                    <svg className="w-full h-full text-white" viewBox="0 0 100 20">
                      <path d="M0 10 Q 25 5, 50 10 T 100 10" fill="none" stroke="currentColor" strokeWidth="2"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 4: Get Paid Faster */}
              <div className="md:col-span-5 bg-white dark:bg-neutral-800 p-8 rounded-3xl border border-outline-variant/60 flex flex-col justify-center hover:shadow-lg transition-all duration-300">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-2.5 rounded-full bg-primary/10 text-primary dark:text-secondary">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Get paid faster</h3>
                    <p className="font-body text-sm text-on-surface/75 dark:text-neutral-300 font-semibold">
                      Instant settlement on all enterprise-level transactions.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl flex items-center gap-3 border border-outline-variant/40">
                  <div className="w-10 h-10 rounded-full bg-primary dark:bg-secondary flex items-center justify-center text-white dark:text-neutral-950 font-bold">L</div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-neutral-500">LendFlow Pro</div>
                    <div className="text-xs font-bold text-on-surface dark:text-white">Payment Received: $12,450.00</div>
                  </div>
                  <div className="text-[10px] font-semibold text-neutral-500">Now</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integration Section */}
        <section className="py-24 bg-white dark:bg-neutral-900/50">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="bg-gradient-to-r from-primary to-secondary/80 rounded-[2.5rem] p-12 md:p-20 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative border border-white/10">
              <div className="md:w-1/2 z-10 text-left space-y-6">
                <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-white">
                  Seamless Integration with your Stack
                </h2>
                <p className="text-white/90 font-body text-base font-semibold max-w-md leading-relaxed">
                  Connect LendFlow Pro to your existing CRM, accounting software, and treasury systems with our enterprise-grade API.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-3 bg-white text-primary font-label text-sm font-bold rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    Explore Documentation
                  </button>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-3 bg-white/15 text-white font-label text-sm font-bold rounded-full border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
                  >
                    API Keys
                  </button>
                </div>
              </div>
              <div className="md:w-1/2 flex justify-center relative">
                <div className="grid grid-cols-3 gap-4 md:gap-6 transform rotate-12">
                  {/* Honeycomb badges */}
                  <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                    <Cloud className="text-white w-8 h-8" />
                  </div>
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                    <Cpu className="text-primary w-8 h-8" />
                  </div>
                  <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                    <Database className="text-white w-8 h-8" />
                  </div>
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                    <GitMerge className="text-indigo-600 w-8 h-8" />
                  </div>
                  <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                    <Code className="text-white w-8 h-8" />
                  </div>
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                    <Hexagon className="text-emerald-500 w-8 h-8" />
                  </div>
                </div>
              </div>
              {/* Decorative Circle */}
              <div className="absolute -right-20 -bottom-20 w-80 h-80 border-4 border-white/10 rounded-full"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-50 dark:bg-neutral-900 border-t border-outline-variant/40 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-5 gap-8 border-b border-outline-variant/30 pb-12">
          <div className="md:col-span-2 space-y-4">
            <div className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              LendFlow Pro
            </div>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 max-w-xs leading-relaxed font-semibold">
              Institutional excellence in automated finance. Empowering the next generation of lenders with precision and reliability.
            </p>
            <div className="flex gap-4">
              <Link className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-primary dark:hover:text-secondary border border-outline-variant/40 transition-colors" href="#">
                <Globe className="w-5 h-5" />
              </Link>
              <Link className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-primary dark:hover:text-secondary border border-outline-variant/40 transition-colors" href="#">
                <Mail className="w-5 h-5" />
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white mb-4">Account</h4>
            <ul className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400 font-body font-semibold">
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">Personal Dashboard</Link></li>
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">Business Profile</Link></li>
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">Treasury Access</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white mb-4">Company</h4>
            <ul className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400 font-body font-semibold">
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">About Us</Link></li>
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">Careers</Link></li>
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-headline text-sm font-bold text-on-surface dark:text-white mb-4">Help</h4>
            <ul className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400 font-body font-semibold">
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">Support Center</Link></li>
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">API Status</Link></li>
              <li><Link className="hover:text-primary dark:hover:text-secondary transition-colors" href="#">Documentation</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex flex-col gap-1.5 text-left w-full sm:w-auto">
            <div>
              © 2026 LendFlow Pro. Institutional excellence in automated finance. All rights reserved.
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold flex items-center gap-1.5 mt-0.5">
              <Cpu className="w-3.5 h-3.5 text-primary dark:text-secondary" />
              Engineered & Maintained by <span className="text-on-surface dark:text-white font-extrabold">KADT Solutions</span>
            </div>
          </div>
          <div className="flex gap-6 self-start sm:self-center">
            <Link className="hover:text-primary transition-colors" href="#">Terms</Link>
            <Link className="hover:text-primary transition-colors" href="#">Privacy</Link>
            <Link className="hover:text-primary transition-colors" href="#">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
