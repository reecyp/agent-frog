"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { REVIEW_LINES, type ReviewLine } from "../data/journey";
import { Reveal } from "../walkthrough/Reveal";
import { Toggle } from "../walkthrough/Toggle";

type Decision = "pending" | "accepted" | "edited" | "removed";
interface LineState {
  decision: Decision;
  text: string;
  flagged: boolean;
  said: string;
}
const fresh = (): Record<string, LineState> => Object.fromEntries(REVIEW_LINES.map((l) => [l.id, { decision: "pending", text: l.tailored, flagged: l.verification === "needs_review", said: "" }]));

/**
 * D. Review every change. Each tailored line shows what changed, why, and where the fact came from,
 * with the same actions the app's proof sheet has: Accept (or "It's accurate" for a flagged line),
 * Edit, Remove and Restore. The flagged line is the app's real ownership check. Demo state only.
 */
export function Review() {
  const [lines, setLines] = useState(fresh);
  const set = (id: string, patch: Partial<LineState>) => setLines((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
  const decided = Object.values(lines).filter((l) => l.decision !== "pending").length;

  return (
    <section id="review" className="af-section af-review" aria-labelledby="review-title">
      <Reveal order={2} className="af-demo-col af-review-demo">
        <div className="af-review-head">
          <p className="af-count" role="status" aria-live="polite">
            <span className="af-count-num">{decided}</span> of {REVIEW_LINES.length} changes decided
          </p>
          <button type="button" className="af-btn af-btn-quiet af-btn-sm" onClick={() => setLines(fresh())} disabled={decided === 0 && Object.values(lines).every((l, i) => l.text === REVIEW_LINES[i].tailored)}>
            Start over
          </button>
        </div>
        <ol className="af-review-list">
          {REVIEW_LINES.map((l) => (
            <ReviewCard key={l.id} line={l} state={lines[l.id]} onSet={(p) => set(l.id, p)} />
          ))}
        </ol>
        <p className="af-demo-note">Sample lines for a fictional student. Your choices change this page only; no resume is updated.</p>
      </Reveal>

      <div className="af-copy af-review-copy">
        <Reveal as="h2" className="af-h2">
          <span id="review-title">You decide every line</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          Every changed line comes with your original wording, the requirement it answers and the fact it rests on. You accept it, edit it or take it out.
        </Reveal>
        <Reveal as="p" order={2} className="af-lede af-lede-2">
          When a line says more than your source does, it’s flagged until you decide. A resume can’t be approved while a flag is open.
        </Reveal>
      </div>
    </section>
  );
}

function verdict(line: ReviewLine, s: LineState) {
  if (s.decision === "removed") return { label: "Removed from this version", cls: "af-status-removed" };
  if (s.flagged) return { label: "Needs your confirmation", cls: "af-status-extracted" };
  if (line.verification === "needs_review" && s.decision === "accepted") return { label: "Confirmed by you", cls: "af-status-edited" };
  return { label: "Backed by your evidence", cls: "af-status-confirmed" };
}

function ReviewCard({ line, state, onSet }: { line: ReviewLine; state: LineState; onSet: (p: Partial<LineState>) => void }) {
  const [view, setView] = useState<"tailored" | "original">("tailored");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.text);
  const inputId = useId();
  const editBtn = useRef<HTMLButtonElement>(null);
  const v = verdict(line, state);
  const removed = state.decision === "removed";

  const back = () => requestAnimationFrame(() => editBtn.current?.focus());
  const save = () => {
    const text = draft.trim();
    if (!text) return;
    // Re-check after an edit, as the app does: going back to the original's ownership clears the flag.
    const flagged = line.verification === "needs_review" && !/^assisted/i.test(text) && text !== line.original;
    onSet({ text, decision: "edited", flagged, said: flagged ? "Saved, but it still claims more than your source." : "Edit saved and re-checked." });
    setEditing(false);
    back();
  };

  return (
    <li className="af-review-card af-panel" data-ui data-decision={state.decision} data-flagged={(state.flagged && !removed) || undefined}>
      <div className="af-review-bar">
        <span className={`af-status ${v.cls}`}>{v.label}</span>
        <span className="af-review-change">{state.decision === "edited" ? "Edited by you" : line.change}</span>
      </div>

      <div className="af-review-body">
        {!editing && !removed && (
          <Toggle
            label="Which version to show"
            value={view}
            onChange={setView}
            options={[
              { id: "tailored", label: "Tailored" },
              { id: "original", label: "Your original" },
            ]}
          />
        )}

        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <motion.div key="edit" className="af-fact-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <label htmlFor={inputId} className="af-review-label">
                Edit this line
              </label>
              <textarea id={inputId} name="review-line" autoComplete="off" className="af-input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Escape" && (setEditing(false), back())} />
              <div className="af-fact-actions">
                <button type="button" className="af-btn af-btn-sm" onClick={save} disabled={!draft.trim()}>
                  Save
                </button>
                <button type="button" className="af-btn af-btn-sm af-btn-quiet" onClick={() => (setEditing(false), back())}>
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.p key={view + state.text} className="af-review-text" data-removed={removed || undefined} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {view === "original" && !removed ? line.original : state.text}
            </motion.p>
          )}
        </AnimatePresence>

        {state.flagged && !removed && line.issue && <p className="af-review-issue">{line.issue} Your original says “Assisted with”.</p>}

        <dl className="af-review-dl">
          <div>
            <dt>Why</dt>
            <dd>
              <q>{line.why}</q> <span className="af-fact-source">(the posting)</span>
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{line.source}</dd>
          </div>
        </dl>
      </div>

      {!editing && (
        <div className="af-review-actions">
          <p className="af-review-said" role="status" aria-live="polite">
            {state.said}
          </p>
          {removed ? (
            <button type="button" className="af-btn af-btn-sm af-btn-quiet" onClick={() => onSet({ decision: "pending", said: "Restored." })}>
              Restore
            </button>
          ) : (
            <>
              {state.decision === "pending" && (
                <button
                  type="button"
                  className="af-btn af-btn-sm"
                  onClick={() => onSet({ decision: "accepted", flagged: false, said: state.flagged ? "Confirmed. Logged as your decision." : "Accepted." })}
                >
                  {state.flagged ? "It's accurate" : "Accept"}
                </button>
              )}
              <button
                ref={editBtn}
                type="button"
                className="af-btn af-btn-sm af-btn-quiet"
                onClick={() => {
                  setDraft(state.text);
                  setEditing(true);
                }}
              >
                Edit
              </button>
              <button type="button" className="af-btn af-btn-sm af-btn-quiet" onClick={() => onSet({ decision: "removed", said: "Removed from this version." })}>
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
