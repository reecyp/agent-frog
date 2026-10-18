"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { finishOnboarding } from "@/app/(start)/start/actions";

/** The profile check's closing bar: enters the studio once nothing is left to check. */
export function FinishOnboarding({ unchecked }: { unchecked: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const finish = () =>
    start(async () => {
      setError(null);
      const r = await finishOnboarding();
      if (r && !r.ok) setError(r.error);
    });
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-12 flex flex-col gap-3 border-t border-[var(--desk-line)] bg-[rgb(21_16_13/0.92)] px-4 py-4 backdrop-blur-md sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-10 lg:px-10">
      <p className="text-sm text-[var(--ink-2)]" aria-live="polite">
        {error ?? (unchecked > 0 ? `Confirm the ${unchecked} ${unchecked === 1 ? "item" : "items"} marked for checking to continue.` : "Everything is confirmed.")}
      </p>
      <button type="button" className="btn btn-primary" onClick={finish} disabled={pending || unchecked > 0}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Confirm and enter your studio
      </button>
    </div>
  );
}
