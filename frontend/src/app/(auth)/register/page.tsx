'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

// ─── Shared animated background (same as login page) ─────────────────────────
const FLOATERS = [
  { symbol: '₱', x: '8%',  y: '15%', size: 'text-3xl', delay: '0s',   dur: '14s', opacity: 0.07 },
  { symbol: '$', x: '85%', y: '10%', size: 'text-2xl', delay: '2s',   dur: '18s', opacity: 0.06 },
  { symbol: '₱', x: '70%', y: '75%', size: 'text-4xl', delay: '4s',   dur: '16s', opacity: 0.08 },
  { symbol: '%', x: '20%', y: '80%', size: 'text-xl',  delay: '1s',   dur: '20s', opacity: 0.05 },
  { symbol: '$', x: '50%', y: '5%',  size: 'text-3xl', delay: '6s',   dur: '15s', opacity: 0.06 },
  { symbol: '₱', x: '92%', y: '50%', size: 'text-2xl', delay: '3s',   dur: '22s', opacity: 0.07 },
  { symbol: '$', x: '3%',  y: '55%', size: 'text-xl',  delay: '8s',   dur: '17s', opacity: 0.05 },
  { symbol: '%', x: '60%', y: '90%', size: 'text-2xl', delay: '5s',   dur: '13s', opacity: 0.06 },
];

function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-neutral-50 dark:bg-neutral-950">
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

// ─── Password strength indicator ─────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Contains a number', pass: /\d/.test(password) },
    { label: 'Contains a letter', pass: /[a-zA-Z]/.test(password) },
  ];

  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-tertiary', 'bg-orange-400', 'bg-yellow-400', 'bg-secondary'];
  const labels = ['Weak', 'Weak', 'Fair', 'Strong'];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : 'bg-neutral-200 dark:bg-neutral-700'}`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-bold ${score === 3 ? 'text-secondary' : score === 2 ? 'text-yellow-500' : 'text-tertiary'}`}>
        {labels[score]}
      </p>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      await register(username, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-on-surface dark:text-neutral-100 min-h-screen flex items-center justify-center font-sans transition-colors relative overflow-hidden px-4">
      <AuthBackground />

      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-neutral-300 dark:border-neutral-700 rounded-full text-xs font-extrabold text-on-surface dark:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 hover:text-primary dark:hover:text-secondary transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
        <ThemeToggle />
      </header>

      <main className="w-full max-w-md z-10 space-y-6 pt-16 py-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="font-headline text-4xl font-extrabold text-primary dark:text-secondary tracking-tight">
            LendFlow Pro
          </h1>
          <p className="font-label text-xs font-extrabold text-on-surface/50 dark:text-neutral-400 uppercase tracking-widest">
            Create a Cooperative Account
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 md:p-10 border border-outline-variant/70 shadow-2xl bg-white/95 dark:bg-neutral-900/95">

          {success ? (
            /* ── Success State ── */
            <div className="space-y-6 text-center py-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-secondary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-primary dark:text-secondary" />
                </div>
              </div>
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white mb-2">
                  Account Created!
                </h2>
                <p className="font-body text-sm text-on-surface/70 dark:text-neutral-300">
                  Your cooperative account for <span className="font-bold text-primary dark:text-secondary">@{username}</span> has been registered as a member.
                </p>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-extrabold rounded-full shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
              >
                Proceed to Login
              </button>
            </div>
          ) : (
            /* ── Registration Form ── */
            <>
              <header className="mb-8">
                <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-2">
                  Create Account
                </h2>
                <p className="font-body text-sm font-semibold text-on-surface/75 dark:text-neutral-300">
                  Register as a cooperative member to access the system.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs font-bold flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Username */}
                <div className="space-y-2">
                  <label
                    className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1"
                    htmlFor="reg-username"
                  >
                    Username
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
                      <UserIcon className="w-5 h-5" />
                    </span>
                    <input
                      type="text"
                      id="reg-username"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="Choose a unique username"
                      className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 px-1">
                    Minimum 3 characters. Letters, numbers, and underscores only.
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label
                    className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1"
                    htmlFor="reg-password"
                  >
                    Password
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="reg-password"
                      required
                      autoComplete="new-password"
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
                  <PasswordStrength password={password} />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label
                    className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1"
                    htmlFor="reg-confirm"
                  >
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      id="reg-confirm"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className={`w-full pl-12 pr-12 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 rounded-xl focus:ring-2 outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500 ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-tertiary focus:border-tertiary focus:ring-tertiary/20'
                          : confirmPassword && password === confirmPassword
                          ? 'border-secondary focus:border-secondary focus:ring-secondary/20'
                          : 'border-neutral-300 dark:border-neutral-700 focus:border-primary dark:focus:border-secondary focus:ring-primary/20 dark:focus:ring-secondary/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/40 dark:text-neutral-500 hover:text-primary dark:hover:text-secondary transition-colors"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-tertiary font-bold px-1">Passwords do not match.</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-[10px] text-secondary font-bold px-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match.
                    </p>
                  )}
                </div>

                {/* Role notice */}
                <div className="p-3 bg-primary/8 dark:bg-secondary/8 border border-primary/15 dark:border-secondary/15 rounded-xl text-[11px] text-primary dark:text-secondary font-semibold flex items-start gap-2">
                  <UserPlus className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    New accounts are registered with <strong>Member</strong> access level. Contact an administrator to upgrade your role.
                  </span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                      Creating account…
                    </>
                  ) : (
                    'Create Cooperative Account'
                  )}
                </button>

                <p className="text-center text-xs text-on-surface/50 dark:text-neutral-400 font-semibold">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-primary dark:text-secondary font-bold hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>

        <div className="text-center font-body text-xs text-on-surface/50 dark:text-neutral-400 leading-relaxed font-semibold">
          <p>Protected by LendFlow Automated Multi-Key Encryption protocol.</p>
        </div>
      </main>
    </div>
  );
}
