'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Mail,
  ShieldCheck,
  ArrowRight,
  RotateCw,
  Info,
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

// ─── Step Progress Indicator ──────────────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: 'Account Info', num: 1 },
    { label: 'Verify Email', num: 2 },
    { label: 'Complete', num: 3 },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                currentStep >= step.num
                  ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {currentStep > step.num ? <CheckCircle2 className="w-4 h-4" /> : step.num}
            </div>
            <span
              className={`text-[10px] font-bold hidden sm:inline ${
                currentStep >= step.num
                  ? 'text-primary dark:text-secondary'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 rounded transition-all duration-300 ${
                currentStep > step.num
                  ? 'bg-primary dark:bg-secondary'
                  : 'bg-neutral-200 dark:bg-neutral-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── OTP Input Component ──────────────────────────────────────────────────────
function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (val: string) => void;
  length?: number;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (char && !/^\d$/.test(char)) return; // Only digits
    const newVal = value.split('');
    newVal[index] = char;
    const result = newVal.join('').slice(0, length);
    onChange(result);
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const nextIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/30 dark:focus:ring-secondary/30 focus:border-primary dark:focus:border-secondary outline-none transition-all text-on-surface dark:text-white"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { memberRegister, verifyOtp, resendOtp } = useAuth();
  const router = useRouter();

  // Multi-step state
  const [step, setStep] = useState(1);

  // Step 1 — form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 — OTP
  const [otpValue, setOtpValue] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTimer, setOtpTimer] = useState(600); // 10 min in seconds

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // OTP expiry timer
  useEffect(() => {
    if (step !== 2 || otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((v) => v - 1), 1000);
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── Step 1: Submit registration form ───────────────────────────────────────
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
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
      const result = await memberRegister({
        first_name: firstName,
        last_name: lastName,
        username,
        password,
        email,
      });
      setPendingEmail(result.email);
      setDevOtp(result._dev_otp || null);
      setResendCooldown(60);
      setOtpTimer(600);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      await verifyOtp(pendingEmail, otpValue);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setOtpValue('');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await resendOtp(pendingEmail);
      setDevOtp(result._dev_otp || null);
      setResendCooldown(60);
      setOtpTimer(600);
      setOtpValue('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
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
          <StepIndicator currentStep={step} />

          {/* ═══════════════════ STEP 1: Registration Form ═══════════════════ */}
          {step === 1 && (
            <>
              <header className="mb-6">
                <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-2">
                  Create Account
                </h2>
                <p className="font-body text-sm font-semibold text-on-surface/75 dark:text-neutral-300">
                  Register as a cooperative member to access the system.
                </p>
              </header>

              <form onSubmit={handleStep1Submit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs font-bold flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name Fields — side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="reg-firstname">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="reg-firstname"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Juan"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="reg-lastname">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="reg-lastname"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dela Cruz"
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="reg-email">
                    Email Address
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      type="email"
                      id="reg-email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="member@email.com"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 px-1">
                    A verification code will be sent to this email.
                  </p>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="reg-username">
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
                      className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 px-1">
                    Minimum 3 characters. Letters, numbers, and underscores only.
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="reg-password">
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
                      className="w-full pl-12 pr-12 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
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
                <div className="space-y-1.5">
                  <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="reg-confirm">
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
                      className={`w-full pl-12 pr-12 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-2 rounded-xl focus:ring-2 outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500 ${
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
                  className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Sending verification code…
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
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

          {/* ═══════════════════ STEP 2: OTP Verification ═══════════════════ */}
          {step === 2 && (
            <>
              <div className="text-center space-y-3 mb-6">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-secondary/10 flex items-center justify-center">
                    <ShieldCheck className="w-9 h-9 text-primary dark:text-secondary" />
                  </div>
                </div>
                <div>
                  <h2 className="font-headline text-2xl font-extrabold text-on-surface dark:text-white mb-1">
                    Verify Your Email
                  </h2>
                  <p className="font-body text-sm text-on-surface/70 dark:text-neutral-300">
                    We sent a 6-digit code to{' '}
                    <span className="font-bold text-primary dark:text-secondary">{pendingEmail}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {error && (
                  <div className="p-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs font-bold flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Dev mode OTP display */}
                {devOtp && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-bold flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Dev Mode:</strong> Your OTP is <span className="font-mono text-sm bg-blue-100 dark:bg-blue-800/50 px-1.5 py-0.5 rounded">{devOtp}</span>
                    </span>
                  </div>
                )}

                {/* OTP Input */}
                <OtpInput value={otpValue} onChange={setOtpValue} />

                {/* Timer + Resend */}
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${otpTimer <= 60 ? 'text-tertiary' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    Code expires in {formatTimer(otpTimer)}
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || submitting}
                    className="flex items-center gap-1 text-primary dark:text-secondary font-bold hover:underline disabled:text-neutral-400 dark:disabled:text-neutral-500 disabled:no-underline disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={submitting || otpValue.length !== 6}
                  className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verify & Create Account
                    </>
                  )}
                </button>

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); setOtpValue(''); }}
                  className="w-full text-center text-xs text-on-surface/50 dark:text-neutral-400 font-semibold hover:text-primary dark:hover:text-secondary transition-colors"
                >
                  ← Back to registration form
                </button>
              </form>
            </>
          )}

          {/* ═══════════════════ STEP 3: Success ═══════════════════ */}
          {step === 3 && (
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
                  Your cooperative account for <span className="font-bold text-primary dark:text-secondary">@{username}</span> has been verified and registered as a member.
                </p>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-sm font-extrabold rounded-full shadow-lg hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
              >
                Proceed to Login
              </button>
            </div>
          )}
        </div>

        <div className="text-center font-body text-xs text-on-surface/50 dark:text-neutral-400 leading-relaxed font-semibold">
          <p>Protected by LendFlow Automated Multi-Key Encryption protocol.</p>
        </div>
      </main>
    </div>
  );
}
