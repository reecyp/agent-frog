"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { PROFILE_QUESTION } from "../data/journey";
import { Reveal } from "../walkthrough/Reveal";

type Outcome = { kind: "saved"; text: string } | { kind: "declined" } | null;

/**
 * I. My Profile and source materials. The profile keeps asking short questions about gaps it finds;
 * a saved answer becomes evidence future drafts can use, "I haven't done this" keeps it off. Same
 * buttons and messages as the app's answer form. Demo state only.
 */
export function Sources() {
  const [text, setText] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const fieldId = useId();

  return (
    <section id="sources" className="af-section af-sources" aria-labelledby="sources-title">
      <div className="af-copy af-sources-copy">
        <Reveal as="h2" className="af-h2">
          <span id="sources-title">Keep it current</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          New job, new club role, a better number: add it to your profile or replace your resume, and every application from then on starts from the update.
        </Reveal>
        <Reveal as="p" order={2} className="af-lede af-lede-2">
          The profile also asks about gaps it notices. Answer in your own words, or say you haven’t done it and nothing is added.
        </Reveal>
      </div>

      <Reveal order={2} className="af-demo-col af-sources-demo">
        <div className="af-panel af-ask" data-ui>
          <p className="af-fact-source">{PROFILE_QUESTION.context}</p>
          <AnimatePresence mode="wait" initial={false}>
            {outcome === null ? (
              <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <label htmlFor={fieldId} className="af-ask-q">
                  {PROFILE_QUESTION.question}
                </label>
                <p className="af-ask-why">{PROFILE_QUESTION.why}</p>
                <textarea id={fieldId} name="profile-answer" autoComplete="off" className="af-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="One or two sentences, in your own words." />
                <div className="af-fact-actions">
                  <button type="button" className="af-btn af-btn-sm" disabled={!text.trim()} onClick={() => setOutcome({ kind: "saved", text: text.trim() })}>
                    Save answer
                  </button>
                  <button type="button" className="af-btn af-btn-sm af-btn-quiet" onClick={() => setOutcome({ kind: "declined" })}>
                    I haven’t done this
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <p className="af-ask-q">{PROFILE_QUESTION.question}</p>
                {outcome.kind === "saved" ? (
                  <div className="af-ask-answer">
                    <p className="af-fact-text">{outcome.text}</p>
                    <div className="af-fact-meta">
                      <span className="af-status af-status-confirmed">Confirmed</span>
                      <span className="af-fact-source">Your answer</span>
                    </div>
                  </div>
                ) : (
                  <p className="af-ask-answer af-fact-text">No outcome to add.</p>
                )}
                <div className="af-fact-actions">
                  <button type="button" className="af-btn af-btn-sm af-btn-quiet" onClick={() => setOutcome(null)}>
                    Change
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <p className="af-review-said" role="status" aria-live="polite">
            {outcome?.kind === "saved" ? "Saved to the sample profile as something you confirmed." : outcome?.kind === "declined" ? "Noted. This stays off your materials." : ""}
          </p>
        </div>

        <ul className="af-sources-files" aria-label="Sample source files">
          <li>
            <span className="af-slot-label">Jordan_Reyes_Resume.pdf</span>
            <span className="af-slot-hint">Resume, added Sept 2</span>
          </li>
          <li>
            <span className="af-slot-label">Profile.pdf</span>
            <span className="af-slot-hint">LinkedIn, added Sept 2</span>
          </li>
        </ul>
        <p className="af-demo-note">A sample question for a fictional student. Your answer stays on this page.</p>
      </Reveal>
    </section>
  );
}
