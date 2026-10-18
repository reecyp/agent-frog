"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/domain/types";
import { setStatusAction } from "@/app/actions";
import { useToast } from "../ui/Toast";

export function StatusSelect({ applicationId, status, canMarkReady, compact = false, inline = false }: { applicationId: string; status: ApplicationStatus; canMarkReady: boolean; compact?: boolean; inline?: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const id = `status-${applicationId}`;
  return (
    <div className={inline ? "flex items-center gap-2" : "field"}>
      {!compact && <label htmlFor={id} className="t-label">Status</label>}
      <div className="flex items-center gap-2">
        <select
          id={id}
          aria-label={compact ? "Status" : undefined}
          className={`input ${compact ? "min-h-9 w-auto py-1 text-[0.8125rem]" : inline ? "w-48" : "w-56"}`}
          value={status}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as ApplicationStatus;
            start(async () => {
              const r = await setStatusAction(applicationId, next);
              toast(r.ok ? `Marked ${APPLICATION_STATUSES.find((s) => s.value === next)?.label}` : r.error, r.ok ? "ok" : "error");
            });
          }}
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s.value} value={s.value} disabled={s.value === "ready" && !canMarkReady && status !== "ready"}>
              {s.label}{s.value === "ready" && !canMarkReady ? " (approve both documents first)" : ""}
            </option>
          ))}
        </select>
        {pending && <Loader2 className="size-4 animate-spin text-ink-3" aria-label="Saving" />}
      </div>
    </div>
  );
}
