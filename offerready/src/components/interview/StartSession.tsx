"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { startSession } from "@/app/(app)/interview/actions";
import { QUESTION_FOCUSES, type QuestionFocus } from "@/domain/interview";
import { ActionButton } from "../ui/ActionButton";

const FOCUS_LABEL: Record<QuestionFocus, string> = { behavioral: "Behavioral", role: "Role and technical", resume: "About my resume" };

/** Picks which types of questions the next set has, then writes it. Defaults to the types in the current set. */
export function StartSessionButton({ applicationId, hasSession, initial = QUESTION_FOCUSES }: { applicationId: string; hasSession: boolean; initial?: QuestionFocus[] }) {
  const [focuses, setFocuses] = useState<QuestionFocus[]>(initial);
  const toggle = (f: QuestionFocus, on: boolean) => setFocuses((cur) => QUESTION_FOCUSES.filter((x) => (x === f ? on : cur.includes(x))));
  return (
    <div className="flex flex-col gap-3">
      <fieldset className="min-w-0">
        <legend className="t-label mb-1.5">Question types</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {QUESTION_FOCUSES.map((f) => (
            <label key={f} className="inline-flex min-h-9 cursor-pointer select-none items-center gap-2 text-[0.875rem]">
              <input type="checkbox" checked={focuses.includes(f)} onChange={(e) => toggle(f, e.target.checked)} className="size-4 cursor-pointer accent-[var(--accent)]" />
              {FOCUS_LABEL[f]}
            </label>
          ))}
        </div>
        {!focuses.length && <p className="t-meta mt-1">Pick at least one type.</p>}
      </fieldset>
      <ActionButton action={() => startSession(applicationId, focuses)} disabled={!focuses.length} className={`${hasSession ? "btn btn-secondary" : "btn btn-primary"} self-start`} success="Five new questions are ready.">
        <Play className="size-4" aria-hidden /> {hasSession ? "New set of questions" : "Start practice"}
      </ActionButton>
    </div>
  );
}
