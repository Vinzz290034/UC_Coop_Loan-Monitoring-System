'use client';

import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface CountdownTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
  label?: string;
}

export default function CountdownTimer({
  initialSeconds,
  onComplete,
  label = "Session Timeout:",
}: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

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
        {formatTime(seconds)}
      </span>
    </div>
  );
}
