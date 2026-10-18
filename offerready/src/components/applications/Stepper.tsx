"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Lock } from "lucide-react";
import { indicatorSpring } from "../motion";

export type StepId = "requirements" | "review" | "export";
type StepState = "todo" | "done" | "locked";

const STEPS: { id: StepId; label: string; hint: string }[] = [
  { id: "requirements", label: "Requirements", hint: "The posting, checked against you" },
  { id: "review", label: "Review", hint: "Check every change" },
  { id: "export", label: "Export", hint: "Download approved files" },
];

/**
 * The tailoring sequence. Numbers are used because this really is an ordered process.
 * Each step sits on a progress track: done steps fill it, the current step carries a sliding accent bar.
 */
export function Stepper({ jobId, current, state }: { jobId: string; current: StepId; state: Record<StepId, StepState> }) {
  return (
    <nav aria-label="Application steps">
      <ol className="grid grid-cols-3 gap-2 @xl:gap-3">
        {STEPS.map((s, i) => {
          const st = state[s.id];
          const active = s.id === current;
          const locked = st === "locked";
          const done = st === "done";
          const content = (
            <>
              <span aria-hidden className={`relative block h-[3px] rounded-full ${done ? "bg-accent/35" : "bg-line"}`}>
                {active && <motion.span layoutId={`step-${jobId}`} transition={indicatorSpring} className="absolute inset-0 rounded-full bg-accent" />}
              </span>
              <span className="mt-2.5 flex min-w-0 items-start gap-2">
                <span
                  aria-hidden
                  className={`t-num mt-px hidden size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] @sm:grid font-semibold ${
                    active
                      ? "bg-accent text-on-accent"
                      : done
                        ? "bg-accent-soft text-accent"
                        : "border border-line-strong text-ink-3"
                  }`}
                >
                  {done && !active ? <Check className="size-3" strokeWidth={2.5} /> : locked ? <Lock className="size-2.5" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[0.8125rem] font-semibold leading-5 @xl:text-[0.875rem] ${active ? "text-ink" : locked ? "text-ink-3" : "text-ink-2"}`}>{s.label}</span>
                  <span className="hidden truncate text-[0.8125rem] leading-5 text-ink-3 @2xl:block">{locked ? "Not available yet" : s.hint}</span>
                </span>
              </span>
              {locked && <span className="sr-only"> (not available yet)</span>}
              {done && <span className="sr-only"> (done)</span>}
            </>
          );
          return (
            <li key={s.id} className="min-w-0">
              {locked ? (
                <span className="block min-h-11 cursor-not-allowed py-1" aria-disabled="true">{content}</span>
              ) : (
                <Link
                  href={`/jobs/${jobId}?step=${s.id}`}
                  scroll={false}
                  aria-current={active ? "step" : undefined}
                  className="block min-h-11 rounded-control py-1 [&:hover_.text-ink-2]:text-ink"
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
