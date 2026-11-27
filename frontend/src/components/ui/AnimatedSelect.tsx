'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface AnimatedSelectOption {
  value: string;
  label: string;
}

export default function AnimatedSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className = '',
  menuClassName = '',
  openUpwards = false,
}: {
  value: string;
  options: AnimatedSelectOption[];
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  openUpwards?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const activeLabel = options.find((o) => o.value === value)?.label || placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3 py-1.5 text-xs border border-outline-variant/60 rounded-xl bg-white dark:bg-surface-container-high text-on-surface dark:text-white font-bold flex items-center justify-between gap-2 cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-primary dark:text-secondary shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 z-40 rounded-xl border border-outline-variant/60 bg-white dark:bg-surface-container-high shadow-xl overflow-hidden transition-all duration-200 ease-out max-h-56 overflow-y-auto ${
          openUpwards ? 'bottom-full mb-1.5 origin-bottom' : 'top-full mt-1.5 origin-top'
        } ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : `opacity-0 scale-95 ${openUpwards ? 'translate-y-1.5' : '-translate-y-1.5'} pointer-events-none`
        } ${menuClassName}`}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                selected
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'text-on-surface dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {selected && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
