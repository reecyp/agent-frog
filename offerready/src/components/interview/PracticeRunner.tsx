"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, CircleDot, Loader2, Sparkles, Timer } from "lucide-react";
import { submitAnswer } from "@/app/(app)/interview/actions";
import { useToast } from "../ui/Toast";
import { fadeRise } from "../motion";
import { DemoToggle, requestDemoAnswer } from "./DemoToggle";

interface Question {
  id: string;
  kind: string;
  text: string;
  why: string;
}

export interface AnswerView {
  id: string;
  questionId: string;
  answer: string;
  durationSeconds: number;
  rating: number | null;
  feedback: Record<string, unknown>;
  createdAt: string;
}

type Star = Record<"situation" | "task" | "action" | "result", { coverage: "strong" | "thin" | "missing"; feedback: string }>;

const THINK_SECONDS = 15;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const KIND_LABEL: Record<string, string> = { role: "Role-specific", motivation: "Why them", resume: "From your resume" };
const kindLabel = (k: string) => KIND_LABEL[k] ?? "Behavioral";

export function PracticeRunner({ sessionId, questions, answers }: { sessionId: string; questions: Question[]; answers: AnswerView[] }) {
  const [active, setActive] = useState(questions.find((q) => !answers.some((a) => a.questionId === q.id))?.id ?? questions[0]?.id);
  const index = Math.max(0, questions.findIndex((x) => x.id === active));
  const q = questions[index];
  const latest = answers.find((a) => a.questionId === active);
  const answeredCount = questions.filter((x) => answers.some((a) => a.questionId === x.id)).length;
  const go = (i: number) => setActive(questions[i].id);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Questions" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <ol className="flex flex-wrap gap-1.5">
          {questions.map((x, i) => {
            const done = answers.some((a) => a.questionId === x.id);
            const current = x.id === active;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => setActive(x.id)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`Question ${i + 1}${done ? ", answered" : ""}`}
                  title={x.text}
                  className={`relative grid size-10 place-items-center rounded-[var(--r-control)] border text-[0.875rem] font-semibold t-num transition-colors ${
                    current
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : done
                        ? "border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--line-strong)]"
                        : "border-[var(--line)] bg-[var(--bg)] text-[var(--ink-3)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                  }`}
                >
                  {i + 1}
                  {done && (
                    <span aria-hidden className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-[var(--ok)] text-[var(--on-accent)] ring-2 ring-[var(--bg)]">
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="t-meta" aria-live="polite">
          <span className="t-num">{answeredCount}</span> of <span className="t-num">{questions.length}</span> answered
        </p>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={active} {...fadeRise}>
          <Attempt key={active} sessionId={sessionId} question={q} index={index} total={questions.length} latest={latest} />
        </motion.div>
      </AnimatePresence>

      {questions.length > 1 && (
        <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--line)] pt-4">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => go(index - 1)} disabled={index === 0}>
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => go(index + 1)} disabled={index === questions.length - 1}>
            Next question <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function Attempt({ sessionId, question, index, total, latest }: { sessionId: string; question: Question; index: number; total: number; latest?: AnswerView }) {
  const toast = useToast();
  const router = useRouter();
  const [demo, setDemo] = useState(false);
  const [phase, setPhase] = useState<"idle" | "think" | "answer">("idle");
  const [count, setCount] = useState(THINK_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase !== "think") return;
    // When the countdown ends, answering starts automatically (decided in CONTEXT.md §3k).
    const t = setTimeout(() => {
      if (count <= 1) setPhase("answer");
      else setCount((c) => c - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  useEffect(() => {
    if (phase !== "answer") return;
    areaRef.current?.focus();
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="flex flex-col gap-10">
      <section aria-label={`Question ${index + 1} of ${total}`} className="panel p-5 @xl:p-6">
        <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-[var(--ink-3)]">
          <span className="t-num font-semibold text-[var(--ink-2)]">Question {index + 1} of {total}</span>
          <span className="badge badge-neutral">{kindLabel(question.kind)}</span>
        </p>
        <h2 className="mt-3 text-pretty text-[1.3125rem] font-semibold leading-snug tracking-[-0.01em]">{question.text}</h2>
        <p className="mt-2 text-[0.875rem] text-[var(--ink-2)]">{question.why}</p>
        <div className="mt-6">
          {phase === "idle" && (
            <div className="flex flex-wrap items-center gap-2">
              {demo ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await requestDemoAnswer(sessionId, question.id, false);
                      if ("error" in r) return toast(r.error, "error");
                      toast("Demo answer written and scored.", "ok");
                      router.refresh();
                    })
                  }
                >
                  {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                  {pending ? "Writing and scoring" : "Write a demo answer"}
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => { setPhase("think"); setCount(THINK_SECONDS); setElapsed(0); }}>
                    <Timer className="size-4" aria-hidden /> Start with {THINK_SECONDS} seconds to think
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => setPhase("answer")}>Answer now</button>
                </>
              )}
              <span className="ml-auto">
                <DemoToggle checked={demo} onChange={setDemo} disabled={pending} />
              </span>
            </div>
          )}
          {phase === "think" && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--r-control)] bg-[var(--bg-subtle)] px-4 py-3" role="timer" aria-live="off">
              <span className="t-num w-10 text-[2rem] font-semibold leading-none text-[var(--accent)]">{count}</span>
              <span className="min-w-0 flex-[1_1_14rem] text-[0.875rem] text-[var(--ink-2)]">Think of a specific example. Answering starts automatically.</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPhase("answer")}>Start now</button>
            </div>
          )}
          {phase === "answer" && (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await submitAnswer(sessionId, question.id, text, elapsed);
                  if (!r.ok) return toast(r.error, "error");
                  toast("Feedback is ready.", "ok");
                  setPhase("idle");
                  setText("");
                });
              }}
            >
              <div className="flex items-center justify-between">
                <label htmlFor={`a-${question.id}`} className="t-label">Your answer</label>
                <span className="t-meta t-num" aria-label={`Time so far ${fmt(elapsed)}`}>{fmt(elapsed)}</span>
              </div>
              <textarea ref={areaRef} id={`a-${question.id}`} className="input leading-relaxed" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Situation, task, what you did, and what changed." />
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn btn-primary" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Get feedback</button>
                <button type="button" className="btn btn-quiet" onClick={() => setPhase("idle")}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </section>
      {latest && <Feedback answer={latest} />}
    </div>
  );
}

