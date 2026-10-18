"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { APPLICATIONS, STATUSES, type Status } from "../data/journey";
import { Reveal } from "../walkthrough/Reveal";

const ACTIVE: Status[] = ["Interested", "Saved", "Preparing", "Ready to apply", "Applied", "Interviewing", "Offer received"];

/**
 * H. My Applications. Three fictional applications with the app's real status list. Marking one
 * Applied adds the same 7-day follow-up reminder the app adds. No charts, no metrics. Demo state only.
 */
export function Applications() {
  const [apps, setApps] = useState(APPLICATIONS);
  const [reminders, setReminders] = useState<string[]>([]);

  const change = (id: string, status: Status) => {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    setApps((all) => all.map((a) => (a.id === id ? { ...a, status, updated: "Today" } : a)));
    if (status === "Applied" && !reminders.includes(app.company)) setReminders((r) => [...r, app.company]);
  };

  return (
    <section id="applications" className="af-section af-apps" aria-labelledby="apps-title">
      <Reveal order={2} className="af-demo-col af-apps-demo">
        <div className="af-panel af-apps-panel" data-ui>
          <table className="af-apps-table">
            <caption className="af-sr-only">Sample applications</caption>
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} data-closed={!ACTIVE.includes(a.status) || undefined}>
                  <th scope="row">
                    <span className="af-apps-title">{a.title}</span>
                    <span className="af-apps-co">{a.company}</span>
                  </th>
                  <td>
                    <label className="af-sr-only" htmlFor={`status-${a.id}`}>
                      Status for {a.title} at {a.company}
                    </label>
                    <select id={`status-${a.id}`} className="af-select" value={a.status} onChange={(e) => change(a.id, e.target.value as Status)}>
                      <optgroup label="Active">
                        {STATUSES.filter((s) => ACTIVE.includes(s)).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Closed">
                        {STATUSES.filter((s) => !ACTIVE.includes(s)).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </optgroup>
                    </select>
                  </td>
                  <td className="af-apps-date">{a.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="af-followups" role="status" aria-live="polite">
            <p className="af-review-label">Follow-ups</p>
            {reminders.length === 0 ? (
              <p className="af-readlog-empty">Mark one Applied to see the reminder it adds.</p>
            ) : (
              <ul>
                <AnimatePresence initial={false}>
                  {reminders.map((c) => (
                    <motion.li key={c} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                      Follow up on your {c} application <span className="af-fact-source">in 7 days</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
        <p className="af-demo-note">Fictional applications. Changes stay on this page.</p>
      </Reveal>

      <div className="af-copy af-apps-copy">
        <Reveal as="h2" className="af-h2">
          <span id="apps-title">One list, every job</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          Each job you save keeps its status, its documents and their earlier versions in one place, from Interested to Offer received.
        </Reveal>
        <Reveal as="p" order={2} className="af-lede af-lede-2">
          You apply on the employer’s own site; AGENT FROG never submits for you. When you mark one Applied, it sets a reminder to follow up a week later.
        </Reveal>
      </div>
    </section>
  );
}
