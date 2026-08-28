'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

export interface UseInViewOptions {
  /** Threshold at which the element is considered in view (0.0 - 1.0). Defaults to 0.15 */
  threshold?: number;
  /** Margin around the root. Defaults to '0px 0px -40px 0px' */
  rootMargin?: string;
  /** Whether the animation should trigger only once upon entering the viewport. Defaults to true */
  triggerOnce?: boolean;
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): [RefObject<T | null>, boolean, boolean] {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -40px 0px',
    triggerOnce = true,
  } = options;

  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    // If reduced motion is requested, immediately set inView to true
    if (mediaQuery.matches) {
      setInView(true);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    const currentRef = ref.current;
    if (!currentRef) return () => mediaQuery.removeEventListener('change', handleMediaChange);

    // If browser does not support IntersectionObserver, default to visible
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.unobserve(currentRef);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, inView, prefersReducedMotion];
}
