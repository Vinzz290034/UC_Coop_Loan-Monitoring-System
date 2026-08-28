'use client';

import React, { ElementType } from 'react';
import { useInView } from '@/hooks/useInView';

export type AnimationVariant =
  | 'fade-up'
  | 'pop-up'
  | 'zoom-in'
  | 'slide-left'
  | 'slide-right'
  | 'fade';

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: AnimationVariant;
  delay?: number;
  duration?: number;
  easing?: string;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  triggerOnMount?: boolean;
  className?: string;
  as?: ElementType;
}

export function ScrollReveal({
  children,
  variant = 'fade-up',
  delay = 0,
  duration = 600,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
  threshold = 0.15,
  rootMargin = '0px 0px -40px 0px',
  triggerOnce = true,
  triggerOnMount = false,
  className = '',
  as: Component = 'div',
  style,
  ...rest
}: ScrollRevealProps) {
  const [ref, inView, prefersReducedMotion] = useInView<HTMLElement>({
    threshold,
    rootMargin,
    triggerOnce,
  });

  const isVisible = triggerOnMount ? true : inView;

  // Determine variant-specific initial transform styles
  const getInitialTransform = () => {
    switch (variant) {
      case 'fade-up':
        return 'translate3d(0, 24px, 0)';
      case 'pop-up':
        return 'scale3d(0.93, 0.93, 1) translate3d(0, 16px, 0)';
      case 'zoom-in':
        return 'scale3d(0.85, 0.85, 1) translate3d(0, 12px, 0)';
      case 'slide-left':
        return 'translate3d(calc(var(--slide-dist, 36px) * -1), 0, 0)';
      case 'slide-right':
        return 'translate3d(var(--slide-dist, 36px), 0, 0)';
      case 'fade':
      default:
        return 'none';
    }
  };

  // If user requested reduced motion, render immediately without translation/scale
  if (prefersReducedMotion) {
    return (
      <Component ref={ref} className={className} style={style} {...rest}>
        {children}
      </Component>
    );
  }

  const computedStyle: React.CSSProperties = {
    ...style,
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'none' : getInitialTransform(),
    transitionProperty: 'opacity, transform',
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: easing,
    transitionDelay: `${delay}ms`,
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <Component
      ref={ref}
      className={`[--slide-dist:20px] sm:[--slide-dist:36px] ${className}`}
      style={computedStyle}
      {...rest}
    >
      {children}
    </Component>
  );
}

export default ScrollReveal;
