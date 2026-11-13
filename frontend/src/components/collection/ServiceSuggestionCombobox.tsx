import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Sparkles, Check } from 'lucide-react';

interface ServiceSuggestionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  disabled?: boolean;
  placeholder?: string;
}

export const ServiceSuggestionCombobox: React.FC<ServiceSuggestionComboboxProps> = ({
  value,
  onChange,
  suggestions = [],
  disabled = false,
  placeholder = 'e.g. Wifi, Water, Locker...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 280,
    openUpward: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const width = Math.max(rect.width, 260);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left,
      width,
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsAnimatingIn(false);
      return;
    }
    updatePosition();
    const raf = requestAnimationFrame(() => setIsAnimatingIn(true));

    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setHighlightedIndex(0);
  };

  const filteredSuggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    if (!q) return suggestions;
    const prefixMatches = suggestions.filter((s) => s.toLowerCase().startsWith(q));
    const containsMatches = suggestions.filter(
      (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q)
    );
    const combined = [...prefixMatches, ...containsMatches];
    return combined.length > 0 ? combined : suggestions;
  }, [suggestions, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(filteredSuggestions.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + Math.max(filteredSuggestions.length, 1)) % Math.max(filteredSuggestions.length, 1));
    } else if (e.key === 'Enter') {
      if (filteredSuggestions[highlightedIndex]) {
        e.preventDefault();
        onChange(filteredSuggestions[highlightedIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onFocus={handleOpen}
          onClick={handleOpen}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) handleOpen();
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-2 pr-7 py-1.5 rounded-lg border border-outline-variant/60 bg-transparent text-xs font-semibold text-neutral-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              handleOpen();
            }
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          title="Browse Coop Services"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
              isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
            }`}
          />
        </button>
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : coords.top,
              bottom: coords.openUpward ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: coords.width,
              zIndex: 99999,
            }}
            className={`max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-emerald-400 dark:border-emerald-700 rounded-xl shadow-2xl divide-y divide-neutral-100 dark:divide-neutral-800/80 transition-all duration-200 ease-out ${
              coords.openUpward ? 'origin-bottom' : 'origin-top'
            } ${
              isAnimatingIn
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 -translate-y-1'
            }`}
          >
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/70 flex items-center justify-between border-b border-emerald-200 dark:border-emerald-900/60 sticky top-0 z-10 backdrop-blur-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Coop Services & Fees
              </span>
              <span className="text-[9.5px] text-neutral-500 dark:text-neutral-400">
                Select or type custom
              </span>
            </div>

            <div className="py-1 divide-y divide-neutral-100/60 dark:divide-neutral-800/50">
              {filteredSuggestions.map((serviceName, idx) => {
                const isSelected = serviceName.toLowerCase() === (value || '').trim().toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={serviceName}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      onChange(serviceName);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-100 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200 font-bold'
                        : isHighlighted
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-neutral-900 dark:text-white'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30'
                    }`}
                  >
                    <span>{serviceName}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

