"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { EXPORT_CHECKS, JOBS } from "../data/journey";
import { STUDENT } from "../data/sample";
import { Reveal } from "../walkthrough/Reveal";
import { Toggle } from "../walkthrough/Toggle";

const job = JOBS[0];

/**
 * F. Final review and export. The approved resume as it prints and as an applicant tracking system
 * reads it (the app reads its own PDF back to check the text order). The checks list uses the app's
 * wording. Download is a preview here: pressing it says so, and no file or success message appears.
 */
export function Export() {
  const [view, setView] = useState<"print" | "ats">("print");
  const [asked, setAsked] = useState(false);

  return (
    <section id="export" className="af-section af-export" aria-labelledby="export-title">
      <Reveal order={2} className="af-demo-col af-export-demo">
        <div className="af-export-bar">
          <Toggle
            label="How to view the resume"
            value={view}
            onChange={setView}
            options={[
              { id: "print", label: "As printed" },
              { id: "ats", label: "As a screening system reads it" },
            ]}
          />
        </div>
        <div className="af-export-sheet">
          <AnimatePresence mode="wait" initial={false}>
            {view === "print" ? (
              <motion.div key="print" className="af-paper af-final" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <p className="af-resume-name">{STUDENT.name}</p>
                <p className="af-resume-contact">{STUDENT.city} · horned.frogs@tcu.edu · 555.555.5555</p>
                <p className="af-resume-h">Education</p>
                <p>
                  <strong>{STUDENT.school}</strong>
                </p>
                <p>
                  {STUDENT.degree} · {STUDENT.graduation} · GPA {STUDENT.gpa}
                </p>
                <p className="af-resume-h">Experience</p>
                {job.lines.map((l, i) => (
                  <div key={l.id}>
                    {(i === 0 || job.lines[i - 1].org !== l.org) && <p className="af-resume-strong">{l.org}</p>}
                    <ul>
                      <li>{l.text}</li>
                    </ul>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.pre key="ats" className="af-ats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {[
                  STUDENT.name,
                  `${STUDENT.city} | horned.frogs@tcu.edu | 555.555.5555`,
                  "",
                  "EDUCATION",
                  STUDENT.school,
                  `${STUDENT.degree} | ${STUDENT.graduation} | GPA ${STUDENT.gpa}`,
                  "",
                  "EXPERIENCE",
                  ...job.lines.flatMap((l, i) => [...(i === 0 || job.lines[i - 1].org !== l.org ? [l.org] : []), `• ${l.text}`]),
                ].join("\n")}
              </motion.pre>
            )}
          </AnimatePresence>
        </div>
        <p className="af-demo-note">Preview only. This demo doesn’t make files.</p>
      </Reveal>

      <div className="af-copy af-export-copy">
        <Reveal as="h2" className="af-h2">
          <span id="export-title">Read it before you send it</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          You approve the final version yourself. The PDF is rendered from the text you approved, on the Neeley template, as real text a screening system can read.
        </Reveal>
        <Reveal order={2} className="af-checks">
          <ul aria-label="Checks before download">
            {EXPORT_CHECKS.map((c) => (
              <li key={c.id} className="af-check" data-ok={c.ok || undefined}>
                <span className={`af-status ${c.ok ? "af-status-confirmed" : "af-status-extracted"}`}>{c.ok ? "Passed" : "Not yet"}</span>
                <span>
                  <span className="af-check-label">{c.label}</span>
                  <span className="af-check-detail">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="af-export-files">
            <div className="af-export-file">
              <span>
                <span className="af-slot-label">Resume</span>
                <span className="af-slot-hint">Approved in this example</span>
              </span>
              <button type="button" className="af-btn af-btn-sm" onClick={() => setAsked(true)} aria-describedby="export-said">
                Download PDF
              </button>
            </div>
            <div className="af-export-file">
              <span>
                <span className="af-slot-label">Cover letter</span>
                <span className="af-slot-hint">Not approved yet: blanks left</span>
              </span>
              <a className="af-btn af-btn-sm af-btn-quiet" href="#letter">
                Review and approve first
              </a>
            </div>
            <p id="export-said" className="af-review-said" role="status" aria-live="polite">
              {asked ? "This is a preview, so nothing was downloaded. In AGENT FROG this button saves the approved PDF." : ""}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
