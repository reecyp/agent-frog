"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { COVERAGE_LABEL, JOBS, type Job } from "../data/journey";
import { STUDENT } from "../data/sample";
import { Reveal } from "../walkthrough/Reveal";

const settle = [0.16, 1, 0.3, 1] as const;

/**
 * C. Tailor an application. Pick one of two fictional postings; its requirements are checked against
 * the profile and the resume lines reorder to match. Choosing a requirement shows the line it pulled
 * up, or says plainly that nothing matched. A fixed, predefined example: nothing is generated here.
 */
export function Tailor() {
  const [jobId, setJobId] = useState(JOBS[0].id);
  const job = JOBS.find((j) => j.id === jobId) ?? JOBS[0];
  const [reqId, setReqId] = useState(job.requirements[0].id);
  const req = job.requirements.find((r) => r.id === reqId) ?? job.requirements[0];

  const pick = (j: Job) => {
    setJobId(j.id);
    setReqId(j.requirements[0].id);
  };

  return (
    <section id="tailor" className="af-section af-tailor" aria-labelledby="tailor-title">
      <div className="af-copy af-tailor-copy">
        <Reveal as="h2" className="af-h2">
          <span id="tailor-title">Fit it to one job</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          Choose a posting and AGENT FROG reads what it asks for, checks each requirement against your profile and builds a resume that leads with your most relevant work.
        </Reveal>
        <Reveal as="p" order={2} className="af-lede af-lede-2">
          Where your profile has nothing to match, it says so instead of filling the gap.
        </Reveal>
      </div>

      <Reveal order={2} className="af-demo-col af-tailor-demo">
        <fieldset className="af-jobs">
          <legend className="af-sr-only">Choose a sample posting</legend>
          {JOBS.map((j) => (
            <label key={j.id} className="af-job" data-on={j.id === jobId || undefined}>
              <input type="radio" name="af-job" value={j.id} checked={j.id === jobId} onChange={() => pick(j)} className="af-sr-only" />
              <span className="af-job-title">{j.title}</span>
              <span className="af-job-co">{j.company}</span>
            </label>
          ))}
        </fieldset>

        <div className="af-tailor-grid">
          <div className="af-posting af-panel" data-ui>
            <p className="af-posting-place">{job.place}</p>
            <p className="af-posting-summary">{job.summary}</p>
            <p className="af-posting-h" id="tailor-reqs">
              What the posting asks for
            </p>
            <ul className="af-reqs" aria-labelledby="tailor-reqs">
              {job.requirements.map((r) => (
                <li key={`${job.id}-${r.id}`}>
                  <button type="button" className="af-req" aria-pressed={r.id === req.id} onClick={() => setReqId(r.id)}>
                    <span className="af-req-quote">{r.quote}</span>
                    <span className={`af-status af-cov-${r.coverage}`}>{COVERAGE_LABEL[r.coverage]}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="af-req-gap" role="status" aria-live="polite">
              {req.gap ?? (req.lineId ? "The highlighted line on the resume answers this." : "")}
            </p>
          </div>

          <div className="af-tailor-sheet">
            <div className="af-paper af-tailored">
              <p className="af-resume-name">{STUDENT.name}</p>
              <p className="af-resume-h">Experience</p>
              <ul className="af-tailored-lines">
                <AnimatePresence initial={false}>
                  {job.lines.map((l) => (
                    <motion.li
                      key={`${l.id}`}
                      layout="position"
                      transition={{ duration: 0.5, ease: settle }}
                      className="af-tailored-line"
                      data-hot={req.lineId === l.id || undefined}
                    >
                      <span className="af-tailored-org">{l.org}</span>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={l.text} className="af-tailored-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                          {l.text}
                        </motion.span>
                      </AnimatePresence>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
            <ul className="af-change-key" aria-label="What changed on this resume">
              {job.lines.map((l) => (
                <li key={l.id} data-hot={req.lineId === l.id || undefined}>
                  <span className="af-change-org">{l.org}:</span> {l.change.toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="af-demo-note">A predefined example for a fictional student and fictional employers. Nothing is generated or sent.</p>
      </Reveal>
    </section>
  );
}
