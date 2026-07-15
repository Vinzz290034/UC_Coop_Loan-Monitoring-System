'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  User as UserIcon,
  Lock,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

// ─── Floating Peso / Currency Symbols ─────────────────────────────────────────
const FLOATERS = [
  { symbol: '₱', x: '8%', y: '15%', size: 'text-3xl', delay: '0s', dur: '14s', opacity: 0.07 },
  { symbol: '$', x: '85%', y: '10%', size: 'text-2xl', delay: '2s', dur: '18s', opacity: 0.06 },
  { symbol: '₱', x: '70%', y: '75%', size: 'text-4xl', delay: '4s', dur: '16s', opacity: 0.08 },
  { symbol: '%', x: '20%', y: '80%', size: 'text-xl', delay: '1s', dur: '20s', opacity: 0.05 },
  { symbol: '$', x: '50%', y: '5%', size: 'text-3xl', delay: '6s', dur: '15s', opacity: 0.06 },
  { symbol: '₱', x: '92%', y: '50%', size: 'text-2xl', delay: '3s', dur: '22s', opacity: 0.07 },
  { symbol: '$', x: '3%', y: '55%', size: 'text-xl', delay: '8s', dur: '17s', opacity: 0.05 },
  { symbol: '%', x: '60%', y: '90%', size: 'text-2xl', delay: '5s', dur: '13s', opacity: 0.06 },
];

function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      {/* Animated gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          left: '-15%',
          top: '-20%',
          background: 'radial-gradient(circle, rgba(4,120,87,0.12) 0%, rgba(52,211,153,0.06) 60%, transparent 80%)',
          animation: 'aurora-shift 18s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          right: '-10%',
          bottom: '-15%',
          background: 'radial-gradient(circle, rgba(164,80,73,0.10) 0%, rgba(52,211,153,0.05) 60%, transparent 80%)',
          animation: 'aurora-shift-alt 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          left: '40%',
          top: '35%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(4,120,87,0.07) 0%, transparent 70%)',
          animation: 'aurora-shift 26s ease-in-out infinite reverse',
        }}
      />

      {/* Floating currency symbols */}
      {FLOATERS.map((f, i) => (
        <span
          key={i}
          className={`absolute font-headline font-black select-none pointer-events-none text-primary dark:text-secondary ${f.size}`}
          style={{
            left: f.x,
            top: f.y,
            opacity: f.opacity,
            animation: `particle-drift-${(i % 3) + 1} ${f.dur} ease-in-out infinite`,
            animationDelay: f.delay,
          }}
        >
          {f.symbol}
        </span>
      ))}
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get('reset') === 'success';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-8 md:p-10 border border-outline-variant/70 shadow-2xl bg-white/95 dark:bg-neutral-900/95">
      <header className="mb-8">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-2">
          Cooperative Portal Login
        </h2>
        <p className="font-body text-sm font-semibold text-on-surface/75 dark:text-neutral-300">
          Please enter your credentials to access your account.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {resetSuccess && (
          <div className="p-4 bg-primary/10 border border-primary/20 text-primary dark:text-secondary rounded-2xl text-xs font-bold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary dark:text-secondary" />
            <span>Your password has been successfully reset. Please log in with your new credentials.</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs font-bold flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Username Field */}
        <div className="space-y-2">
          <label
            className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1"
            htmlFor="login-username"
          >
            Username
          </label>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
              <UserIcon className="w-5 h-5" />
            </span>
            <input
              type="text"
              id="login-username"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label
              className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200"
              htmlFor="login-password"
            >
              Password
            </label>
          </div>
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
              <Lock className="w-5 h-5" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              id="login-password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-12 pr-12 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/40 dark:text-neutral-500 hover:text-primary dark:hover:text-secondary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-end px-1 mt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-primary dark:text-secondary font-bold hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-base font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center cursor-pointer"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
              Verifying credentials…
            </>
          ) : (
            'Login'
          )}
        </button>

        {/* Switch to register */}
        <p className="text-center text-xs text-on-surface/50 dark:text-neutral-400 font-semibold">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-primary dark:text-secondary font-bold hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="text-on-surface dark:text-neutral-100 min-h-screen flex items-center justify-center font-sans transition-colors relative overflow-hidden px-4">
      <AuthBackground />

      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 rounded-full text-xs font-extrabold text-on-surface dark:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 hover:text-primary dark:hover:text-secondary transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <ThemeToggle />
      </header>

      <main className="w-full max-w-md z-10 space-y-6 pt-16">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/SynCo_logo.png" alt="SynCo Logo" className="w-20 h-10 object-contain mb-1" />
          <h1 className="font-brandname text-4xl font-bold text-primary dark:text-secondary tracking-tight">
            SynCo
          </h1>
          <p className="font-label text-xs font-extrabold text-on-surface/50 dark:text-neutral-400 uppercase tracking-widest">
            Flowing Connection. Efficient Finance
          </p>
        </div>

        <Suspense
          fallback={
            <div className="glass-card rounded-3xl p-8 border border-outline-variant shadow-xl flex flex-col items-center justify-center py-24 gap-3 bg-white dark:bg-neutral-900">
              <div className="w-8 h-8 rounded-full border-4 border-neutral-200 border-t-primary animate-spin" />
              <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 font-bold">
                Loading secure session keys…
              </p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <div className="text-center font-body text-xs text-on-surface/50 dark:text-neutral-400 leading-relaxed font-semibold">
          <p>Protected by LendFlow Automated Multi-Key Encryption protocol.</p>
          <p className="mt-1">For support, contact coop-security@lendflow.net</p>
        </div>
      </main>
    </div>
  );
}
