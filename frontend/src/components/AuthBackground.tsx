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

  // Define edge-only decorative elements (strictly anchored to outer perimeter)
  const edgeItems: EdgeItem[] = [
    // 1. Top-Left Peso Badge
    {
      id: 'tl-peso',
      className: 'top-[8%] left-[3%] sm:left-[5%] lg:left-[6%]',
      floatAnimation: 'peso-float-1 9s ease-in-out infinite',
      content: (
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-lg shadow-primary/10 text-primary dark:text-secondary font-headline font-extrabold text-xl sm:text-2xl select-none">
          ₱
        </div>
      ),
    },
    // 2. Mid-Left Banknote Card (Hidden on mobile to preserve safe zone)
    {
      id: 'ml-bill',
      className: 'hidden md:flex top-[45%] left-[2%] sm:left-[3%] lg:left-[4%]',
      floatAnimation: 'bill-float-1 12s ease-in-out infinite 0.5s',
      content: (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/20 dark:border-secondary/20 bg-white/45 dark:bg-neutral-900/45 backdrop-blur-xs shadow-md shadow-primary/5 select-none">
          <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-primary dark:text-secondary" />
          <span className="text-[10px] sm:text-[11px] font-bold font-mono text-primary/70 dark:text-secondary/70">₱1,000</span>
        </div>
      ),
    },
    // 3. Bottom-Left Coin Badge
    {
      id: 'bl-coins',
      className: 'bottom-[12%] left-[4%] sm:left-[6%] lg:left-[7%]',
      floatAnimation: 'coin-float-1 10s ease-in-out infinite 1.2s',
      content: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-tertiary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center shadow-md shadow-tertiary/10 text-tertiary select-none">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      ),
    },
    // 4. Top-Right Coin Badge
    {
      id: 'tr-coins',
      className: 'top-[10%] right-[4%] sm:right-[6%] lg:right-[7%]',
      floatAnimation: 'coin-float-2 11s ease-in-out infinite 2.2s',
      content: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-primary/25 dark:border-secondary/25 bg-white/45 dark:bg-neutral-900/45 backdrop-blur-xs flex items-center justify-center shadow-md shadow-primary/10 text-primary dark:text-secondary select-none">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      ),
    },
    // 5. Mid-Right Peso Badge (Hidden on mobile)
    {
      id: 'mr-peso',
      className: 'hidden md:flex top-[50%] right-[2%] sm:right-[3%] lg:right-[4%]',
      floatAnimation: 'peso-float-2 13s ease-in-out infinite 1.8s',
      content: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-primary/20 dark:border-secondary/20 bg-primary/5 dark:bg-secondary/5 flex items-center justify-center text-primary dark:text-secondary font-headline font-extrabold text-lg sm:text-xl select-none">
          ₱
        </div>
      ),
    },
    // 6. Bottom-Right Banknote Card
    {
      id: 'br-bill',
      className: 'bottom-[10%] right-[3%] sm:right-[5%] lg:right-[6%]',
      floatAnimation: 'bill-float-2 11s ease-in-out infinite 1s',
      content: (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-secondary/25 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xs shadow-lg shadow-secondary/10 select-none">
          <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
          <span className="text-[10px] sm:text-[11px] font-bold font-mono text-secondary">₱500</span>
        </div>
      ),
    },
  ];

  useEffect(() => {
    // Initialize offset vectors
    currentOffsets.current = edgeItems.map(() => ({ x: 0, y: 0 }));
    targetOffsets.current = edgeItems.map(() => ({ x: 0, y: 0 }));

    // Check if device supports hover and pointer interaction
    const isHoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isHoverCapable || isReducedMotion) {
      return;
    }

    const REPEL_RADIUS = 150; // Threshold distance for cursor repulsion
    const MAX_REPEL_FORCE = 30; // Maximum displacement in pixels

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
          // Calculate repulsion force inversely proportional to distance
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
      // Reset all offsets when cursor leaves viewport
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
