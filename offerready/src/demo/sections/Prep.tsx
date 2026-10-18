"use client";

import { motion } from "motion/react";
import { useId, useState } from "react";
import { QUESTIONS, SAMPLE_ANSWER } from "../data/journey";
import { Reveal } from "../walkthrough/Reveal";

/* The app's typed-answer check (offerready/src/domain/interview.ts, ruleFeedback), copied so the demo
   stays separate. It reads only the words typed; it never claims to have heard tone or pace. */
const SIGNALS = {
  situation: /\b(when i was|while (i was )?working|at my|during|last (summer|year|semester)|in my role|as (a|the) |our (team|club|company))\b/i,
  task: /\b(needed to|had to|was asked|my (job|goal|task|role) was|responsible for|the problem|challenge|deadline)\b/i,
  action: /\b(i (built|created|led|organized|analyzed|researched|wrote|set up|designed|reached out|met|scheduled|decided|proposed|trained|reconciled|tracked|managed|asked|started|changed))\b/i,
  result: /\b(as a result|which (led|meant|cut|saved|helped)|so that|in the end|resulted|ended up|reduced|increased|improved|saved|grew|cutting|the outcome)\b/i,
};
const TIPS: Record<keyof typeof SIGNALS, string> = {
  situation: "Set the scene in one sentence: where you were and what was going on.",
  task: "Say what you specifically needed to accomplish.",
  action: "Use “I” and name the concrete steps you took.",
  result: "End with what changed, using a real number if you have one.",
};
const PARTS = [
  { k: "situation", label: "Situation" },
  { k: "task", label: "Task" },
  { k: "action", label: "Action" },
  { k: "result", label: "Result" },
] as const;
type Coverage = "strong" | "thin" | "missing";
const COVERAGE: Record<Coverage, { label: string; cls: string }> = {
  strong: { label: "Strong", cls: "af-status-confirmed" },
  thin: { label: "Thin", cls: "af-status-extracted" },
  missing: { label: "Missing", cls: "af-status-missing" },
};

function check(answer: string) {
  return PARTS.map(({ k, label }) => {
    let coverage: Coverage = SIGNALS[k].test(answer) ? "strong" : "missing";
    let tip = coverage === "strong" ? "Covered." : TIPS[k];
    if (k === "result" && coverage === "strong" && !/\d/.test(answer)) {
      coverage = "thin";
      tip = "You described a result; a real number would make it stick.";
    }
    return { k, label, coverage, tip };
  });
}

/**
 * G. Prepare. Interview practice with the app's own question kinds and its typed-answer STAR check,
 * run live in the browser on whatever is typed. Networking is described in a sentence, not demoed:
 * its alumni directory is private.
 */
export function Prep() {
  const [qId, setQId] = useState<string>(QUESTIONS[0].id);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ReturnType<typeof check> | null>(null);
  const fieldId = useId();
  const words = answer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <section id="prep" className="af-section af-prep" aria-labelledby="prep-title">
      <div className="af-copy af-prep-copy">
        <Reveal as="h2" className="af-h2">
          <span id="prep-title">Practice the interview</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          Questions come from the posting and from your own resume. Answer out loud or by typing, and the feedback checks your story for its four parts: situation, task, action and result.
        </Reveal>
        <Reveal as="p" order={2} className="af-lede af-lede-2">
          For conversations before the interview, Network lets you search TCU alumni by role or employer, keep notes on each one and draft an outreach message with blanks only you can fill.
        </Reveal>
      </div>

      <Reveal order={2} className="af-demo-col af-prep-demo">
        <div className="af-panel af-prep-panel" data-ui>
          <fieldset className="af-questions">
            <legend className="af-review-label">Pick a question</legend>
            {QUESTIONS.map((q) => (
              <label key={q.id} className="af-question" data-on={q.id === qId || undefined}>
                <input
                  type="radio"
                  name="af-question"
                  className="af-sr-only"
                  checked={q.id === qId}
                  onChange={() => {
                    setQId(q.id);
                    setResult(null);
                  }}
                />
                <span className="af-question-focus">{q.focus}</span>
                <span className="af-question-text">{q.text}</span>
              </label>
            ))}
          </fieldset>

          <div className="af-answer-col">
            <div className="af-answer">
              <label htmlFor={fieldId} className="af-review-label">
                Your answer
              </label>
              <textarea
                id={fieldId}
                className="af-input"
                rows={6}
                value={answer}
                name="practice-answer"
                autoComplete="off"
                placeholder="During my internship at…"
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setResult(null);
                }}
              />
              <div className="af-answer-actions">
                <span className="af-fact-source">{words} words</span>
                <button
                  type="button"
                  className="af-btn af-btn-sm af-btn-quiet"
                  onClick={() => {
                    setAnswer(SAMPLE_ANSWER);
                    setResult(null);
                  }}
                >
                  Use a sample answer
                </button>
                <button type="button" className="af-btn af-btn-sm" disabled={words < 5} onClick={() => setResult(check(answer))}>
                  Check my answer
                </button>
              </div>
            </div>

            <div className="af-star" role="status" aria-live="polite">
              {result ? (
                <ul aria-label="Feedback on your answer">
                  {result.map((r, i) => (
                    <motion.li key={r.k} className="af-star-part" data-coverage={r.coverage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}>
                      <span className="af-star-name">{r.label}</span>
                      <span className={`af-status ${COVERAGE[r.coverage].cls}`}>{COVERAGE[r.coverage].label}</span>
                      <span className="af-star-tip">{r.tip}</span>
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="af-readlog-empty">Feedback appears here. It reads your words only, never your tone.</p>
              )}
            </div>
          </div>
        </div>
        <p className="af-demo-note">Runs in your browser with the app’s simple typed-answer check. Nothing you type is saved or sent.</p>
      </Reveal>
    </section>
  );
}
