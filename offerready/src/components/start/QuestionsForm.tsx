"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { sampleAnswers, submitAnswers } from "@/app/(start)/start/actions";
import { fadeRise } from "../motion";

interface Question {
  id: string;
  question: string;
  answer: string;
  context: string | null;
}

const MIN = 3;

/**
 * The onboarding questions written from the student's own resume, one per step in the fitting
 * room's style. A demo button fills every answer with Claude-written samples, clearly flagged.
 * Every question must be answered before the profile check opens.
 */
export function QuestionsForm({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.id, q.answer])));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sampled, setSampled] = useState(false);
  const [filling, startFill] = useTransition();
  const [saving, startSave] = useTransition();
  const fields = useRef<(HTMLTextAreaElement | null)[]>([]);
  const moved = useRef(false);

  // Move focus to the new step's answer so keyboard and screen-reader users land on the question.
  useEffect(() => {
    if (moved.current) fields.current[step]?.focus();
  }, [step]);

  const total = questions.length;
  const answered = questions.filter((q) => (answers[q.id] ?? "").trim().length >= MIN).length;
  const current = questions[step];
  const ready = (answers[current?.id] ?? "").trim().length >= MIN;
  const last = step >= total - 1;
  const busy = saving || filling;

  const go = (n: number) => {
    moved.current = true;
    setError(null);
    setStep(n);
  };

  const fill = () =>
    startFill(async () => {
      setError(null);
      const r = await sampleAnswers();
      if (!r.ok) return setError(r.error);
      setAnswers((a) => ({ ...a, ...r.data }));
      setSampled(true);
    });

  const submit = () =>
    startSave(async () => {
      setError(null);
      const r = await submitAnswers(answers);
      if (r && !r.ok) setError(r.error);
    });

  return (
    <form
      className="mx-auto grid max-w-xl gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (last) submit();
        else if (ready) go(step + 1);
      }}
      onKeyDown={(e) => {
        // Cmd/Ctrl+Enter moves on; plain Enter stays a new line in the answer.
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (last) submit();
          else if (ready) go(step + 1);
        }
      }}
    >
      <Progress step={step} total={total} answered={answered} />

      <div className="flex flex-col gap-3 rounded-[var(--r-panel)] border border-dashed border-[var(--line-strong)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.875rem] text-[var(--ink-2)]">Short on time? Fill every answer with an editable sample.</p>
        <button type="button" className="btn btn-secondary btn-sm self-start sm:self-auto" disabled={busy} onClick={fill}>
          {filling ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Sparkles className="size-3.5" aria-hidden />} Pre-populate (demo)
        </button>
      </div>

      <AnimatePresence>
        {sampled && (
          <motion.p {...fadeRise} role="status" className="-mt-3 flex gap-2 rounded-[var(--r-control)] bg-[var(--caution-soft)] px-3 py-2.5 text-[0.875rem] text-[var(--caution)]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>These are sample answers written by Claude, not facts about you. Edit them to match what you actually did before submitting.</span>
          </motion.p>
        )}
      </AnimatePresence>

      {questions.map((q, i) => (
        <Step key={q.id} index={i} current={step}>
          {q.context && <p className="t-meta mb-2 break-words">{q.context}</p>}
          {/* These questions run long, so a step down from the page title keeps them to a few lines. */}
          <h1 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.4rem,1.15rem+0.9vw,1.9rem)] leading-[1.18]">
            <label htmlFor={`q-${q.id}`}>{q.question}</label>
          </h1>
          <textarea
            id={`q-${q.id}`}
            ref={(el) => {
              fields.current[i] = el;
            }}
            className="input mt-8 w-full"
            rows={5}
            value={answers[q.id] ?? ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            placeholder="A few sentences, in your own words."
          />
          <p className="t-meta mt-2">Real numbers, tools and outcomes give your applications specific things you actually did.</p>
        </Step>
      ))}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--desk-line)] pt-6">
        {step > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => go(step - 1)} disabled={busy}>Back</button>
        ) : (
          <p className="t-meta">Answers are saved to your profile, never invented.</p>
        )}
        {last ? (
          <button type="submit" className="btn btn-primary min-w-36" disabled={busy}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />} Submit answers
          </button>
        ) : (
          <button type="submit" className="btn btn-primary min-w-36" disabled={busy || !ready} aria-describedby={!ready ? "need-answer" : undefined}>
            Next
          </button>
        )}
      </div>
      {!ready && !last && <p id="need-answer" className="t-meta -mt-5 text-right">Answer this one to continue.</p>}
      <AnimatePresence>{error && <motion.p {...fadeRise} role="alert" className="-mt-3 text-sm font-medium text-[var(--danger)]">{error}</motion.p>}</AnimatePresence>
    </form>
  );
}

/** Steps stay mounted so answers persist; hidden ones rest just off to the side they'll enter from. */
function Step({ index, current, children }: { index: number; current: number; children: React.ReactNode }) {
  const active = index === current;
  return (
    <motion.section
      hidden={!active}
      aria-hidden={!active}
      initial={false}
      animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: index < current ? -18 : 18 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function Progress({ step, total, answered }: { step: number; total: number; answered: number }) {
  return (
    <div className="grid gap-2">
      <p className="t-meta t-num flex justify-between gap-4" aria-live="polite">
        <span>About your experience: question {step + 1} of {total}</span>
        <span>{answered} answered</span>
      </p>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--desk-line)]">
            <motion.span className="block h-full origin-left bg-[var(--frog-text)]" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
          </span>
        ))}
      </div>
    </div>
  );
}
