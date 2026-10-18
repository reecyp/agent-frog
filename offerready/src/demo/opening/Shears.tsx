"use client";

import { motion, useTransform, type MotionValue } from "motion/react";

/** Pivot of the two halves, in viewBox units. The blade tip sits at the bottom centre (60, 296). */
const PIVOT = { transformBox: "view-box", transformOrigin: "60px 118px" } as const;

/**
 * Tailor's shears pointing down the cut: long steel blades, bent black enamel bows (a large finger
 * loop and a small thumb ring), a brass pivot screw. `open` is the blade angle in degrees; each half
 * swings by it around the pivot, so a scroll-driven value makes the blades snip and reverse.
 */
export function Shears({ open, className }: { open: MotionValue<number>; className?: string }) {
  const back = useTransform(open, (a) => -a);
  return (
    <svg viewBox="0 0 120 300" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="af-steel-l" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#5f5b56" />
          <stop offset="0.45" stopColor="#b7b2aa" />
          <stop offset="0.85" stopColor="#efebe4" />
          <stop offset="1" stopColor="#d6d1c8" />
        </linearGradient>
        <linearGradient id="af-steel-r" x1="1" x2="0" y1="0" y2="0">
          <stop offset="0" stopColor="#4c4945" />
          <stop offset="0.5" stopColor="#9a958d" />
          <stop offset="0.88" stopColor="#d9d4cb" />
          <stop offset="1" stopColor="#c2bdb4" />
        </linearGradient>
        <radialGradient id="af-brass" cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f3d9a6" />
          <stop offset="0.55" stopColor="#c99a55" />
          <stop offset="1" stopColor="#6e4f24" />
        </radialGradient>
      </defs>

      {/* Back half: blade swings right, thumb ring upper left */}
      <motion.g style={{ ...PIVOT, rotate: back }}>
        <path d="M59 108 L59.6 296 C64 254 74 192 79 146 C80.4 130 73 115 59 108 Z" fill="url(#af-steel-r)" />
        <path d="M60.4 122 L60.2 290" stroke="#f7f4ee" strokeOpacity="0.35" strokeWidth="0.8" />
        <path d="M57 114 C50 99 44 86 40 76" fill="none" stroke="#141315" strokeWidth="8.5" strokeLinecap="round" />
        <ellipse cx="32" cy="52" rx="16" ry="22" fill="none" stroke="#141315" strokeWidth="8" transform="rotate(-14 32 52)" />
        <ellipse cx="32" cy="52" rx="16" ry="22" fill="none" stroke="#5a5652" strokeOpacity="0.6" strokeWidth="1.3" transform="rotate(-14 32 52) translate(-1.6 -1.8)" />
      </motion.g>

      {/* Front half: blade swings left, large finger bow upper right */}
      <motion.g style={{ ...PIVOT, rotate: open }}>
        <path d="M61 108 L60.4 296 C56 254 46 192 41 146 C39.6 130 47 115 61 108 Z" fill="url(#af-steel-l)" />
        <path d="M59.6 122 L59.8 290" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.7" />
        <path d="M62 114 C69 98 75 84 79 70" fill="none" stroke="#141315" strokeWidth="9" strokeLinecap="round" />
        <path d="M80 72 C62 66 60 30 76 16 C92 2 112 18 108 42 C105 62 94 74 80 72 Z" fill="none" stroke="#141315" strokeWidth="8" strokeLinejoin="round" />
        <path d="M79 69 C64 63 62 32 76 19 C90 7 108 20 105 41" fill="none" stroke="#56524e" strokeOpacity="0.6" strokeWidth="1.3" strokeLinecap="round" />
      </motion.g>

      {/* Pivot screw */}
      <circle cx="60" cy="118" r="5.6" fill="url(#af-brass)" stroke="#3b2a14" strokeWidth="0.8" />
      <path d="M57 116.2 L63 119.8" stroke="#4a3518" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
