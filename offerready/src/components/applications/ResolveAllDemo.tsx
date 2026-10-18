"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { resolveAllDemoAction } from "@/app/actions";
import { useToast } from "../ui/Toast";

/**
 * Demo shortcut on the review step: resolves both drafts the way a careful student would and
 * approves them, then moves on to Export. It's recorded in the AI log as a demo action.
 */
export function ResolveAllDemo({ applicationId, jobId }: { applicationId: string; jobId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={pending}
      title="Confirms lines that need it, removes unsupported claims, fills name blanks, then approves both documents"
      onClick={() =>
        start(async () => {
          const r = await resolveAllDemoAction(applicationId);
          if (!r.ok) return toast(r.error, "error");
          if (!r.data?.approved) {
            toast(`Resolved, but approval stopped: ${r.data?.notes.join(" ")}`, "error");
            return router.refresh();
          }
          toast("Both documents resolved and approved.", "ok");
          router.push(`/jobs/${jobId}?step=export`, { scroll: false });
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
      {pending ? "Resolving and checking the PDFs" : "Resolve all and approve (demo)"}
    </button>
  );
}
