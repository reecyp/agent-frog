"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FilePenLine, Loader2 } from "lucide-react";
import { generateAction, tailorJobAction } from "@/app/actions";
import { useToast } from "../ui/Toast";

/** Drafts both documents. Without an application yet, this is what creates one. */
export function GenerateButton({ jobId, applicationId, aiConfigured, hasDrafts, showHint = true, variant = "primary" }: { jobId: string; applicationId: string | null; aiConfigured: boolean; hasDrafts: boolean; showHint?: boolean; variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"}`}
          disabled={pending}
          onClick={() =>
            start(async () => {
              setNote(null);
              const r = applicationId ? await generateAction(applicationId) : await tailorJobAction(jobId);
              if (!r.ok) {
                toast(r.error, "error");
                return;
              }
              if (r.data?.aiError) setNote(`Claude couldn't draft this (${r.data.aiError}). You're seeing the rule-based draft instead.`);
              toast(`Drafted your resume and cover letter${r.data?.generator === "claude" ? " with Claude" : ""}. Review every highlighted line.`, "ok");
              router.push(`/jobs/${jobId}?step=review`, { scroll: false });
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FilePenLine className="size-4" aria-hidden />}
          {pending ? (aiConfigured ? "Claude is drafting, about 30–60 seconds" : "Drafting") : hasDrafts ? "Draft a new version" : "Tailor my resume and cover letter"}
        </button>
      </div>
      {showHint && <p className="t-meta measure">
        {aiConfigured
          ? "Claude rewords your real bullets for this posting. Every line is then checked against your evidence before you see it."
          : "No AI key is set, so drafting is rule-based: it reorders your real bullets by relevance and flags any wording you should confirm. It never writes new claims."}
      </p>}
      {note && <p role="status" className="measure text-[0.875rem] text-caution">{note}</p>}
    </div>
  );
}
