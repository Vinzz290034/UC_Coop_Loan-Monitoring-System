'use client';

import React from 'react';
import Link from 'next/link';
import {
  Shield,
  ShieldCheck,
  Award,
  Zap,
  ArrowRight,
  TrendingUp,
  Lock,
  CheckCircle2,
  Calculator,
  PiggyBank,
  Clock,
  FileText,
  Receipt,
  Users,
  Check,
  Building2,
  FileSpreadsheet,
  BadgePercent,
  Layers,
  Banknote,
  Coins,
} from 'lucide-react';
import { ScrollReveal } from '@/components/animations/ScrollReveal';
import { TypewriterText } from '@/components/animations/TypewriterText';

export default function LandingPage() {
  return (
    <>
      <main className="pt-20 w-full overflow-x-clip">

        {/* ── Hero Section ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-24 md:py-32">

          {/* Animated financial background */}
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

            {/* Philippine Peso, Money Bill, and Coin Floating Elements */}

            {/* 1. Floating Peso Badge - Top Left */}
            <div
              className="absolute top-[10%] left-[5%] select-none z-0"
              style={{ animation: 'peso-float-1 9s ease-in-out infinite' }}
            >
              <div className="w-12 h-12 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-lg shadow-primary/10 text-primary dark:text-secondary font-headline font-extrabold text-2xl">
                ₱
              </div>
            </div>

            {/* 2. Floating Money Bill - Mid-Left */}
            <div
              className="absolute top-[32%] left-[12%] select-none z-0"
              style={{ animation: 'bill-float-1 12s ease-in-out infinite 0.5s' }}
            >
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/20 dark:border-secondary/20 bg-white/45 dark:bg-neutral-900/45 backdrop-blur-xs shadow-md shadow-primary/5">
                <Banknote className="w-6 h-6 text-primary dark:text-secondary" />
                <span className="text-[11px] font-bold font-mono text-primary/70 dark:text-secondary/70">₱1,000</span>
              </div>
            </div>

            {/* 3. Floating Coins Badge - Bottom Left */}
            <div
              className="absolute bottom-[22%] left-[6%] select-none z-0"
              style={{ animation: 'coin-float-1 10s ease-in-out infinite 1.2s' }}
            >
              <div className="w-11 h-11 rounded-full border border-tertiary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-md shadow-tertiary/10 text-tertiary">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            {/* 4. Floating Small Peso Sign - Center Left */}
            <div
              className="absolute top-[62%] left-[2%] select-none z-0"
              style={{ animation: 'peso-float-2 13s ease-in-out infinite 2s' }}
            >
              <div className="w-8 h-8 rounded-full border border-secondary/30 bg-secondary/10 flex items-center justify-center text-secondary font-headline font-bold text-base">
                ₱
              </div>
            </div>

            {/* 5. Floating Money Bill - Bottom Right */}
            <div
              className="absolute bottom-[20%] right-[10%] select-none z-0"
              style={{ animation: 'bill-float-2 11s ease-in-out infinite 1s' }}
            >
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs shadow-lg shadow-secondary/10">
                <Banknote className="w-6 h-6 text-secondary" />
                <span className="text-[11px] font-bold font-mono text-secondary">₱500</span>
              </div>
            </div>

            {/* 6. Floating Coin Icon - Top Right */}
            <div
              className="absolute top-[14%] right-[18%] select-none z-0"
              style={{ animation: 'coin-float-2 11s ease-in-out infinite 2.2s' }}
            >
              <div className="w-10 h-10 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/45 dark:bg-neutral-900/45 backdrop-blur-xs flex items-center justify-center shadow-md shadow-primary/10 text-primary dark:text-secondary">
                <Coins className="w-4 h-4" />
              </div>
            </div>

            {/* 7. Floating Peso Badge - Top Far Right */}
            <div
              className="absolute top-[22%] right-[6%] select-none z-0"
              style={{ animation: 'peso-float-1 14s ease-in-out infinite 1.8s' }}
            >
              <div className="w-11 h-11 rounded-full border border-primary/20 dark:border-secondary/20 bg-primary/5 dark:bg-secondary/5 flex items-center justify-center text-primary dark:text-secondary font-headline font-extrabold text-xl">
                ₱
              </div>
            </div>

            {/* 8. Floating Small Peso Sign - Bottom Center */}
            <div
              className="absolute bottom-[10%] left-[28%] select-none z-0"
              style={{ animation: 'peso-float-2 15s ease-in-out infinite 3s' }}
            >
              <div className="w-9 h-9 rounded-full border border-tertiary/20 bg-tertiary/5 flex items-center justify-center text-tertiary font-headline font-bold text-sm">
                ₱
              </div>
            </div>

            {/* Abstract financial flow rings & ledger lines */}
            <div
              className="absolute bottom-[16%] right-[24%] text-primary/20 dark:text-secondary/15"
              style={{ animation: 'particle-drift-1 18s ease-in-out infinite' }}
            >
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="1" />
                <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.5" />
              </svg>
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
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">

            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
              {/* Trust badge with staggered entrance */}
              <ScrollReveal variant="pop-up" delay={80} duration={500} triggerOnMount>
                <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 dark:bg-secondary/10 border border-primary/20 dark:border-secondary/20 text-primary dark:text-secondary text-[11px] sm:text-xs font-bold font-label tracking-wide shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-secondary animate-pulse" />
                  Designed for Cooperative Lending &amp; Member Transparency
                </div>
              </ScrollReveal>

              {/* Headline with typing animation */}
              <h1 className="font-headline text-4xl sm:text-6xl lg:text-7xl leading-[1.08] font-extrabold tracking-tight">
                <TypewriterText
                  triggerOnMount
                  delay={180}
                  speed={26}
                  segments={[
                    {
                      text: 'Empower Your',
                      className: 'text-on-surface dark:text-white',
                      lineBreakAfter: true,
                    },
                    {
                      text: 'Cooperative Journey',
                      className: 'text-3xl sm:text-5xl lg:text-6xl text-transparent bg-clip-text',
                      style: { backgroundImage: 'linear-gradient(135deg, #047857 0%, #34D399 60%, #059669 100%)' },
                    },
                  ]}
                />
              </h1>

              {/* Sub-copy with pop-up entrance */}
              <ScrollReveal variant="pop-up" delay={420} duration={550} triggerOnMount>
                <p className="text-on-surface/75 dark:text-neutral-300 font-body text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Apply for loans online, track real-time monthly amortization schedules, and monitor your share capital contributions in one secure portal.
                </p>
              </ScrollReveal>

              {/* Feature pills with staggered fade-up */}
              <ScrollReveal variant="fade-up" delay={540} duration={500} triggerOnMount>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
                  {[
                    { icon: <Calculator className="w-3.5 h-3.5" />, label: 'Auto-Calculated Amortization' },
                    { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Diminishing & Flat Interest' },
                    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Real-Time Ledger Records' },
                  ].map(f => (
                    <div
                      key={f.label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-800/80 border border-outline-variant/50 text-on-surface/80 dark:text-neutral-200 text-xs font-semibold shadow-xs"
                    >
                      <span className="text-primary dark:text-secondary">{f.icon}</span>
                      {f.label}
                    </div>
                  ))}
                </div>
              </ScrollReveal>

              {/* CTAs with fade-up entrance */}
              <ScrollReveal variant="fade-up" delay={680} duration={500} triggerOnMount>
                <div className="flex flex-col sm:flex-row justify-center lg:justify-start flex-wrap gap-3 sm:gap-4 pt-2">
                  <Link
                    href="/login"
                    className="group flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-bold shadow-xl shadow-primary/30 dark:shadow-secondary/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/35 transition-all duration-300 active:scale-95 text-center"
                  >
                    Apply for a Loan
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-white/80 dark:bg-neutral-800/60 backdrop-blur border border-outline-variant/60 dark:border-neutral-700 text-on-surface dark:text-white font-label text-sm font-bold hover:bg-white dark:hover:bg-neutral-700/80 hover:shadow-lg transition-all duration-300 active:scale-95 text-center"
                  >
                    View Live Demo
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Visual: UC Coop Digital Passbook with Zoom-in entrance */}
            <ScrollReveal
              variant="zoom-in"
              delay={260}
              duration={700}
              triggerOnMount
              className="lg:col-span-5 relative h-[380px] sm:h-[440px] md:h-[480px] flex items-center justify-center scale-95 sm:scale-100 max-w-full overflow-hidden sm:overflow-visible"
            >
              {/* Ambient Glow */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-primary/12 dark:bg-secondary/10 blur-[75px]" />
              </div>

              {/* Main Passbook Card */}
              <div className="animate-float z-20 relative w-full max-w-[340px] sm:max-w-[370px]">
                <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl shadow-primary/25 border border-white/15 relative overflow-hidden backdrop-blur-md">
                  {/* Subtle card gradient highlight */}
                  <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-bl from-secondary/20 via-primary/15 to-transparent rounded-full blur-2xl pointer-events-none" />

                  {/* Passbook Header */}
                  <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/25 border border-primary/40 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-secondary" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-secondary">Digital Passbook</div>
                        <div className="text-xs font-extrabold tracking-tight">UC METC COOPERATIVE</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/10 border border-white/10 text-neutral-300">
                      ID: #2026-9938
                    </span>
                  </div>

                  {/* Member Details */}
                  <div className="space-y-3.5 relative z-10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-400 font-medium">Member Account:</span>
                      <span className="font-bold text-white tracking-wide">John Doe (Regular)</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Share Capital:</span>
                        <span className="font-extrabold text-emerald-400 font-headline text-sm">₱25,000.00</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-400">Outstanding Loan:</span>
                        <span className="font-bold text-white font-headline">₱30,000.00</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1.5 border-t border-white/10">
                        <span className="text-neutral-300 font-semibold">Next Monthly Due:</span>
                        <span className="font-extrabold text-secondary font-headline text-sm">₱2,500.00</span>
                      </div>
                    </div>

                    {/* Status footer */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Account In Good Standing</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">Due: Aug 15</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Badge 1: Target Dividend Yield */}
              <div
                className="absolute top-2 right-0 sm:-right-4 animate-float z-30"
                style={{ animationDelay: '1s' }}
              >
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl shadow-black/10 border border-outline-variant/40 dark:border-neutral-700 px-3.5 py-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[9px] text-neutral-500 dark:text-neutral-400 font-semibold">Share Capital Yield</div>
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">5.0% Target Dividend</div>
                  </div>
                </div>
              </div>

              {/* Floating Badge 2: Verified Record */}
              <div
                className="absolute bottom-2 left-0 sm:-left-4 animate-float z-30"
                style={{ animationDelay: '2s' }}
              >
                <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl shadow-black/10 border border-outline-variant/40 dark:border-neutral-700 px-3.5 py-2.5 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary dark:text-secondary">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[9px] text-neutral-500 dark:text-neutral-400 font-semibold">Repayment Ledger</div>
                    <div className="text-xs font-extrabold text-on-surface dark:text-white">Admin-Verified Receipts</div>
                  </div>
                </div>
              </div>

            </ScrollReveal>
          </div>
        </section>

        {/* ── Cooperative Value Highlights ─────────────────────────── */}
        <section className="relative border-y border-outline-variant/40 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-10 sm:py-12">

            {/* 3-Pillar Value Cards with Staggered Scroll Reveals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">

              {/* Pillar 1 */}
              <ScrollReveal variant="fade-up" delay={0} duration={550}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface dark:text-white">
                      Digital Loan Journey
                    </h3>
                    <p className="font-body text-xs sm:text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                      Submit applications online and monitor approval stages from submission to cash release.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Pillar 2 */}
              <ScrollReveal variant="fade-up" delay={140} duration={550}>
                <div className="flex items-start gap-4 md:border-l md:border-outline-variant/40 dark:md:border-neutral-800 md:pl-8">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/15 dark:bg-secondary/20 border border-secondary/30 flex items-center justify-center text-primary dark:text-secondary flex-shrink-0">
                    <BadgePercent className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface dark:text-white">
                      Transparent Amortization
                    </h3>
                    <p className="font-body text-xs sm:text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                      Clear breakdown of principal, interest, and monthly amortization with zero hidden fees.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Pillar 3 */}
              <ScrollReveal variant="fade-up" delay={280} duration={550}>
                <div className="flex items-start gap-4 md:border-l md:border-outline-variant/40 dark:md:border-neutral-800 md:pl-8">
                  <div className="w-12 h-12 rounded-2xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary flex-shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline text-base sm:text-lg font-bold text-on-surface dark:text-white">
                      Secure Member Ledger
                    </h3>
                    <p className="font-body text-xs sm:text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                      Track share capital, fixed deposits, and admin-verified payment records with exportable receipts.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

            </div>

            {/* Cooperative Community Banner */}
            <ScrollReveal variant="fade" delay={380} duration={500}>
              <div className="mt-8 pt-6 border-t border-outline-variant/30 dark:border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Supporting Transparent Financial Management for Cooperative Communities
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 dark:bg-secondary/10 text-primary dark:text-secondary font-headline text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5" />
                  UC METC Multipurpose Cooperative
                </div>
              </div>
            </ScrollReveal>

          </div>
        </section>

        {/* ── The Cooperative Choice Section ───────────────────────── */}
        <section className="py-16 sm:py-24 md:py-28 bg-white dark:bg-neutral-950 relative overflow-hidden">
          {/* Subtle background tint */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
            {/* Section header with Pop-up & Typing Animation */}
            <div className="text-center mb-12 sm:mb-20 space-y-3 sm:space-y-4">
              <ScrollReveal variant="pop-up" delay={0} duration={450}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-bold font-label border border-primary/15 dark:border-secondary/15">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Modern Cooperative Services
                </div>
              </ScrollReveal>

              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold text-on-surface dark:text-white leading-tight">
                <TypewriterText
                  delay={100}
                  speed={24}
                  segments={[
                    {
                      text: 'The Strategic Choice for',
                      className: 'text-on-surface dark:text-white',
                      lineBreakAfter: true,
                    },
                    {
                      text: 'Modern Members',
                      className: 'text-transparent bg-clip-text',
                      style: { backgroundImage: 'linear-gradient(135deg, #047857 0%, #34D399 100%)' },
                    },
                  ]}
                />
              </h2>

              <ScrollReveal variant="fade-up" delay={320} duration={500}>
                <p className="font-body text-sm sm:text-base text-on-surface/65 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
                  Built on four essential pillars of cooperative financial management, ensuring accessible credit and transparent record-keeping for all.
                </p>
              </ScrollReveal>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-center">
              {/* Left pillars - Slide from Left */}
              <div className="space-y-8 sm:space-y-12 lg:space-y-14 lg:text-right">
                {[
                  {
                    icon: <Layers className="text-primary dark:text-secondary w-6 h-6" />,
                    title: 'Credit Assistance',
                    desc: 'Tailored loan options including Regular Cash, Short-Term (STL), and Appliance/Product loans.',
                  },
                  {
                    icon: <Calculator className="text-primary dark:text-secondary w-6 h-6" />,
                    title: 'Automated Computation',
                    desc: 'Instant computation of monthly schedules using verified flat or diminishing interest rates.',
                  },
                ].map((p, index) => (
                  <ScrollReveal
                    key={p.title}
                    variant="slide-left"
                    delay={140 + index * 130}
                    duration={600}
                  >
                    <div className="group space-y-2.5 flex flex-col items-center text-center sm:items-start sm:text-left lg:items-end lg:text-right">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/15 border border-primary/20 shadow-xs group-hover:scale-110 group-hover:shadow-md group-hover:shadow-primary/20 transition-all duration-300">
                        {p.icon}
                      </div>
                      <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">{p.title}</h3>
                      <p className="font-body text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed max-w-xs">{p.desc}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {/* Center phone mockup (UC Coop Passbook Mobile) - Zoom-in */}
              <ScrollReveal
                variant="zoom-in"
                delay={100}
                duration={650}
                className="relative flex justify-center scale-90 sm:scale-100"
              >
                {/* Glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-72 h-[500px] bg-primary/8 dark:bg-secondary/6 rounded-full blur-3xl" />
                </div>
                <div className="relative w-72 h-[510px] rounded-[2.8rem] border-[8px] border-neutral-800 dark:border-neutral-900 bg-neutral-950 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
                  {/* Notch */}
                  <div className="absolute top-0 w-full h-9 flex justify-center pt-2.5 z-10">
                    <div className="w-20 h-5 bg-neutral-900 rounded-full" />
                  </div>
                  {/* Screen content */}
                  <div className="p-5 pt-12 space-y-4 h-full bg-neutral-950 text-white">
                    {/* Top bar */}
                    <div className="flex justify-between items-center pt-1 text-[11px] font-bold text-neutral-400">
                      <span>UC COOP MOBILE</span>
                      <span className="text-emerald-400">ONLINE</span>
                    </div>

                    {/* Loan Overview Widget */}
                    <div className="rounded-2xl bg-gradient-to-tr from-primary to-emerald-600 p-4 space-y-2.5 shadow-lg border border-white/15 relative overflow-hidden">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/80 font-medium">Active Loan Balance</span>
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">REGULAR</span>
                      </div>
                      <div className="text-2xl font-extrabold font-headline tracking-tight">₱30,000.00</div>
                      <div className="flex justify-between items-center text-[11px] text-white/85 pt-1 border-t border-white/15">
                        <span>Next Due: Aug 15</span>
                        <span className="font-bold">₱2,500.00</span>
                      </div>
                    </div>

                    {/* Amortization Split Breakdown */}
                    <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                      <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Installment Breakdown</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Principal Allocation:</span>
                        <span className="font-bold text-white">₱2,100.00</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Interest (Diminishing):</span>
                        <span className="font-bold text-emerald-400">₱400.00</span>
                      </div>
                    </div>

                    {/* Share Capital Mini Widget */}
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="text-[10px] text-neutral-400">Share Capital</div>
                        <div className="font-bold text-white">₱25,000.00</div>
                      </div>
                      <div className="text-emerald-400 text-[10px] font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        +5.0% Yield
                      </div>
                    </div>

                    {/* Action button */}
                    <Link
                      href="/how-it-works"
                      className="h-10 w-full rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-neutral-950 text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
                    >
                      View Full Schedule
                    </Link>
                  </div>
                </div>
              </ScrollReveal>

              {/* Right pillars - Slide from Right */}
              <div className="space-y-8 sm:space-y-12 lg:space-y-14">
                {[
                  {
                    icon: <PiggyBank className="text-tertiary w-6 h-6" />,
                    color: 'tertiary',
                    title: 'Capital & Savings',
                    desc: 'Build long-term equity with share capital contributions and high-yield fixed deposits.',
                  },
                  {
                    icon: <Clock className="text-primary dark:text-secondary w-6 h-6" />,
                    color: 'primary',
                    title: 'Verified History',
                    desc: 'Access complete repayment ledgers and downloadable PDF transaction receipts.',
                  },
                ].map((p, index) => (
                  <ScrollReveal
                    key={p.title}
                    variant="slide-right"
                    delay={140 + index * 130}
                    duration={600}
                  >
                    <div className="group space-y-2.5 flex flex-col items-center text-center sm:items-start sm:text-left">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${p.color === 'tertiary' ? 'bg-tertiary/10 border-tertiary/20' : 'bg-primary/10 dark:bg-primary/15 border-primary/20'} border shadow-xs group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
                        {p.icon}
                      </div>
                      <h3 className="font-headline text-lg font-bold text-on-surface dark:text-white">{p.title}</h3>
                      <p className="font-body text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed max-w-xs">{p.desc}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Bento Grid ───────────────────────────────────────────── */}
        <section className="py-16 sm:py-24 md:py-28 bg-neutral-50 dark:bg-neutral-900/40 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
            {/* Section header */}
            <div className="text-center mb-10 sm:mb-14 space-y-3">
              <ScrollReveal variant="pop-up" delay={0} duration={450}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 dark:bg-secondary/10 text-primary dark:text-secondary text-xs font-bold font-label border border-secondary/20">
                  <Award className="w-3.5 h-3.5" />
                  Platform Capabilities
                </div>
              </ScrollReveal>
              <ScrollReveal variant="fade-up" delay={100} duration={500}>
                <h2 className="font-headline text-3xl sm:text-4xl font-extrabold text-on-surface dark:text-white">
                  Everything you need to grow
                </h2>
              </ScrollReveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Card 1: Share Capital & Dividends */}
              <div className="md:col-span-6 lg:col-span-4">
                <ScrollReveal variant="fade-up" delay={100} duration={550} className="h-full">
                  <div className="h-full group bg-white dark:bg-neutral-800/70 p-6 sm:p-8 rounded-3xl border border-outline-variant/50 dark:border-neutral-700/60 flex flex-col justify-between hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                    <div className="space-y-3 relative z-10">
                      <div className="w-11 h-11 rounded-2xl bg-primary/12 dark:bg-primary/20 flex items-center justify-center border border-primary/20">
                        <Award className="text-primary dark:text-secondary w-5 h-5" />
                      </div>
                      <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Share Capital &amp; Savings</h3>
                      <p className="font-body text-sm text-on-surface/65 dark:text-neutral-400 leading-relaxed">
                        Accumulate member equity contributions and monitor cooperative dividend yields with transparent balances.
                      </p>
                    </div>
                    <div className="mt-8 relative z-10">
                      <div className="h-28 w-full bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/15 dark:to-secondary/10 rounded-2xl flex items-center justify-center border border-primary/15">
                        <div className="text-center">
                          <div className="text-primary dark:text-secondary font-headline text-3xl font-extrabold">+5.0%</div>
                          <div className="text-primary/75 dark:text-secondary/75 text-xs font-bold mt-0.5">Target Annual Yield</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Card 2: Protected & Accountable */}
              <div className="md:col-span-6 lg:col-span-8">
                <ScrollReveal variant="fade-up" delay={200} duration={550} className="h-full">
                  <div className="h-full bg-neutral-950 text-white p-6 sm:p-8 rounded-3xl overflow-hidden relative group border border-neutral-800">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="z-10 relative lg:w-1/2 space-y-4">
                      <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15">
                        <Shield className="w-5 h-5 text-secondary" />
                      </div>
                      <h3 className="font-headline text-2xl font-bold">Protected &amp; Accountable</h3>
                      <p className="text-neutral-400 font-body text-sm leading-relaxed">
                        Multi-role administration (Admin, Manager, Member, Accountant) with granular audit logs tracking loan approvals, payment postings, and official records.
                      </p>
                      <Link
                        href="/terms"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 hover:bg-white hover:text-neutral-950 transition-all font-label text-xs font-bold group/btn"
                      >
                        View Security Policies
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>

                    {/* Mock dashboard panel */}
                    <div className="absolute right-[-8%] bottom-[-12%] w-[55%] h-[130%] rotate-[-8deg] transition-all group-hover:rotate-0 group-hover:right-[-4%] duration-700 hidden lg:block">
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
                            {[3, 5, 7, 9, 6, 8, 10].map((v, i) => (
                              <div key={i} className="flex-1 bg-gradient-to-t from-primary to-secondary rounded-xs opacity-80" style={{ height: `${v * 9}%` }} />
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
                </ScrollReveal>
              </div>

              {/* Card 3: Transparent Loan Amortization */}
              <div className="md:col-span-12 lg:col-span-7">
                <ScrollReveal variant="fade-up" delay={120} duration={550} className="h-full">
                  <div className="h-full bg-gradient-to-br from-primary to-emerald-600 text-white p-6 sm:p-8 rounded-3xl flex flex-col sm:flex-row items-center gap-6 border border-white/10 shadow-lg shadow-primary/25 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="w-full sm:w-1/2 space-y-3 relative z-10 text-center sm:text-left">
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 mx-auto sm:mx-0">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-headline text-xl font-bold">Transparent Loan Amortization</h3>
                      <p className="text-white/80 font-body text-sm leading-relaxed">
                        Clear visibility into remaining principal, interest splits, and scheduled installments with zero hidden deductions.
                      </p>
                    </div>
                    <div className="w-full sm:w-1/2 flex justify-center relative z-10">
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
                </ScrollReveal>
              </div>

              {/* Card 4: Fast Loan Cash Disbursement */}
              <div className="md:col-span-12 lg:col-span-5">
                <ScrollReveal variant="fade-up" delay={220} duration={550} className="h-full">
                  <div className="h-full group bg-white dark:bg-neutral-800/70 p-6 sm:p-8 rounded-3xl border border-outline-variant/50 dark:border-neutral-700/60 flex flex-col justify-center hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-11 h-11 rounded-2xl bg-primary/12 dark:bg-primary/20 flex items-center justify-center border border-primary/20 flex-shrink-0">
                          <Zap className="w-5 h-5 text-primary dark:text-secondary" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-headline text-xl font-bold text-on-surface dark:text-white">Fast Cash Disbursement</h3>
                          <p className="font-body text-sm text-on-surface/65 dark:text-neutral-400">
                            Smooth application reviews, remarks, and scheduled cash releases managed directly through the coop desk.
                          </p>
                        </div>
                      </div>
                      {/* Transaction notification */}
                      <div className="p-3.5 sm:p-4 bg-neutral-50 dark:bg-neutral-900/80 rounded-2xl flex items-center gap-3 border border-outline-variant/40 dark:border-neutral-700/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-primary/30 flex-shrink-0">
                          ₱
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-neutral-400 tracking-wide">Disbursement Queue</div>
                          <div className="text-xs sm:text-sm font-bold text-on-surface dark:text-white truncate">
                            Ready for Disbursement: ₱50,000.00
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">Approved</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── Member Workflow & Onboarding CTA ─────────────────────── */}
        <section className="py-16 sm:py-24 md:py-28 bg-white dark:bg-neutral-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
            <div className="relative bg-gradient-to-br from-primary via-emerald-600 to-secondary/90 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-12 md:p-16 lg:p-20 flex flex-col md:flex-row items-center gap-10 md:gap-16 overflow-hidden border border-white/10 shadow-2xl shadow-primary/20">
              {/* Decorative background rings */}
              <div className="absolute -right-24 -bottom-24 w-96 h-96 border-[3px] border-white/8 rounded-full pointer-events-none" />
              <div className="absolute -right-6 -bottom-6 w-48 h-48 border-[3px] border-white/12 rounded-full pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />

              <div className="w-full md:w-1/2 z-10 space-y-5 sm:space-y-6 text-center md:text-left">
                <ScrollReveal variant="pop-up" delay={0} duration={450}>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold font-label">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Digital Cooperative Access
                  </div>
                </ScrollReveal>
                <ScrollReveal variant="fade-up" delay={100} duration={500}>
                  <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                    A Simpler Way to Manage<br />Your Cooperative Loans
                  </h2>
                </ScrollReveal>
                <ScrollReveal variant="fade-up" delay={200} duration={500}>
                  <p className="text-white/80 font-body text-sm sm:text-base max-w-md mx-auto md:mx-0 leading-relaxed">
                    From initial online loan filing to automated payment recording and downloadable official receipts, manage your full financial relationship in one unified hub.
                  </p>
                </ScrollReveal>
                <ScrollReveal variant="fade-up" delay={300} duration={500}>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 sm:gap-4">
                    <Link
                      href="/login"
                      className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-label text-sm font-bold rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all"
                    >
                      Apply for a Loan
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/how-it-works"
                      className="px-6 py-3 bg-white/12 text-white font-label text-sm font-bold rounded-full border border-white/20 hover:bg-white/20 active:scale-95 transition-all backdrop-blur"
                    >
                      Explore How It Works
                    </Link>
                  </div>
                </ScrollReveal>
              </div>

              {/* 6-Step Workflow Stage Badges */}
              <div className="w-full md:w-1/2 flex justify-center z-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-4 w-full max-w-sm">
                  {[
                    { step: '01', title: 'Apply', subtitle: 'Online Loan Filing', icon: <FileText className="w-5 h-5 text-white" />, glass: true },
                    { step: '02', title: 'Review', subtitle: 'Credit Assessment', icon: <Calculator className="w-5 h-5 text-primary" />, glass: false },
                    { step: '03', title: 'Disburse', subtitle: 'Ledger Crediting', icon: <Zap className="w-5 h-5 text-white" />, glass: true },
                    { step: '04', title: 'Repay', subtitle: 'Scheduled Dues', icon: <Clock className="w-5 h-5 text-emerald-600" />, glass: false },
                    { step: '05', title: 'Receipt', subtitle: 'Verified Posting', icon: <Receipt className="w-5 h-5 text-white" />, glass: true },
                    { step: '06', title: 'Ledger', subtitle: 'Share Growth', icon: <TrendingUp className="w-5 h-5 text-primary" />, glass: false },
                  ].map((s, i) => (
                    <ScrollReveal
                      key={i}
                      variant="pop-up"
                      delay={100 + i * 75}
                      duration={450}
                    >
                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between h-28 shadow-lg transition-transform duration-200 hover:scale-105 cursor-default ${s.glass
                            ? 'bg-white/12 backdrop-blur border border-white/20 text-white'
                            : 'bg-white text-neutral-900 shadow-md'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          {s.icon}
                          <span className={`text-[10px] font-mono font-bold ${s.glass ? 'text-white/60' : 'text-neutral-400'}`}>
                            {s.step}
                          </span>
                        </div>
                        <div>
                          <div className={`text-xs font-extrabold ${s.glass ? 'text-white' : 'text-neutral-900'}`}>
                            {s.title}
                          </div>
                          <div className={`text-[10px] truncate ${s.glass ? 'text-white/70' : 'text-neutral-500'}`}>
                            {s.subtitle}
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
