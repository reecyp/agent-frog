"use client";

import { motion } from "motion/react";
import { ArrivalStage } from "./ArrivalStage";

/**
 * One transition for every route: a short fade with a small rise (220ms), under which the
 * page's panels glide in (ArrivalStage). Each route group's template.tsx renders this, and
 * templates remount on navigation, so both play on each page change while the group's chrome
 * (sidebar, top bar) stays put. The landing-to-onboarding zoom is longer and lives in Entrance.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
      <ArrivalStage>{children}</ArrivalStage>
    </motion.div>
  );
}
