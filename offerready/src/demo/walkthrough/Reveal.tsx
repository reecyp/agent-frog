"use client";

import { motion } from "motion/react";

const settle = [0.16, 1, 0.3, 1] as const;

/**
 * One part of a section arriving as the section enters view: a short rise with opacity, once.
 * `order` staggers the parts of a section (heading, then text, then the demo). Reduced motion keeps
 * the fade and drops the travel (MotionConfig reducedMotion="user").
 */
export function Reveal({ order = 0, className, children, as = "div" }: { order?: number; className?: string; children: React.ReactNode; as?: "div" | "p" | "h2" }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: settle, delay: order * 0.08 }}
    >
      {children}
    </Tag>
  );
}
