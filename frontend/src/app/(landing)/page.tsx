'use client';

import React from 'react';
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
  ArrowRight,
  TrendingUp,
  Lock,
  CheckCircle2,
} from 'lucide-react';
// ── Shared layout components ────────────────────────────────────────────────
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="bg-background dark:bg-surface-container-low text-on-surface dark:text-neutral-100 transition-colors min-h-screen">

      {/* ── Shared top navigation (see components/LandingNavbar.tsx) ── */}
      <LandingNavbar activeIndex={0} />

      <main className="pt-20">

        {/* ── Hero Section ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-28 md:py-36">

          {/* Animated background */}
          <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/5 dark:from-primary/12 dark:via-neutral-950 dark:to-secondary/8" />

            {/* Aurora blob 1 */}
            <div
              className="absolute -top-40 -left-40 w-[750px] h-[750px] rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(4,120,87,0.30) 0%, rgba(4,120,87,0.10) 50%, transparent 75%)',
                filter: 'blur(55px)',
                animation: 'aurora-shift 18s ease-in-out infinite',
              }}
            />
            {/* Aurora blob 2 */}
            <div
              className="absolute top-1/3 -right-20 w-[650px] h-[650px] rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(52,211,153,0.25) 0%, rgba(52,211,153,0.08) 55%, transparent 80%)',
                filter: 'blur(65px)',
                animation: 'aurora-shift-alt 22s ease-in-out infinite',
              }}
            />
            {/* Aurora blob 3 — accent */}
            <div
              className="absolute -bottom-20 left-1/4 w-[500px] h-[500px] rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(164,80,73,0.14) 0%, transparent 70%)',
                filter: 'blur(80px)',
                animation: 'aurora-shift 26s ease-in-out infinite reverse',
              }}
            />

            {/* Dot grid */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(4,120,87,0.18) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                animation: 'grid-fade 8s ease-in-out infinite',
              }}
            />

            {/* Particles */}
            <div className="absolute top-[14%] left-[7%] text-primary/35 dark:text-secondary/30" style={{ animation: 'particle-drift-1 14s ease-in-out infinite' }}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><polygon points="22,2 40,12 40,32 22,42 4,32 4,12" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            </div>
            <div className="absolute top-[62%] left-[4%] text-secondary/40 dark:text-secondary/25" style={{ animation: 'particle-drift-2 18s ease-in-out infinite' }}>
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none"><rect x="15" y="1" width="20" height="20" rx="2" transform="rotate(45 15 1)" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            </div>
            <div className="absolute top-[32%] left-[20%] text-primary/25 dark:text-primary/20" style={{ animation: 'particle-drift-3 20s ease-in-out infinite' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            </div>
            <div className="absolute top-[18%] right-[10%] text-secondary/30 dark:text-secondary/20" style={{ animation: 'particle-drift-2 16s ease-in-out infinite 2s' }}>
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none"><polygon points="17,2 31,10 31,24 17,32 3,24 3,10" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            </div>
            <div className="absolute bottom-[22%] right-[18%] text-primary/35 dark:text-secondary/25" style={{ animation: 'particle-drift-1 12s ease-in-out infinite 1s' }}>
              <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                <circle cx="8" cy="8" r="3.5" fill="currentColor" />
                <circle cx="25" cy="8" r="2.5" fill="currentColor" opacity="0.6" />
                <circle cx="8" cy="25" r="2.5" fill="currentColor" opacity="0.6" />
                <circle cx="25" cy="25" r="3.5" fill="currentColor" />
                <circle cx="42" cy="16" r="2" fill="currentColor" opacity="0.4" />
                <circle cx="16" cy="42" r="2" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
            <div className="absolute bottom-[8%] left-[28%] text-tertiary/25 dark:text-tertiary/18" style={{ animation: 'particle-drift-3 24s ease-in-out infinite 3s' }}>
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><polygon points="19,3 35,32 3,32" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
            </div>

            {/* Top radial mesh glow */}
            <div
              className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[1100px] h-[700px]"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(4,120,87,0.16) 0%, rgba(52,211,153,0.08) 45%, transparent 75%)',
                filter: 'blur(18px)',
              }}
            />
          </div>

          {/* Hero content */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 text-primary dark:text-secondary text-xs font-bold font-label tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary animate-pulse" />
                Trusted by 75,000+ Institutional Users
              </div>

              {/* Headline */}
              <h1 className="font-headline text-5xl sm:text-6xl lg:text-7xl leading-[1.08] font-extrabold tracking-tight">
                <span className="text-on-surface dark:text-white">Elevate Your</span>
                <br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(135deg, #047857 0%, #34D399 60%, #059669 100%)' }}
                >
                  Financial Edge
                </span>
              </h1>

              {/* Sub-copy */}
              <p className="text-on-surface/65 dark:text-neutral-400 font-body text-lg max-w-lg leading-relaxed">
                Institutional-grade automated finance tools for high-performance lenders. Manage liquidity, automate risk, and scale with absolute precision.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2.5">
                {[
                  { icon: <Lock className="w-3.5 h-3.5" />, label: 'Bank-grade Security' },
                  { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Real-time Analytics' },
                  { icon: <Zap className="w-3.5 h-3.5" />, label: 'Instant Settlement' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800/80 border border-outline-variant/50 text-on-surface/70 dark:text-neutral-300 text-xs font-semibold shadow-sm">
                    <span className="text-primary dark:text-secondary">{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => router.push('/login')}
                  className="group flex items-center gap-2 px-8 py-4 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-bold shadow-xl shadow-primary/30 dark:shadow-secondary/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300 active:scale-95"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/80 dark:bg-neutral-800/60 backdrop-blur border border-outline-variant/60 dark:border-neutral-700 text-on-surface dark:text-white font-label text-sm font-bold hover:bg-white dark:hover:bg-neutral-700/80 hover:shadow-lg transition-all duration-300 active:scale-95"
                >
                  View Live Demo
                </button>
              </div>
            </div>

            {/* Floating visual */}
            <div className="relative h-[500px] flex items-center justify-center">
              {/* Glow base */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[420px] h-[420px] rounded-full bg-primary/12 dark:bg-secondary/8 blur-[90px]" />
              </div>

              {/* Main card */}
              <div className="animate-float z-20 relative">
                <div className="w-[320px] h-[190px] bg-gradient-to-tr from-primary via-emerald-500 to-secondary rounded-2xl shadow-2xl shadow-primary/40 relative overflow-hidden flex flex-col justify-between p-6 transform -rotate-6 border border-white/25">
                  {/* Sheen */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent rounded-2xl" />
                  <div className="flex justify-between items-start relative z-10">
                    <CreditCard className="text-white w-9 h-9 drop-shadow" />
                    <div className="flex flex-col items-end gap-1">
                      <div className="w-12 h-7 bg-white/20 rounded-md backdrop-blur-sm border border-white/20" />
                      <div className="text-white/70 text-[9px] font-mono tracking-widest">VISA</div>
                    </div>
                  </div>
                  <div className="text-white space-y-1.5 relative z-10">
                    <div className="text-[10px] opacity-75 tracking-[0.2em] font-mono font-semibold">LENDFLOW ELITE</div>
                    <div className="font-mono text-base font-bold tracking-widest">•••• •••• •••• 8842</div>
                  </div>
                </div>
              </div>

              {/* Wallet badge */}
              <div className="absolute top-8 right-8 animate-float z-30" style={{ animationDelay: '1.2s' }}>
                <div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl shadow-black/10 border border-outline-variant/30 backdrop-blur">
                  <Wallet className="text-primary dark:text-secondary w-9 h-9" />
                </div>
              </div>

              {/* Coins badge */}
              <div className="absolute bottom-12 left-8 animate-float z-30" style={{ animationDelay: '2.2s' }}>
                <div className="p-3.5 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl shadow-black/10 border border-outline-variant/30">
                  <Coins className="text-tertiary w-7 h-7" />
                </div>
              </div>

              {/* Live stat pop-up */}
              <div className="absolute bottom-6 right-6 animate-float z-30" style={{ animationDelay: '0.5s' }}>
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl shadow-black/10 border border-outline-variant/30 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 font-semibold">Portfolio Return</div>
                    <div className="text-sm font-extrabold text-emerald-500">+24.7% YTD</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Metrics Bar ──────────────────────────────────────────── */}
        <section className="relative border-y border-outline-variant/40 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              {/* Stats */}
              <div className="flex gap-10 items-center">
                {[
                  { value: '75K+', label: 'Active Institutional Users' },
                  { value: '92%', label: 'Instant Approval Rate' },
                  { value: '$2.4B', label: 'Capital Managed' },
                ].map((stat, i) => (
                  <div key={i} className={`text-center md:text-left ${i > 0 ? 'pl-10 border-l border-outline-variant/40 dark:border-neutral-700' : ''}`}>
                    <div className="font-headline text-3xl md:text-4xl font-extrabold text-primary dark:text-secondary">{stat.value}</div>
                    <div className="font-label text-xs text-on-surface/60 dark:text-neutral-400 font-semibold mt-1 whitespace-nowrap">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Trusted by logos */}
              <div className="flex flex-col items-center md:items-end gap-2">
                <div className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">Trusted by</div>
                <div className="flex flex-wrap justify-center gap-6 opacity-40 dark:opacity-30">
                  {['FINTECH CORP', 'GLOBAL BANK', 'EQUITY PLUS', 'FLOW PARTNERS'].map(b => (
                    <span key={b} className="font-headline text-sm font-extrabold tracking-tighter text-on-surface dark:text-white">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Strategic Choice ─────────────────────────────────────── */}
        <section className="py-28 bg-white dark:bg-neutral-950 relative overflow-hidden">
          {/* Subtle background tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-6 md:px-12">
            {/* Section header */}
            <div className="text-center mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-bold font-label border border-primary/15 dark:border-secondary/15">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Built for Institutions
              </div>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface dark:text-white leading-tight">
                The Strategic Choice for<br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #047857 0%, #34D399 100%)' }}>Modern Lenders</span>
              </h2>
              <p className="font-body text-base text-on-surface/60 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
                Our architecture is built on four pillars of institutional excellence, ensuring your capital is always optimized.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 items-center">
              {/* Left pillars */}
              <div className="space-y-14 md:text-right">
                {[
                  { icon: <Shield className="text-primary dark:text-secondary w-6 h-6" />, color: 'primary', title: 'Security', desc: 'Bank-grade encryption for every micro-transaction and data packet.' },
                  { icon: <ShieldCheck className="text-primary dark:text-secondary w-6 h-6" />, color: 'primary', title: 'Safety', desc: 'Multi-layered protocol protection against automated market volatility.' },
                ].map(p => (
                  <div key={p.title} className="group space-y-2.5 md:items-end flex flex-col">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/20 shadow-sm group-hover:scale-110 group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-300">
                      {p.icon}
                    </div>
                    <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">{p.title}</h3>
                    <p className="font-body text-sm text-on-surface/60 dark:text-neutral-400 leading-relaxed max-w-[220px]">{p.desc}</p>
                  </div>
                ))}
              </div>

              {/* Center phone mockup */}
              <div className="relative flex justify-center">
                {/* Glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-[500px] bg-primary/8 dark:bg-secondary/6 rounded-full blur-3xl" />
                </div>
                <div className="relative w-72 h-[500px] rounded-[2.8rem] border-[8px] border-neutral-800 dark:border-neutral-900 bg-neutral-950 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
                  {/* Notch */}
                  <div className="absolute top-0 w-full h-9 flex justify-center pt-2.5 z-10">
                    <div className="w-20 h-5 bg-neutral-900 rounded-full" />
                  </div>
                  {/* Screen content */}
                  <div className="p-5 pt-14 space-y-5 h-full bg-neutral-950">
                    {/* Card widget */}
                    <div className="h-36 w-full rounded-2xl bg-gradient-to-tr from-primary to-secondary p-5 flex flex-col justify-between shadow-lg border border-white/15 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                      <div className="flex justify-between items-center relative z-10">
                        <div className="w-9 h-6 bg-white/25 rounded backdrop-blur" />
                        <span className="text-white font-extrabold text-xs tracking-widest">VISA</span>
                      </div>
                      <div className="text-white text-xs tracking-[0.15em] font-mono font-bold relative z-10">•••• •••• •••• 4412</div>
                    </div>
                    {/* Balance row */}
                    <div className="flex items-center justify-between px-2">
                      <div className="space-y-1">
                        <div className="h-2.5 w-16 bg-neutral-800 rounded" />
                        <div className="text-white font-extrabold text-xl font-headline">$84,210</div>
                      </div>
                      <div className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">+4.2%</div>
                    </div>
                    {/* Skeleton inputs */}
                    <div className="space-y-2.5">
                      <div className="h-2 w-20 bg-neutral-800 rounded" />
                      <div className="h-11 w-full bg-neutral-900 rounded-xl border border-neutral-800" />
                      <div className="h-11 w-full bg-neutral-900 rounded-xl border border-neutral-800" />
                    </div>
                    {/* CTA */}
                    <div className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Transfer Funds</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right pillars */}
              <div className="space-y-14">
                {[
                  { icon: <Fingerprint className="text-tertiary w-6 h-6" />, color: 'tertiary', title: 'Authentication', desc: 'Biometric and hardware-key support for institutional access controls.' },
                  { icon: <Building2 className="text-primary dark:text-secondary w-6 h-6" />, color: 'primary', title: 'Account', desc: 'Unified management for primary and sub-custodial lending pools.' },
                ].map(p => (
                  <div key={p.title} className="group space-y-2.5">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${p.color === 'tertiary' ? 'bg-tertiary/10 border-tertiary/20' : 'bg-primary/10 dark:bg-primary/15 border-primary/20'} border shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                      {p.icon}
                    </div>
                    <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">{p.title}</h3>
                    <p className="font-body text-sm text-on-surface/60 dark:text-neutral-400 leading-relaxed max-w-[220px]">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento Grid ───────────────────────────────────────────── */}
        <section className="py-28 bg-neutral-50 dark:bg-neutral-900/40 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            {/* Section header */}
            <div className="text-center mb-14 space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-bold font-label border border-secondary/20">
                <Award className="w-3.5 h-3.5" />
                Platform Capabilities
              </div>
              <h2 className="font-headline text-4xl font-extrabold text-on-surface dark:text-white">Everything you need to scale</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Card 1: Earn Rewards */}
              <div className="md:col-span-4 group bg-white dark:bg-neutral-800/70 p-8 rounded-3xl border border-outline-variant/50 dark:border-neutral-700/60 flex flex-col justify-between hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="space-y-3 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-primary/12 dark:bg-primary/20 flex items-center justify-center border border-primary/20">
                    <Award className="text-primary dark:text-secondary w-5 h-5" />
                  </div>
                  <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Earn Rewards</h3>
                  <p className="font-body text-sm text-on-surface/60 dark:text-neutral-400 leading-relaxed">
                    Maximize your yield with automated reinvestment protocols.
                  </p>
                </div>
                <div className="mt-8 relative z-10">
                  <div className="h-28 w-full bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/15 dark:to-secondary/10 rounded-2xl flex items-center justify-center border border-primary/15">
                    <div className="text-center">
                      <div className="text-primary dark:text-secondary font-headline text-3xl font-extrabold">+4.2%</div>
                      <div className="text-primary/60 dark:text-secondary/60 text-xs font-bold mt-0.5">Annual Percentage Yield</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Always Protected */}
              <div className="md:col-span-8 bg-neutral-950 text-white p-8 rounded-3xl overflow-hidden relative group border border-neutral-800">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="z-10 relative md:w-1/2 space-y-4">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
                    <Shield className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="font-headline text-2xl font-bold">Always Protected</h3>
                  <p className="text-neutral-400 font-body text-sm leading-relaxed">
                    Our real-time dashboard monitors global market swings 24/7 to safeguard your principal capital.
                  </p>
                  <button
                    onClick={() => router.push('/login')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 hover:bg-white hover:text-neutral-950 transition-all font-label text-xs font-bold group/btn"
                  >
                    View Dashboard
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                {/* Mock dashboard panel */}
                <div className="absolute right-[-8%] bottom-[-12%] w-[55%] h-[130%] rotate-[-8deg] transition-all group-hover:rotate-0 group-hover:right-[-4%] duration-700 hidden md:block">
                  <div className="w-full h-full bg-neutral-900 border border-white/8 rounded-2xl p-5 shadow-2xl">
                    <div className="flex gap-2 mb-5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex gap-2 items-center">
                        <div className="h-2.5 w-2/3 bg-white/8 rounded" />
                        <div className="h-2 w-1/4 bg-secondary/30 rounded" />
                      </div>
                      <div className="h-2.5 w-full bg-white/8 rounded" />
                      <div className="h-24 w-full bg-primary/15 rounded-xl border border-primary/30 flex items-end p-2.5 gap-1.5">
                        {[2, 4, 6, 8, 5, 7, 9].map((v, i) => (
                          <div key={i} className="flex-1 bg-gradient-to-t from-primary to-secondary rounded-sm opacity-80" style={{ height: `${v * 10}%` }} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <div className="h-2 w-1/3 bg-white/8 rounded" />
                        <div className="h-2 w-1/4 bg-secondary/20 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: No Volatility */}
              <div className="md:col-span-7 bg-gradient-to-br from-primary to-emerald-600 text-white p-8 rounded-3xl flex items-center gap-6 border border-white/10 shadow-lg shadow-primary/25 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-1/2 space-y-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-headline text-xl font-bold">No Volatility</h3>
                  <p className="text-white/75 font-body text-sm leading-relaxed">
                    Smart-hedging technology that neutralizes downside risk instantly.
                  </p>
                </div>
                <div className="w-1/2 flex justify-center relative z-10">
                  <div className="w-full h-24 bg-white/12 rounded-2xl flex items-center justify-center p-4 border border-white/20">
                    <svg className="w-full h-full text-white drop-shadow" viewBox="0 0 100 24">
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                          <stop offset="100%" stopColor="rgba(255,255,255,1)" />
                        </linearGradient>
                      </defs>
                      <path d="M0 12 Q 25 6, 50 12 T 100 12" fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Card 4: Get Paid Faster */}
              <div className="md:col-span-5 group bg-white dark:bg-neutral-800/70 p-8 rounded-3xl border border-outline-variant/50 dark:border-neutral-700/60 flex flex-col justify-center hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-primary/12 dark:bg-primary/20 flex items-center justify-center border border-primary/20">
                      <Zap className="w-5 h-5 text-primary dark:text-secondary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Get paid faster</h3>
                      <p className="font-body text-sm text-on-surface/60 dark:text-neutral-400">
                        Instant settlement on all enterprise-level transactions.
                      </p>
                    </div>
                  </div>
                  {/* Transaction notification */}
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-900/80 rounded-2xl flex items-center gap-3 border border-outline-variant/40 dark:border-neutral-700/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-primary/30 flex-shrink-0">L</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-neutral-400 tracking-wide">SynCo</div>
                      <div className="text-sm font-bold text-on-surface dark:text-white truncate">Payment Received: $12,450.00</div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <div className="text-[10px] font-semibold text-neutral-400">Now</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Integration CTA ──────────────────────────────────────── */}
        <section className="py-28 bg-white dark:bg-neutral-950">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="relative bg-gradient-to-br from-primary via-emerald-600 to-secondary/90 rounded-[2.5rem] p-12 md:p-20 flex flex-col md:flex-row items-center gap-16 overflow-hidden border border-white/10 shadow-2xl shadow-primary/20">
              {/* Decorative elements */}
              <div className="absolute -right-24 -bottom-24 w-96 h-96 border-[3px] border-white/8 rounded-full pointer-events-none" />
              <div className="absolute -right-6 -bottom-6 w-48 h-48 border-[3px] border-white/12 rounded-full pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />

              <div className="md:w-1/2 z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold font-label">
                  <Code className="w-3.5 h-3.5" />
                  Enterprise API
                </div>
                <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-white leading-tight">
                  Seamless Integration<br />with your Stack
                </h2>
                <p className="text-white/75 font-body text-base max-w-md leading-relaxed">
                  Connect SynCo to your existing CRM, accounting software, and treasury systems with our enterprise-grade API.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => router.push('/login')}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-label text-sm font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
                  >
                    Explore Docs
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-6 py-3 bg-white/12 text-white font-label text-sm font-bold rounded-full border border-white/20 hover:bg-white/20 active:scale-95 transition-all backdrop-blur"
                  >
                    Get API Keys
                  </button>
                </div>
              </div>

              <div className="md:w-1/2 flex justify-center z-10">
                <div className="grid grid-cols-3 gap-4 md:gap-5 transform rotate-6 hover:rotate-0 transition-transform duration-700">
                  {[
                    { icon: <Cloud className="w-7 h-7 text-white" />, glass: true },
                    { icon: <Cpu className="w-7 h-7 text-primary" />, glass: false },
                    { icon: <Database className="w-7 h-7 text-white" />, glass: true },
                    { icon: <GitMerge className="w-7 h-7 text-indigo-500" />, glass: false },
                    { icon: <Code className="w-7 h-7 text-white" />, glass: true },
                    { icon: <Hexagon className="w-7 h-7 text-emerald-500" />, glass: false },
                  ].map((b, i) => (
                    <div key={i} className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-200 cursor-default ${b.glass ? 'bg-white/12 backdrop-blur border border-white/20' : 'bg-white shadow-lg'}`}>
                      {b.icon}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Shared footer (see components/LandingFooter.tsx) ──────── */}
      <LandingFooter />
    </div>
  );
}


