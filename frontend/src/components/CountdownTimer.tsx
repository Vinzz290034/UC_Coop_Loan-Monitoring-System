'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  label?: string;
}

export default function CountdownTimer({
  initialSeconds,
  onComplete,
  label = "Auto-logout in:",
}: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  // Store the latest onComplete callback in a ref so the interval effect
  // doesn't need to depend on it — prevents restarting the interval every
  // time the parent re-renders and produces a new function reference.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Sync state if initialSeconds changes (e.g. from parent re-renders)
  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  // Handle user activity to reset the inactivity timer back to initialSeconds
  useEffect(() => {
    const handleActivity = () => {
      setSeconds((prev) => {
        if (prev !== initialSeconds) {
          return initialSeconds;
        }
        return prev;
      });
    };

    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onCompleteRef.current?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]); // onComplete intentionally omitted — accessed via ref

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLow = seconds < 60; // Less than 1 minute remaining

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all text-sm font-semibold ${
        isLow
          ? 'bg-tertiary/10 border-tertiary text-tertiary animate-pulse'
          : 'bg-primary/10 border-primary text-primary'
      }`}
    >
      <Timer className="w-4 h-4" />
      <span>{label}</span>
      <span className="font-mono text-sm tracking-wider font-bold">
        {formatTime(seconds)} minutes
      </span>
    </div>
  );
}
