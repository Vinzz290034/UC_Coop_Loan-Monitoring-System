'use client';

import React, { useEffect, useRef } from 'react';
import { Banknote, Coins } from 'lucide-react';

interface EdgeItem {
  id: string;
  className: string;
  floatAnimation: string;
  content: React.ReactNode;
}

export default function AuthBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const currentOffsets = useRef<{ x: number; y: number }[]>([]);
  const targetOffsets = useRef<{ x: number; y: number }[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Define refined, smaller edge-only decorative elements around the entire perimeter
  const edgeItems: EdgeItem[] = [
    // ── TOP PERIMETER ────────────────────────────────────────────────────────
    {
      id: 'top-left-peso',
      className: 'top-[3%] sm:top-[4%] left-[4%] sm:left-[6%]',
      floatAnimation: 'peso-float-1 8s ease-in-out infinite',
      content: (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-md shadow-primary/10 text-primary dark:text-secondary font-headline font-extrabold text-sm sm:text-base select-none">
          ₱
        </div>
      ),
    },
    {
      id: 'top-mid-left-coin',
      className: 'hidden sm:flex top-[3%] left-[26%] lg:left-[28%]',
      floatAnimation: 'coin-float-2 10s ease-in-out infinite 0.6s',
      content: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-xs text-secondary select-none">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      ),
    },
    {
      id: 'top-center-peso',
      className: 'top-[2%] sm:top-[3%] left-1/2 -translate-x-1/2',
      floatAnimation: 'peso-float-2 11s ease-in-out infinite 1.2s',
      content: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-primary/20 dark:border-secondary/20 bg-primary/5 dark:bg-secondary/5 backdrop-blur-xs flex items-center justify-center text-primary/75 dark:text-secondary/75 font-headline font-bold text-xs sm:text-sm select-none">
          ₱
        </div>
      ),
    },
    {
      id: 'top-mid-right-bill',
      className: 'hidden sm:flex top-[3%] right-[26%] lg:right-[28%]',
      floatAnimation: 'bill-float-1 12s ease-in-out infinite 1.8s',
      content: (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-secondary/20 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs shadow-xs select-none">
          <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary" />
          <span className="text-[9px] font-bold font-mono text-secondary">₱500</span>
        </div>
      ),
    },
    {
      id: 'top-right-coin',
      className: 'top-[3%] sm:top-[4%] right-[4%] sm:right-[6%]',
      floatAnimation: 'coin-float-1 9s ease-in-out infinite 0.4s',
      content: (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-md shadow-primary/10 text-primary dark:text-secondary select-none">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      ),
    },

    // ── LEFT PERIMETER ───────────────────────────────────────────────────────
    {
      id: 'left-upper-peso',
      className: 'hidden md:flex top-[26%] left-[2%] sm:left-[3%] lg:left-[4%]',
      floatAnimation: 'peso-float-2 10s ease-in-out infinite 1s',
      content: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-secondary/30 bg-secondary/10 flex items-center justify-center text-secondary font-headline font-bold text-xs sm:text-sm select-none">
          ₱
        </div>
      ),
    },
    {
      id: 'left-mid-bill',
      className: 'hidden lg:flex top-[48%] left-[2%] sm:left-[3%]',
      floatAnimation: 'bill-float-1 12s ease-in-out infinite 0.8s',
      content: (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/20 dark:border-secondary/20 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs shadow-sm select-none">
          <Banknote className="w-4 h-4 text-primary dark:text-secondary" />
          <span className="text-[9px] sm:text-[10px] font-bold font-mono text-primary/70 dark:text-secondary/70">₱1,000</span>
        </div>
      ),
    },
    {
      id: 'left-lower-coin',
      className: 'hidden md:flex top-[72%] left-[2%] sm:left-[3%] lg:left-[4%]',
      floatAnimation: 'coin-float-1 11s ease-in-out infinite 2s',
      content: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-tertiary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-xs text-tertiary select-none">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      ),
    },

    // ── RIGHT PERIMETER ──────────────────────────────────────────────────────
    {
      id: 'right-upper-coin',
      className: 'hidden md:flex top-[26%] right-[2%] sm:right-[3%] lg:right-[4%]',
      floatAnimation: 'coin-float-2 10s ease-in-out infinite 1.4s',
      content: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-xs text-primary dark:text-secondary select-none">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      ),
    },
    {
      id: 'right-mid-peso',
      className: 'hidden lg:flex top-[48%] right-[2%] sm:right-[3%]',
      floatAnimation: 'peso-float-1 13s ease-in-out infinite 2.2s',
      content: (
        <div className="w-8 h-8 rounded-full border border-primary/20 dark:border-secondary/20 bg-primary/5 dark:bg-secondary/5 flex items-center justify-center text-primary dark:text-secondary font-headline font-extrabold text-sm select-none">
          ₱
        </div>
      ),
    },
    {
      id: 'right-lower-bill',
      className: 'hidden md:flex top-[72%] right-[2%] sm:right-[3%] lg:right-[4%]',
      floatAnimation: 'bill-float-2 11s ease-in-out infinite 1.6s',
      content: (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs shadow-sm select-none">
          <Banknote className="w-4 h-4 text-secondary" />
          <span className="text-[9px] sm:text-[10px] font-bold font-mono text-secondary">₱500</span>
        </div>
      ),
    },

    // ── BOTTOM PERIMETER ─────────────────────────────────────────────────────
    {
      id: 'bottom-left-coins',
      className: 'bottom-[3%] sm:bottom-[4%] left-[4%] sm:left-[6%]',
      floatAnimation: 'coin-float-1 9s ease-in-out infinite 1.2s',
      content: (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-tertiary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-md shadow-tertiary/10 text-tertiary select-none">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      ),
    },
    {
      id: 'bottom-mid-left-bill',
      className: 'hidden sm:flex bottom-[3%] left-[26%] lg:left-[28%]',
      floatAnimation: 'bill-float-1 12s ease-in-out infinite 0.7s',
      content: (
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/20 dark:border-secondary/20 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs shadow-xs select-none">
          <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary dark:text-secondary" />
          <span className="text-[9px] font-bold font-mono text-primary/70 dark:text-secondary/70">₱1,000</span>
        </div>
      ),
    },
    {
      id: 'bottom-center-peso',
      className: 'bottom-[2%] sm:bottom-[3%] left-1/2 -translate-x-1/2',
      floatAnimation: 'peso-float-2 12s ease-in-out infinite 2.5s',
      content: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-tertiary/20 bg-tertiary/5 flex items-center justify-center text-tertiary font-headline font-bold text-xs select-none">
          ₱
        </div>
      ),
    },
    {
      id: 'bottom-mid-right-coin',
      className: 'hidden sm:flex bottom-[3%] right-[26%] lg:right-[28%]',
      floatAnimation: 'coin-float-2 10s ease-in-out infinite 1.5s',
      content: (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-xs text-primary dark:text-secondary select-none">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      ),
    },
    {
      id: 'bottom-right-bill',
      className: 'bottom-[3%] sm:bottom-[4%] right-[4%] sm:right-[6%]',
      floatAnimation: 'bill-float-2 10s ease-in-out infinite 1s',
      content: (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs shadow-md shadow-secondary/10 select-none">
          <Banknote className="w-4 h-4 text-secondary" />
          <span className="text-[9px] sm:text-[10px] font-bold font-mono text-secondary">₱500</span>
        </div>
      ),
    },
  ];

  useEffect(() => {
    // Initialize offset vectors for all perimeter elements
    currentOffsets.current = edgeItems.map(() => ({ x: 0, y: 0 }));
    targetOffsets.current = edgeItems.map(() => ({ x: 0, y: 0 }));

    // Check pointer and reduced-motion capabilities
    const isHoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isHoverCapable || isReducedMotion) {
      return;
    }

    const REPEL_RADIUS = 130; // Threshold distance for cursor repulsion
    const MAX_REPEL_FORCE = 25; // Maximum displacement in pixels

    const handleMouseMove = (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      itemsRef.current.forEach((el, index) => {
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = centerX - mouseX;
        const dy = centerY - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < REPEL_RADIUS && distance > 0) {
          // Repulsion force inversely proportional to distance
          const power = (1 - distance / REPEL_RADIUS) * MAX_REPEL_FORCE;
          const nx = dx / distance;
          const ny = dy / distance;
          targetOffsets.current[index] = {
            x: nx * power,
            y: ny * power,
          };
        } else {
          targetOffsets.current[index] = { x: 0, y: 0 };
        }
      });
    };

    const handleMouseLeave = () => {
      targetOffsets.current = targetOffsets.current.map(() => ({ x: 0, y: 0 }));
    };

    // Smooth physics loop via requestAnimationFrame (linear interpolation)
    const animate = () => {
      itemsRef.current.forEach((el, index) => {
        if (!el) return;

        const current = currentOffsets.current[index];
        const target = targetOffsets.current[index];

        // Lerp towards target position (smooth return spring)
        current.x += (target.x - current.x) * 0.12;
        current.y += (target.y - current.y) * 0.12;

        // Apply hardware-accelerated transform directly without triggering React re-renders
        el.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`;
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-neutral-50 dark:bg-neutral-950"
      aria-hidden="true"
    >
      {/* ── Background Atmosphere & Ambient Orbs ─────────────────── */}
      <div
        className="absolute w-[650px] h-[650px] rounded-full pointer-events-none"
        style={{
          left: '-15%',
          top: '-20%',
          background:
            'radial-gradient(circle at center, rgba(4,120,87,0.18) 0%, rgba(52,211,153,0.08) 55%, transparent 75%)',
          filter: 'blur(60px)',
          animation: 'aurora-shift 18s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[550px] h-[550px] rounded-full pointer-events-none"
        style={{
          right: '-10%',
          bottom: '-15%',
          background:
            'radial-gradient(circle at center, rgba(52,211,153,0.14) 0%, rgba(4,120,87,0.06) 55%, transparent 75%)',
          filter: 'blur(65px)',
          animation: 'aurora-shift-alt 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[450px] h-[450px] rounded-full pointer-events-none"
        style={{
          left: '45%',
          top: '30%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle at center, rgba(164,80,73,0.08) 0%, transparent 70%)',
          filter: 'blur(75px)',
          animation: 'aurora-shift 26s ease-in-out infinite reverse',
        }}
      />

      {/* Subtle Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(4,120,87,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'grid-fade 8s ease-in-out infinite',
        }}
      />

      {/* ── Edge-Only Floating Items with Cursor Repulsion ───────── */}
      {edgeItems.map((item, index) => (
        <div
          key={item.id}
          className={`absolute ${item.className} z-0 pointer-events-none will-change-transform`}
        >
          {/* Outer wrapper handles cursor repulsion transform */}
          <div
            ref={(el) => {
              itemsRef.current[index] = el;
            }}
            className="transition-transform duration-75 ease-out"
          >
            {/* Inner child handles ambient continuous floating animation */}
            <div style={{ animation: item.floatAnimation }}>{item.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
