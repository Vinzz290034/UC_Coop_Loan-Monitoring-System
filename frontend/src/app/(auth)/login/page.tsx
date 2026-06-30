'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User as UserIcon, Lock, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = searchParams.get('signup') === 'true';

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(usernameOrEmail, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-8 md:p-10 border border-outline-variant/70 shadow-2xl bg-white/95 dark:bg-neutral-900/95">
      <header className="mb-8 relative">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-2">
          Secure Access
        </h2>
        <p className="font-body text-sm font-semibold text-on-surface/75 dark:text-neutral-300">
          {isSignUp
            ? 'Cooperative account creation is managed by administrators.'
            : 'Please provide your credentials to continue.'}
        </p>
      </header>

      {isSignUp ? (
        <div className="space-y-6">
          <div className="p-5 bg-primary/10 border border-primary/20 text-primary dark:text-secondary rounded-2xl text-sm flex gap-3">
            <Sparkles className="w-6 h-6 flex-shrink-0" />
            <div>
              <h4 className="font-headline font-bold mb-1">Administrative Action Needed</h4>
              <p className="text-xs font-semibold text-on-surface/75 dark:text-neutral-300 leading-relaxed">
                Cooperative accounts must be configured internally by a system administrator or manager to enforce regulatory compliance boundaries.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.replace('/login')}
            className="w-full py-3.5 rounded-full bg-primary text-white font-label text-sm font-bold active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-pulse">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-2">
            <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="username">
              Username or Corporate Email
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors">
                <UserIcon className="w-5 h-5" />
              </span>
              <input
                type="text"
                id="username"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="Enter your username or email"
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200" htmlFor="password">
                Secret Key Password
              </label>
              <a href="#" className="text-xs text-primary dark:text-secondary font-bold hover:underline">
                Forgot key?
              </a>
            </div>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center cursor-pointer"
          >
            {submitting ? 'Verifying credentials...' : 'Authenticate Secure Session'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-background dark:bg-background text-on-surface dark:text-neutral-100 min-h-screen flex items-center justify-center font-sans transition-colors relative overflow-hidden px-4">
      {/* Background Animated Shards */}
      <div className="fixed inset-0 bg-neutral-50 dark:bg-neutral-950 overflow-hidden -z-10">
        <div className="absolute w-[400px] h-[300px] -left-20 -top-20 bg-gradient-to-tr from-secondary/5 to-primary/10 dark:from-secondary/2 dark:to-primary/5 blur-[50px] rotate-12"></div>
        <div className="absolute w-[500px] h-[400px] -right-40 bottom-0 bg-gradient-to-tr from-tertiary/5 to-secondary/5 dark:from-tertiary/2 dark:to-secondary/2 blur-[80px] -rotate-12"></div>
      </div>

      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        {/* Prominent Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 rounded-full text-xs font-extrabold text-on-surface dark:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 hover:text-primary dark:hover:text-secondary transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home Page
        </Link>
        <ThemeToggle />
      </header>

      <main className="w-full max-w-md z-10 space-y-6 pt-16">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="font-headline text-4xl font-extrabold text-primary dark:text-secondary tracking-tight">
            LendFlow Pro
          </h1>
          <p className="font-label text-xs font-extrabold text-on-surface/50 dark:text-neutral-400 uppercase tracking-widest">
            Institutional Finance Management
          </p>
        </div>

        {/* Suspense Wrapper to prevent static bails on searchParams usage */}
        <Suspense fallback={
          <div className="glass-card rounded-3xl p-8 border border-outline-variant shadow-xl flex flex-col items-center justify-center py-24 gap-3 bg-white dark:bg-neutral-900">
            <div className="w-8 h-8 rounded-full border-4 border-neutral-200 border-t-primary animate-spin"></div>
            <p className="font-body text-xs text-neutral-600 dark:text-neutral-400 font-bold">Loading secure session keys...</p>
          </div>
        }>
          <LoginForm />
        </Suspense>

        {/* Helper Instructions */}
        <div className="text-center font-body text-xs text-on-surface/50 dark:text-neutral-400 leading-relaxed font-semibold">
          <p>Protected by LendFlow Automated Multi-Key Encryption protocol.</p>
          <p className="mt-1">For support, contact coop-security@lendflow.net</p>
        </div>
      </main>
    </div>
  );
}
