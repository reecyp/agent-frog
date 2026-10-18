"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { RESUME_LINES, SOURCE_FILES, STUDENT } from "../data/sample";
import { Reveal } from "../walkthrough/Reveal";

type Slot = keyof typeof SOURCE_FILES;
const settle = [0.16, 1, 0.3, 1] as const;

/**
 * A. Your career materials. A cutting table with two slots: the resume (required) and a LinkedIn PDF
 * (optional), as in the real app. Adding a sample lays the sheet in its slot and lists what was read;
 * every read fact starts unchecked, which Section B picks up. No files are touched.
 */
export function Materials() {
  const [added, setAdded] = useState<Record<Slot, boolean>>({ resume: false, linkedin: false });
  const toggle = (slot: Slot) => setAdded((a) => ({ ...a, [slot]: !a[slot] }));

  return (
    <section id="materials" className="af-section af-materials" aria-labelledby="materials-title">
      <div className="af-materials-copy">
        <Reveal as="h2" className="af-h2">
          <span id="materials-title">Bring the resume you have</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          Add your resume, and your LinkedIn profile saved as a PDF if you like. AGENT FROG reads them once and builds the profile every application is tailored from.
        </Reveal>
        <Reveal order={2} className="af-facts">
          <p>PDF, Word or plain text, up to 5 MB.</p>
          <p>Nothing it reads is used until you’ve checked it.</p>
        </Reveal>
      </div>

      <Reveal order={2} className="af-table">
        <div className="af-slots">
          <DocSlot slot="resume" label="Resume" hint="Required" added={added.resume} onToggle={() => toggle("resume")} />
          <DocSlot slot="linkedin" label="LinkedIn profile" hint="Optional" added={added.linkedin} onToggle={() => toggle("linkedin")} />
        </div>
        <ReadLog added={added} />
        <p className="af-demo-note">Simulated with sample files for a fictional student. Nothing is uploaded or saved.</p>
      </Reveal>
    </section>
  );
}

function DocSlot({ slot, label, hint, added, onToggle }: { slot: Slot; label: string; hint: string; added: boolean; onToggle: () => void }) {
  const file = SOURCE_FILES[slot];
  return (
    <div className={`af-slot af-slot-${slot}`} data-filled={added || undefined}>
      <div className="af-slot-bed" aria-hidden>
        <AnimatePresence initial={false}>
          {added && (
            <motion.div
              key="sheet"
              className="af-sheet-wrap"
              initial={{ opacity: 0, y: -36, rotate: slot === "resume" ? -4 : 3 }}
              animate={{ opacity: 1, y: 0, rotate: slot === "resume" ? -1.2 : 1.4 }}
              exit={{ opacity: 0, y: -24, transition: { duration: 0.2 } }}
              transition={{ duration: 0.55, ease: settle }}
            >
              {slot === "resume" ? <ResumeSheet /> : <LinkedInSheet />}
            </motion.div>
          )}
        </AnimatePresence>
        {!added && <span className="af-slot-empty">{slot === "resume" ? "Your resume goes here" : "Your LinkedIn PDF goes here"}</span>}
      </div>
      <div className="af-slot-foot">
        <div className="af-slot-name">
          <span className="af-slot-label">{label}</span>
          <span className="af-slot-hint">{added ? `${file.name}, ${file.pages} ${file.pages === 1 ? "page" : "pages"}` : hint}</span>
        </div>
        <button type="button" className={added ? "af-btn af-btn-quiet" : "af-btn"} onClick={onToggle} aria-pressed={added}>
          {added ? "Remove" : "Add sample"}
        </button>
      </div>
    </div>
  );
}

function ReadLog({ added }: { added: Record<Slot, boolean> }) {
  const lines = (Object.keys(added) as Slot[]).filter((s) => added[s]);
  return (
    <div className="af-readlog" role="status" aria-live="polite">
      {lines.length === 0 ? (
        <p className="af-readlog-empty">Add a sample file to see what AGENT FROG reads from it.</p>
      ) : (
        <ul>
          {lines.map((s) => (
            <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: settle }}>
              <span className="af-readlog-file">{SOURCE_FILES[s].name}</span> read: {SOURCE_FILES[s].read.join(", ")}.{" "}
              <span className="af-status af-status-extracted">Not checked yet</span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The sample resume, set like the Neeley template on light paper (documents are never themed). */
function ResumeSheet() {
  return (
    <div className="af-paper af-resume">
      <p className="af-resume-name">{STUDENT.name}</p>
      <p className="af-resume-contact">{STUDENT.city} · horned.frogs@tcu.edu · 555.555.5555</p>
      <p className="af-resume-h">Education</p>
      {RESUME_LINES.education.map((l) => (
        <p key={l} className="af-resume-line">{l}</p>
      ))}
      <p className="af-resume-h">Experience</p>
      {RESUME_LINES.experience.map((e) => (
        <div key={e.head}>
          <p className="af-resume-line af-resume-strong">{e.head}</p>
          <p className="af-resume-line af-resume-em">{e.sub}</p>
          <ul>
            {e.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LinkedInSheet() {
  return (
    <div className="af-paper af-linkedin">
      <p className="af-resume-name">{STUDENT.name}</p>
      <p className="af-resume-contact">Finance student at TCU Neeley</p>
      <p className="af-resume-h">Experience</p>
      <p className="af-resume-line af-resume-strong">Brazos Ridge Wealth Advisors</p>
      <p className="af-resume-line">Financial Analyst Intern</p>
      <p className="af-resume-line af-resume-strong">TCU Campus Recreation</p>
      <p className="af-resume-line">Facility Supervisor</p>
      <p className="af-resume-h">Languages</p>
      <p className="af-resume-line">Spanish</p>
    </div>
  );
}