const COVERAGE = {
  strong: { icon: CheckCircle2, badge: "badge-ok", label: "Strong", color: "text-[var(--ok)]" },
  thin: { icon: CircleDot, badge: "badge-caution", label: "Thin", color: "text-[var(--caution)]" },
  missing: { icon: CircleDashed, badge: "badge-neutral", label: "Missing", color: "text-[var(--ink-3)]" },
} as const;

export function Feedback({ answer, title = "Feedback on your last answer", showAnswer = true }: { answer: AnswerView; title?: string; showAnswer?: boolean }) {
  const f = answer.feedback as { demo?: boolean; rating?: number; star?: Star; specificity?: string; structure?: string; relevance?: string; clarity?: string; talkingPoints?: { text: string }[]; fillers?: Record<string, number>; generator?: string };
  const fillers = Object.entries(f.fillers ?? {});
  const rating = answer.rating;
  return (
    <motion.section {...fadeRise} aria-label="Feedback" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="t-section">{title}</h2>
          <p className="t-meta mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {f.demo && <span className="badge badge-frog"><Sparkles className="size-3" aria-hidden /> Demo answer, written by Claude</span>}
            <span>{f.generator === "claude" ? "From Claude" : "Rule-based"}, <span className="t-num">{fmt(answer.durationSeconds)}</span> {f.demo ? "to say" : "spent"}</span>
          </p>
        </div>
        {rating != null && (
          <p className="flex items-baseline gap-1.5" aria-label={`Rated ${rating} out of 5`}>
            <span className="t-num text-[2.25rem] font-semibold leading-none tracking-[-0.02em] text-[var(--accent)]">{rating.toFixed(2).replace(/\.?0+$/, "")}</span>
            <span className="text-[0.875rem] text-[var(--ink-3)]">out of 5</span>
          </p>
        )}
      </div>

      <div>
        <h3 className="t-label mb-2">STAR structure</h3>
        <ul className="list">
          {(["situation", "task", "action", "result"] as const).map((k) => {
            const s = f.star?.[k];
            const c = COVERAGE[s?.coverage ?? "missing"];
            const Icon = c.icon;
            return (
              <li key={k} className="list-row flex gap-3">
                <Icon className={`mt-0.5 size-4 shrink-0 ${c.color}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold capitalize">{k}</span>
                    <span className={`badge ${c.badge}`}>{c.label}</span>
                  </p>
                  {s?.feedback && <p className="mt-1 text-[0.875rem] text-[var(--ink-2)]">{s.feedback}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="t-label mb-2">How it came across</h3>
        <dl className="list">
          {[["Specificity", f.specificity], ["Structure", f.structure], ["Relevance", f.relevance], ["Clarity", f.clarity]].map(([k, v]) => (
            <div key={k} className="list-row grid gap-1 @xl:grid-cols-[8rem_minmax(0,1fr)] @xl:gap-4">
              <dt className="text-[0.875rem] font-semibold">{k}</dt>
              <dd className="text-[0.875rem] text-[var(--ink-2)]">{v}</dd>
            </div>
          ))}
          <div className="list-row grid gap-1 @xl:grid-cols-[8rem_minmax(0,1fr)] @xl:gap-4">
            <dt className="text-[0.875rem] font-semibold">Filler words</dt>
            <dd className="text-[0.875rem] text-[var(--ink-2)]">{fillers.length ? fillers.map(([w, n]) => `"${w}" ×${n}`).join(", ") : "None found."}</dd>
          </div>
        </dl>
      </div>

      {f.talkingPoints && f.talkingPoints.length > 0 && (
        <div className="rounded-[var(--r-panel)] bg-[var(--accent-soft)] px-5 py-4">
          <h3 className="mb-2 text-[0.875rem] font-semibold text-[var(--accent)]">Talking points from your own experience</h3>
          <ul className="grid list-disc gap-1.5 pl-5 text-[0.875rem] marker:text-[var(--accent)]">{f.talkingPoints.map((t, i) => <li key={i}>{t.text}</li>)}</ul>
        </div>
      )}
      {showAnswer && (
        <details className="text-[0.875rem]">
          <summary className="cursor-pointer font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]">{f.demo ? "The demo answer" : "Your answer"}</summary>
          <p className="measure mt-2 whitespace-pre-line leading-relaxed text-[var(--ink-2)]">{answer.answer}</p>
        </details>
      )}
    </motion.section>
  );
}
