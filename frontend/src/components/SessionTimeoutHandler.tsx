'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { Clock, AlertTriangle, LogOut, RotateCw } from 'lucide-react';

const DEFAULT_TIMEOUT_MINUTES = 30;
const WARNING_SECONDS = 60; // Show warning 60 seconds before timeout

export default function SessionTimeoutHandler() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_SECONDS);

  const lastActivityRef = useRef<number>(Date.now());
  const throttleRef = useRef<number>(0);

  // Per-user localStorage key — each user has their own timeout preference
  const timeoutKey = user?.id
    ? `session_timeout_minutes_${user.id}`
    : 'session_timeout_minutes';

  // Read configured timeout duration from localStorage (default: 30 minutes, 0 = disabled)
  const getTimeoutDurationMs = useCallback((): number => {
    if (typeof window === 'undefined') return DEFAULT_TIMEOUT_MINUTES * 60 * 1000;
    const stored = localStorage.getItem(timeoutKey);
    if (stored === '0' || stored === 'disabled' || stored === 'never') return 0;
    const mins = stored ? parseInt(stored, 10) : DEFAULT_TIMEOUT_MINUTES;
    if (mins === 0) return 0;
    return (isNaN(mins) || mins < 1 ? DEFAULT_TIMEOUT_MINUTES : mins) * 60 * 1000;
  }, [timeoutKey]);

  // Update activity timestamp in memory and localStorage (throttled to once every 5 seconds)
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    if (now - throttleRef.current > 5000) {
      throttleRef.current = now;
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_last_activity', now.toString());
      }
    }
  }, []);

  // Reset activity explicitly (e.g. user clicks "Stay Logged In")
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    throttleRef.current = now;
    if (typeof window !== 'undefined') {
      localStorage.setItem('session_last_activity', now.toString());
    }
    setShowWarning(false);
    setSecondsRemaining(WARNING_SECONDS);
  }, []);

  // Force logout on timeout
  const handleTimeoutLogout = useCallback(() => {
    setShowWarning(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('session_last_activity');
    }
    logout();
    router.push('/login?reason=timeout');
  }, [logout, router]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize activity tracker when user is authenticated
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    // Set initial activity
    const now = Date.now();
    lastActivityRef.current = now;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('session_last_activity');
      if (!stored) {
        localStorage.setItem('session_last_activity', now.toString());
      } else {
        lastActivityRef.current = parseInt(stored, 10) || now;
      }
    }

    // Event listeners to detect user interaction (using capture: true to catch inner container scroll/inputs)
    const activityEvents = [
      'mousemove',
      'mousedown',
      'mouseup',
      'keydown',
      'keyup',
      'touchstart',
      'touchend',
      'scroll',
      'wheel',
      'click',
      'input',
      'change',
      'focus'
    ];
    const handleUserActivity = () => {
      // Don't auto-reset activity while warning modal is active so user is forced to click or acknowledge
      if (!showWarning) {
        recordActivity();
      }
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { capture: true, passive: true });
    });

    const handleCustomActivity = () => {
      if (!showWarning) {
        recordActivity();
      }
    };
    window.addEventListener('session-activity', handleCustomActivity);

    // Sync activity across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session_last_activity' && e.newValue) {
        const parsed = parseInt(e.newValue, 10);
        if (!isNaN(parsed)) {
          lastActivityRef.current = parsed;
          const remaining = getTimeoutDurationMs() - (Date.now() - parsed);
          if (remaining > WARNING_SECONDS * 1000) {
            setShowWarning(false);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Custom event to trigger testing timeout from settings page
    const handleTestEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      const testSeconds = (customEvt.detail && customEvt.detail.seconds) || 30;
      const timeoutMs = getTimeoutDurationMs() || (DEFAULT_TIMEOUT_MINUTES * 60 * 1000);
      const fakeActivity = Date.now() - (timeoutMs - testSeconds * 1000);
      lastActivityRef.current = fakeActivity;
      if (typeof window !== 'undefined') {
        localStorage.setItem('session_last_activity', fakeActivity.toString());
      }
      setShowWarning(true);
      setSecondsRemaining(testSeconds);
    };
    window.addEventListener('test-session-timeout', handleTestEvent);

    // Check timer every second
    const interval = setInterval(() => {
      const currentNow = Date.now();
      const timeoutMs = getTimeoutDurationMs();

      // If timeout is disabled (0), do not trigger warnings or auto-logout
      if (timeoutMs <= 0) {
        if (showWarning) setShowWarning(false);
        return;
      }

      // Check if user is actively in a critical editing modal (e.g. Check Voucher, Loan Application)
      const isActivelyEditing =
        typeof document !== 'undefined' &&
        document.querySelector('[data-editing-session="true"]');

      if (isActivelyEditing) {
        // Automatically extend activity timestamp so editing forms are never interrupted or lost
        lastActivityRef.current = currentNow;
        if (typeof window !== 'undefined') {
          localStorage.setItem('session_last_activity', currentNow.toString());
        }
        if (showWarning) setShowWarning(false);
        return;
      }

      // Read latest cross-tab activity if available
      let lastAct = lastActivityRef.current;
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('session_last_activity');
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed > lastAct) {
            lastAct = parsed;
            lastActivityRef.current = parsed;
          }
        }
      }

      const elapsed = currentNow - lastAct;
      const remainingMs = timeoutMs - elapsed;

      if (remainingMs <= 0) {
        clearInterval(interval);
        handleTimeoutLogout();
      } else if (remainingMs <= WARNING_SECONDS * 1000) {
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity, { capture: true } as any);
      });
      window.removeEventListener('session-activity', handleCustomActivity);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('test-session-timeout', handleTestEvent);
      clearInterval(interval);
    };
  }, [user, showWarning, recordActivity, getTimeoutDurationMs, handleTimeoutLogout]);

  if (!mounted || !user || !showWarning) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden text-center space-y-5 animate-scaleUp">
        {/* Background glow badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Session Expiring
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-headline text-on-surface dark:text-white">
            Are you still there?
          </h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
            You have been inactive. For your security, your session will automatically expire in:
          </p>
        </div>

        {/* Countdown display */}
        <div className="py-3 px-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 inline-block mx-auto">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-mono text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {secondsRemaining}
            </span>
            <span className="text-xs font-bold text-amber-700/80 dark:text-amber-400/80 uppercase">
              {secondsRemaining === 1 ? 'second' : 'seconds'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={extendSession}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Stay Logged In</span>
          </button>
          <button
            type="button"
            onClick={handleTimeoutLogout}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out Now</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
