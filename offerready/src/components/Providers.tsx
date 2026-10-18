"use client";

import { MotionConfig } from "motion/react";
import { ToastProvider } from "./ui/Toast";
import { NavMemory } from "./shell/BackLink";

/** Motion honors the OS "reduce motion" setting everywhere; toasts are app-wide; every page visit is remembered for Back buttons. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}>
      <ToastProvider>
        <NavMemory />
        {children}
      </ToastProvider>
    </MotionConfig>
  );
}
