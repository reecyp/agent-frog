"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { clearCompare, useCompare } from "./compareStore";

export function CompareBar() {
  const ids = useCompare();
  return (
    <AnimatePresence>
      {ids.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ left: "calc(var(--shell-offset, 0px) + 0.75rem)" }}
          className="floating fixed right-3 bottom-3 z-30 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-x-3 gap-y-2 border border-[var(--line)] py-2.5 pr-2.5 pl-4"
          role="region"
          aria-label="Compare jobs"
        >
          <p className="text-[0.875rem] text-[var(--ink-2)]">
            <span className="font-semibold text-[var(--ink)] t-num">{ids.length}</span> of 3 selected to compare
          </p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={clearCompare} className="btn btn-quiet btn-sm">Clear</button>
            {ids.length >= 2 ? (
              <Link href={`/jobs/compare?ids=${ids.join(",")}`} className="btn btn-primary btn-sm">Compare side by side</Link>
            ) : (
              <span className="t-meta px-2">Pick one more</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
