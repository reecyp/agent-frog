"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { generateDeepDive } from "@/app/(app)/profile/actions";
import { useToast } from "../ui/Toast";

export function DeepDiveButton() {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await generateDeepDive();
          if (!r.ok) return toast(r.error, "error");
          const d = r.data!;
          if (d.note) toast(d.note, "info");
          toast(d.added ? `${d.added} new ${d.added === 1 ? "question" : "questions"} ${d.generator === "claude" ? "from Claude" : ""}.` : "No new questions. Everything worth asking has been asked.", d.added ? "ok" : "info");
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />} Ask me new questions
    </button>
  );
}
