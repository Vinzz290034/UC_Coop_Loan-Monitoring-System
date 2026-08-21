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
  Mail,
  ShieldCheck,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import BackButton from '@/components/BackButton';
import Link from 'next/link';

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
    </div>
  );
}

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

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: 'Find Account', num: 1 },
    { label: 'Verify OTP', num: 2 },
    { label: 'New Password', num: 3 },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep >= step.num
                ? 'bg-primary dark:bg-secondary text-white dark:text-neutral-950 shadow-md'
                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                }`}
            >
              {currentStep > step.num ? <CheckCircle2 className="w-4 h-4" /> : step.num}
            </div>
            <span
              className={`text-[10px] font-bold hidden sm:inline ${currentStep >= step.num
                ? 'text-primary dark:text-secondary'
                : 'text-neutral-400 dark:text-neutral-500'
                }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 rounded transition-all duration-300 ${currentStep > step.num
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

export default function ForgotPasswordPage() {
  const { forgotPassword, verifyOtp, resendOtp, resetPassword } = useAuth();
  const router = useRouter();

  // Multi-step state
  const [step, setStep] = useState(1);

  // Form Fields
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security Verification Keys
  const [resetToken, setResetToken] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpTimer, setOtpTimer] = useState(600);

  // Visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  // Step 1: Submit Email
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    // Basic email regex format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await forgotPassword(email);
      setEmail(result.email);
      setDevOtp(result._dev_otp || null);
      setResendCooldown(60);
      setOtpTimer(600);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await verifyOtp(email, otpValue, 'password_reset');
      setResetToken(result.token);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
      setOtpValue('');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await resendOtp(email, 'password_reset');
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

  // Step 3: Reset Password
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Password must contain at least one letter and at least one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(resetToken, newPassword);
      router.push('/login?reset=success');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-on-surface dark:text-neutral-100 min-h-screen flex items-center justify-center font-sans transition-colors relative overflow-hidden px-4">
      <AuthBackground />

      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <BackButton href="/login">Back to Login</BackButton>
        <ThemeToggle />
      </header>

      <main className="w-full max-w-md z-10 space-y-6 pt-16">
        <div className="text-center space-y-2 flex flex-col items-center">
          <img src="/Coop Sync_logo.png" alt="Coop Sync Logo" className="w-20 h-10 object-contain mb-1" />
          <h1 className="font-brandname text-4xl font-bold text-primary dark:text-secondary tracking-tight">
            Coop Sync
          </h1>
          <p className="font-label text-xs font-extrabold text-on-surface/50 dark:text-neutral-400 uppercase tracking-widest">
            Reset Portal Password
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8 md:p-10 border border-outline-variant/70 shadow-2xl bg-white/95 dark:bg-neutral-900/95 min-h-[500px] flex flex-col justify-between">
          <div>
            <StepIndicator currentStep={step} />

            {/* ═══════════════════ STEP 1: Email Check ═══════════════════ */}
            {step === 1 && (
              <>
                <header className="mb-6">
                  <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-2">
                    Forgot Password?
                  </h2>
                  <p className="font-body text-sm font-semibold text-on-surface/75 dark:text-neutral-300">
                    Enter your email address below. We will send a verification code to your registered email.
                  </p>
                </header>

                <div className="space-y-2 mt-4">
                  <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="reset-email">
                    Email Address
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      type="email"
                      id="reset-email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleStep1Submit(e);
                      }}
                      placeholder="Enter your registered email"
                      className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ═══════════════════ STEP 2: OTP Verification ═══════════════════ */}
            {step === 2 && (
              <>
                <header className="mb-6">
                  <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-2">
                    Verify Reset OTP
                  </h2>
                  <p className="font-body text-sm font-semibold text-on-surface/75 dark:text-neutral-300">
                    We dispatched a code to: <strong className="text-primary dark:text-secondary break-all">{email}</strong>.
                  </p>
                </header>

                {devOtp && (
                  <div className="p-3 bg-primary/10 border border-primary/20 text-primary dark:text-secondary rounded-xl text-xs font-bold flex items-start gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-extrabold">DEV MODE — OTP Code</p>
                      <p className="font-mono mt-0.5 text-xs bg-white/40 dark:bg-black/35 px-1.5 py-0.5 rounded w-fit">
                        {devOtp}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-2">
                  <label className="font-label text-xs uppercase tracking-wider font-extrabold text-neutral-600 dark:text-neutral-400 block text-center">
                    Enter Verification Code
                  </label>
                  <OtpInput value={otpValue} onChange={setOtpValue} />
                </div>
              </>
            )}

            {/* ═══════════════════ STEP 3: Create New Password ═══════════════════ */}
            {step === 3 && (
              <>
                <header className="mb-6">
                  <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white mb-2">
                    New Password
                  </h2>
                  <p className="font-body text-sm font-semibold text-on-surface/75 dark:text-neutral-300">
                    Please create a new secure password for your account.
                  </p>
                </header>

                <div className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="new-password">
                      New Password
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="new-password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-12 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/40 dark:text-neutral-500 hover:text-primary dark:hover:text-secondary transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <PasswordStrength password={newPassword} />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-wider font-extrabold text-on-surface dark:text-neutral-200 px-1" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface/50 dark:text-neutral-400 group-focus-within:text-primary dark:group-focus-within:text-secondary transition-colors pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </span>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        id="confirm-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-12 pr-12 py-3.5 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-secondary/20 focus:border-primary dark:focus:border-secondary outline-none transition-all font-body text-sm font-semibold text-on-surface dark:text-white placeholder:text-on-surface/40 dark:placeholder:text-neutral-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/40 dark:text-neutral-500 hover:text-primary dark:hover:text-secondary transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ═══════════════════ BOTTOM ACTION SECTION ═══════════════════ */}
          <div className="mt-8">
            {error && (
              <div className="p-4 mb-4 bg-tertiary/10 border border-tertiary/20 text-tertiary rounded-2xl text-xs font-bold flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-base font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                      Resolving Account…
                    </>
                  ) : (
                    <>
                      Find Account <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-on-surface/50 dark:text-neutral-400 font-semibold">
                  Remember your password?{' '}
                  <Link href="/login" className="text-primary dark:text-secondary font-bold hover:underline">
                    Log in
                  </Link>
                </p>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <button
                  type="submit"
                  disabled={submitting || otpTimer <= 0}
                  className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-base font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify OTP <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="flex justify-between items-center text-xs px-1">
                  <span className="text-neutral-400 dark:text-neutral-500 font-bold">
                    Code expires in: <span className="font-mono">{formatTimer(otpTimer)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || submitting}
                    className="text-primary dark:text-secondary font-bold hover:underline disabled:text-neutral-400 dark:disabled:text-neutral-600 disabled:no-underline transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleStep3Submit} className="space-y-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-primary dark:bg-secondary text-white dark:text-neutral-950 font-label text-base font-extrabold rounded-full shadow-lg hover:shadow-primary/25 dark:hover:shadow-secondary/25 hover:scale-[1.01] active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                      Saving Password…
                    </>
                  ) : (
                    <>
                      Update Password <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-on-surface/50 dark:text-neutral-400 font-semibold">
                  Back to{' '}
                  <Link href="/login" className="text-primary dark:text-secondary font-bold hover:underline">
                    Log in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>

        <div className="text-center font-body text-xs text-on-surface/50 dark:text-neutral-400 leading-relaxed font-semibold">
          <p>Protected by LendFlow Automated Multi-Key Encryption protocol.</p>
          <p className="mt-1">For support, contact coop-security@lendflow.net</p>
        </div>
      </main>
    </div>
  );
}
