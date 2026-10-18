"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { LETTER } from "../data/journey";
import { STUDENT } from "../data/sample";
import { Reveal } from "../walkthrough/Reveal";
import { Toggle } from "../walkthrough/Toggle";

const BLANKS = LETTER.flatMap((p) => p.runs).filter((r) => r.blank).length;

/**
 * E. Write a cover letter. The sample follows the Neeley structure the app uses: why them, why you,
 * close. Reasons only the student knows are left as visible blanks. The toggle sets the reasoning
 * behind each paragraph in the margin. A fixed sample, labelled as one.
 */
export function Letter() {
  const [view, setView] = useState<"letter" | "why">("letter");
  const why = view === "why";

  return (
    <section id="letter" className="af-section af-letter" aria-labelledby="letter-title">
      <div className="af-copy af-letter-copy">
        <Reveal as="h2" className="af-h2">
          <span id="letter-title">Your reasons go here</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          If the job wants a cover letter, AGENT FROG drafts one from the same checked profile, in the structure the Neeley career center teaches.
        </Reveal>
        <Reveal as="p" order={2} className="af-lede af-lede-2">
          Why this company, and who sent you, are left blank for you to write. The letter can’t be approved until every blank is filled.
        </Reveal>
      </div>

      <Reveal order={2} className="af-demo-col af-letter-demo">
        <div className="af-letter-bar">
          <Toggle
            label="What to show"
            value={view}
            onChange={setView}
            options={[
              { id: "letter", label: "The draft" },
              { id: "why", label: "Why it's built this way" },
            ]}
          />
          <p className="af-letter-blanks">
            <span className="af-status af-status-extracted">{BLANKS} blanks to fill</span>
          </p>
        </div>

        <div className="af-letter-desk" data-why={why || undefined}>
          <article className="af-paper af-letter-sheet" aria-label="Sample cover letter">
            <p className="af-letter-name">{STUDENT.name}</p>
            <p className="af-letter-contact">555.555.5555 · horned.frogs@tcu.edu · www.linkedin.com/in/hornedfrogs</p>
            <p className="af-letter-date">October 18, 2026</p>
            <p>Lone Star Payments</p>
            <p className="af-letter-greet">Dear Hiring Committee:</p>
            {LETTER.map((part) => (
              <div key={part.id} className="af-letter-part" data-part={part.id}>
                <p className="af-letter-p">
                  {part.runs.map((r, i) =>
                    r.blank ? (
                      <mark key={i} className="af-blank">
                        <span className="af-sr-only">Blank for you to write: </span>
                        {r.text}
                      </mark>
                    ) : (
                      <span key={i}>{r.text}</span>
                    ),
                  )}
                </p>
              </div>
            ))}
            <p className="af-letter-sign">Sincerely,</p>
            <p>{STUDENT.name}</p>
          </article>

          <AnimatePresence>
            {why && (
              <motion.ol className="af-letter-notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {LETTER.map((part, i) => (
                  <motion.li key={part.id} className="af-letter-note" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: i * 0.08 }}>
                    <p className="af-letter-note-role">{part.role}</p>
                    <p>{part.note}</p>
                  </motion.li>
                ))}
              </motion.ol>
            )}
          </AnimatePresence>
        </div>
        <p className="af-demo-note">Sample draft for a fictional student and employer. It isn’t generated here.</p>
      </Reveal>
    </section>
  );
}
