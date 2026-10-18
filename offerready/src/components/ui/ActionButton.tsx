"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import type { ActionResult } from "@/app/actions";
import { useToast } from "./Toast";

/**
 * Runs a server action, shows a spinner while it's pending, and reports the result.
 * Actions that redirect on success never resolve here, which is fine.
 */
export function ActionButton({
  action,
  children,
  className = "btn btn-primary",
  success,
  disabled,
  ariaLabel,
}: {
  action: () => Promise<ActionResult<unknown> | void>;
  children: React.ReactNode;
  className?: string;
  success?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      aria-label={ariaLabel}
      onClick={() =>
        start(async () => {
          const r = await action();
          if (r && !r.ok) toast(r.error, "error");
          else if (r && r.ok && (success || r.message)) toast(r.message ?? success!, "ok");
        })
      }
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
