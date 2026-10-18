"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square, X } from "lucide-react";
import { discardAnswers } from "@/app/(app)/interview/actions";
import { MicCheck, savedMicId } from "./MicCheck";
import { DemoToggle, requestDemoAnswer } from "./DemoToggle";

interface Question {
  id: string;
  text: string;
}

type Upload = "pending" | "done" | { error: string };

const THINK_SECONDS = 15;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Spoken practice. A full-screen overlay shows only the question and a timer: thinking time, then
 * recording until Stop. Each answer uploads in the background while the next question starts;
 * feedback appears on the page once every answer is processed. Exiting part-way scraps the whole run.
 * Checking "Demo answer" on a question moves straight to the next one: Claude answers it in the
 * background (dropping anything recorded so far), and it's scored the same way and labeled as a demo.
 */
export function VoiceSession({ sessionId, questions }: { sessionId: string; questions: Question[] }) {
  const router = useRouter();
  const [stage, setStage] = useState<"closed" | "think" | "record">("closed");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(THINK_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const [error, setError] = useState<string | null>(null);
  const [micId, setMicId] = useState(savedMicId);
  const [demo, setDemo] = useState<Set<string>>(() => new Set());
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  // The run in progress; null once it ends or is exited. Answers saved for a run are tracked so an exit can delete them.
  const run = useRef<string | null>(null);
  const saved = useRef<string[]>([]);
  const question = questions[index];

  const release = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  /** Follows one answer (a recording or a demo) until it's saved, scrapping it if the run was exited meanwhile. */
  const track = useCallback(
    async (runId: string, questionId: string, work: Promise<{ id: string } | { error: string }>) => {
      setUploads((u) => ({ ...u, [questionId]: "pending" }));
      const result = await work;
      if ("id" in result && run.current !== runId) {
        // The student exited while this answer was processing: scrap it too.
        await discardAnswers(sessionId, [result.id]);
        return;
      }
      if ("id" in result) saved.current.push(result.id);
      if (run.current !== runId) return;
      setUploads((u) => ({ ...u, [questionId]: "id" in result ? "done" : { error: result.error } }));
    },
    [sessionId],
  );

  const upload = useCallback(
    (runId: string, questionId: string, audio: Blob, seconds: number) => {
      const form = new FormData();
      form.set("audio", audio);
      form.set("sessionId", sessionId);
      form.set("questionId", questionId);
      form.set("durationSeconds", String(seconds));
      const work = fetch("/api/interview/answer", { method: "POST", body: form })
        .then(async (res) => {
          const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
          return body.id ? { id: body.id } : { error: body.error ?? "Couldn't process this answer." };
        })
        .catch(() => ({ error: "Couldn't upload this answer. Check your connection." }));
      return track(runId, questionId, work);
    },
    [sessionId, track],
  );

  const begin = async () => {
    setError(null);
    try {
      // Asked once, up front, so the browser's permission prompt never interrupts a question.
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: micId && micId !== "default" ? { deviceId: { exact: micId } } : true });
    } catch {
      setError("AGENT FROG needs your microphone for spoken practice. Allow it in your browser's site settings and try again.");
      return;
    }
    run.current = crypto.randomUUID();
    saved.current = [];
    setUploads({});
    setDemo(new Set());
    setIndex(0);
    setCount(THINK_SECONDS);
    setStage("think");
  };

  const record = useCallback((questionId: string) => {
    const runId = run.current;
    if (!stream.current || !runId) return;
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream.current);
    const began = Date.now();
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      if (run.current === runId) upload(runId, questionId, new Blob(chunks, { type: r.mimeType }), Math.round((Date.now() - began) / 1000));
    };
    recorder.current = r;
    startedAt.current = began;
    r.start();
    setElapsed(0);
    setStage("record");
  }, [upload]);

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setCount(THINK_SECONDS);
      setStage("think");
    } else {
      release();
      setStage("closed");
    }
  };

  const stop = () => {
    const r = recorder.current;
    if (!r) return;
    r.stop();
    recorder.current = null;
    next();
  };

  /** Hands this question to Claude and moves on. Anything recorded for it so far is dropped, not uploaded. */
  const answerWithDemo = () => {
    const runId = run.current;
    if (!runId || !question) return;
    const r = recorder.current;
    if (r) {
      r.onstop = null;
      r.stop();
      recorder.current = null;
    }
    setDemo((d) => new Set(d).add(question.id));
    track(runId, question.id, requestDemoAnswer(sessionId, question.id, true));
    next();
  };

  const exit = useCallback(() => {
    run.current = null;
    recorder.current?.stop();
    recorder.current = null;
    release();
    const ids = saved.current;
    saved.current = [];
    if (ids.length) discardAnswers(sessionId, ids);
    setUploads({});
    setStage("closed");
  }, [sessionId]);

  // Thinking countdown; recording starts on its own at zero.
  useEffect(() => {
    if (stage !== "think") return;
    if (count === 0) {
      record(question.id);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, count, record, question]);

  useEffect(() => {
    if (stage !== "record") return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    if (stage === "closed") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && exit();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, exit]);

  useEffect(() => () => release(), []);

  // Once every answer is processed, reload the page so the server-rendered feedback appears.
  const states = Object.values(uploads);
  const processing = states.filter((s) => s === "pending").length;
  const failed = Object.entries(uploads).filter((e): e is [string, { error: string }] => typeof e[1] === "object");
  useEffect(() => {
    if (states.length && processing === 0 && stage === "closed") router.refresh();
  }, [states.length, processing, stage, router]);

  return (
    <>
      <section aria-label="Spoken practice" className="panel flex flex-col gap-4 p-5 @xl:p-6">
        <div>
          <h2 className="t-card">Spoken practice</h2>
          <p className="mt-1 text-[0.875rem] text-[var(--ink-2)]"><span className="t-num">{questions.length}</span> questions, one at a time, full screen.</p>
        </div>
        <MicCheck value={micId} onChange={setMicId} active={stage !== "closed"} />
        <div className="rule" />
        <button type="button" className="btn btn-primary self-start" onClick={begin} disabled={processing > 0}>
          <Mic className="size-4" aria-hidden /> Begin spoken practice
        </button>
        <p className="t-meta measure">Each question gives you {THINK_SECONDS} seconds to think, then records until you press stop. Exit with the close button (or Escape) to scrap the run. Check Demo answer on any question to have Claude answer it and move on. Feedback appears here after the last question.</p>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        {processing > 0 && stage === "closed" && (
          <p role="status" className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" aria-hidden /> {demo.size ? "Writing demo answers and scoring" : "Transcribing and scoring your answers"}: {states.length - processing} of {states.length} ready.
          </p>
        )}
        {failed.map(([qid, f]) => (
          <p key={qid} className="text-sm text-[var(--caution)]">Question {questions.findIndex((q) => q.id === qid) + 1}: {f.error}</p>
        ))}
      </section>

      {stage !== "closed" && question && (
        <div role="dialog" aria-modal="true" aria-label={`Question ${index + 1} of ${questions.length}`} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-[var(--bg)] px-6">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 px-4 py-3">
            <button type="button" onClick={exit} aria-label="Exit practice without saving" className="grid size-11 place-items-center rounded-full text-[var(--ink-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]">
              <X className="size-5" aria-hidden />
            </button>
            <div className="flex items-center gap-3">
              <span className="t-num text-[0.8125rem] font-semibold text-[var(--ink-2)]">Question {index + 1} of {questions.length}</span>
              <span aria-hidden className="flex gap-1">
                {questions.map((q, i) => (
                  <span key={q.id} className={`h-1.5 w-6 rounded-full ${i < index ? "bg-[var(--accent)]" : i === index ? "bg-[var(--accent)] opacity-50" : "bg-[var(--bg-muted)]"}`} />
                ))}
              </span>
            </div>
            <span className="size-11" aria-hidden />
          </div>
          <p className="max-w-[40rem] text-balance text-center text-[clamp(1.375rem,4vw,1.875rem)] font-semibold leading-snug tracking-[-0.015em]">{question.text}</p>
          {stage === "think" ? (
            <div className="flex flex-col items-center gap-4">
              <span role="timer" className="t-num text-[3rem] font-semibold leading-none text-[var(--accent)]">{count}</span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => record(question.id)}>Skip countdown</button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 t-num text-[1.125rem] text-[var(--ink-2)]" role="timer">
                <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-[var(--danger)]" /> {fmt(elapsed)}
              </span>
              <button type="button" onClick={stop} aria-label={index + 1 < questions.length ? "Stop and go to the next question" : "Stop and finish"} className="grid size-14 place-items-center rounded-full bg-[var(--danger)] text-[var(--on-accent)] hover:opacity-90">
                <Square className="size-5 fill-current" aria-hidden />
              </button>
            </div>
          )}
          <DemoToggle checked={false} onChange={(on) => on && answerWithDemo()} />
        </div>
      )}
    </>
  );
}
