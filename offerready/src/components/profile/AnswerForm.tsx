"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, MinusCircle, PencilLine } from "lucide-react";
import { answerAction } from "@/app/actions";
import { useToast } from "../ui/Toast";

export interface AnswerItem {
  id: string;
  question: string;
  answer: string;
  state: "pending" | "answered" | "declined";
  context: string | null;
  why?: string;
}

/** One question. Declining is as easy as answering: the student is never pushed to claim something. */
export function AnswerForm({ answer, path }: { answer: AnswerItem; path: string }) {
  const toast = useToast();
  const [text, setText] = useState(answer.answer);
  const [editing, setEditing] = useState(answer.state === "pending");
  const [pending, start] = useTransition();
  const fieldId = `ans-${answer.id}`;

  const save = (value: string | null) =>
    start(async () => {
      if (value !== null && value.trim().length < 3) {
        toast("Write a short answer, or choose \"I haven't done this\".", "error");
        return;
      }
      const r = await answerAction(answer.id, value, path);
      if (!r.ok) return toast(r.error, "error");
      toast(value === null ? "Noted. This stays off your materials." : "Saved to your profile as something you confirmed.", "ok");
      setEditing(false);
    });

  return (
    <div className="px-4 py-4 @xl:px-5">
      {answer.context && <p className="t-meta mb-1 break-words">{answer.context}</p>}
      <label htmlFor={fieldId} className="block break-words text-[1rem] font-semibold leading-snug text-ink">{answer.question}</label>
      {answer.why && <p className="t-meta mt-1">{answer.why}</p>}
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3">
            <textarea id={fieldId} className="input w-full" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="One or two sentences, in your own words." />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => save(text)}>
                {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Save answer
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => save(null)}>I haven&apos;t done this</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2.5 flex flex-col gap-2 @xl:flex-row @xl:items-start @xl:justify-between @xl:gap-4">
            {answer.state === "declined" && !text ? (
              <p className="flex min-w-0 items-start gap-2 text-[0.875rem] text-ink-2"><MinusCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> You said this doesn&apos;t apply. It won&apos;t appear in your materials.</p>
            ) : (
              <p className="flex min-w-0 items-start gap-2 text-[0.9375rem]"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Answered" /><span className="min-w-0 break-words">{text}</span></p>
            )}
            <button type="button" className="btn btn-quiet btn-sm -ml-2.5 self-start @xl:ml-0" onClick={() => setEditing(true)}><PencilLine className="size-3.5" aria-hidden /> Change</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
