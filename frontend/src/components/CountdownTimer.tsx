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
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold ${
        isLow
          ? 'bg-tertiary/10 border-tertiary text-tertiary animate-pulse'
          : 'bg-primary/10 border-primary text-primary'
      }`}
    >
      <Timer className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="font-mono text-sm tracking-wider font-bold">
        {formatTime(seconds)} minutes
      </span>
    </div>
  );
}
