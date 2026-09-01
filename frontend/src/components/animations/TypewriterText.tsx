'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useInView } from '@/hooks/useInView';

export interface TextSegment {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  lineBreakAfter?: boolean;
}

export interface TypewriterTextProps {
  /** Array of structured text segments or simple string */
  segments: TextSegment[] | string;
  /** Speed in milliseconds per character. Defaults to 30ms */
  speed?: number;
  /** Initial delay before typing starts in milliseconds. Defaults to 200ms */
  delay?: number;
  /** Whether to trigger on mount (e.g. for hero) or on scroll viewport entrance. Defaults to false (scroll) */
  triggerOnMount?: boolean;
  /** Whether to show blinking cursor while typing. Defaults to true */
  showCursor?: boolean;
  /** Custom cursor color class. Defaults to 'bg-primary dark:bg-secondary' */
  cursorClassName?: string;
  /** Root wrapper element tag. Defaults to 'span' */
  as?: React.ElementType;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({
  segments,
  speed = 28,
  delay = 200,
  triggerOnMount = false,
  showCursor = true,
  cursorClassName = 'bg-primary dark:bg-secondary',
  as: Component = 'span',
  className = '',
  onComplete,
}: TypewriterTextProps) {
  const [ref, inView, prefersReducedMotion] = useInView<HTMLElement>({
    threshold: 0.2,
    triggerOnce: true,
  });

  // Normalize segments input
  const normalizedSegments = useMemo<TextSegment[]>(() => {
    if (typeof segments === 'string') {
      return [{ text: segments }];
    }
    return segments;
  }, [segments]);

  // Calculate total characters count
  const totalChars = useMemo(() => {
    return normalizedSegments.reduce((acc, seg) => acc + seg.text.length, 0);
  }, [normalizedSegments]);

  const isTriggered = triggerOnMount ? true : inView;
  const [revealedCount, setRevealedCount] = useState(prefersReducedMotion ? totalChars : 0);
  const [isTypingComplete, setIsTypingComplete] = useState(prefersReducedMotion);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) {
      setRevealedCount(totalChars);
      setIsTypingComplete(true);
      if (onComplete) onComplete();
      return;
    }

    if (!isTriggered) return;

    let current = 0;
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        current += 1;
        setRevealedCount(current);

        if (current >= totalChars) {
          clearInterval(interval);
          setIsTypingComplete(true);
          if (onComplete) onComplete();
        }
      }, speed);

      timeoutRef.current = interval as unknown as NodeJS.Timeout;
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [isTriggered, totalChars, speed, delay, prefersReducedMotion, onComplete]);

  // If reduced motion is requested, render full text statically
  if (prefersReducedMotion) {
    return (
      <Component ref={ref} className={className}>
        {normalizedSegments.map((seg, sIndex) => (
          <React.Fragment key={sIndex}>
            <span className={seg.className} style={seg.style}>
              {seg.text}
            </span>
            {seg.lineBreakAfter && <br />}
          </React.Fragment>
        ))}
      </Component>
    );
  }

  // Pre-calculate character offset mappings for layout-shift-free progressive rendering
  let charCounter = 0;

  return (
    <Component ref={ref} className={`relative inline-block ${className}`}>
      {normalizedSegments.map((seg, sIndex) => {
        const segChars = seg.text.split('');
        const segStart = charCounter;
        charCounter += segChars.length;

        return (
          <React.Fragment key={sIndex}>
            <span className={seg.className} style={seg.style}>
              {segChars.map((char, cIndex) => {
                const globalIndex = segStart + cIndex;
                const isRevealed = globalIndex < revealedCount;
                const isCurrentCursorPos = globalIndex === revealedCount - 1;

                return (
                  <span
                    key={cIndex}
                    className={`inline transition-opacity duration-75 ${
                      isRevealed ? 'opacity-100 visible' : 'opacity-0 invisible select-none pointer-events-none'
                    }`}
                  >
                    {char}
                    {showCursor && !isTypingComplete && isCurrentCursorPos && (
                      <span
                        className={`inline-block w-[3px] h-[0.85em] ml-0.5 align-middle rounded-full animate-pulse ${cursorClassName}`}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                );
              })}
            </span>
            {seg.lineBreakAfter && <br />}
          </React.Fragment>
        );
      })}
    </Component>
  );
}

export default TypewriterText;
