"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { EXPERIENCE, EXPERIENCE_FACTS, PREFERENCES, SKILL_FACTS, type Fact, type FactStatus } from "../data/sample";
import { Reveal } from "../walkthrough/Reveal";

type Tab = "experience" | "skills" | "wants";
const TABS: { id: Tab; label: string }[] = [
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "wants", label: "What you want" },
];
const ALL_FACTS = [...EXPERIENCE_FACTS, ...SKILL_FACTS];
const fresh = () => Object.fromEntries(ALL_FACTS.map((f) => [f.id, { status: "extracted" as FactStatus, text: f.text }]));

/**
 * B. Build your career profile. The files and the onboarding answers become one profile. Facts read
 * from a file stay marked until the student confirms or edits them, and only confirmed facts are used,
 * mirroring the app's extracted / confirmed statuses and its Confirm all. Demo state only.
 */
export function Profile() {
  const [tab, setTab] = useState<Tab>("experience");
  const [facts, setFacts] = useState(fresh);
  const confirmed = Object.values(facts).filter((f) => f.status !== "extracted").length;

  const set = (id: string, patch: Partial<{ status: FactStatus; text: string }>) => setFacts((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
  const confirmAll = () => setFacts((all) => Object.fromEntries(Object.entries(all).map(([id, f]) => [id, f.status === "extracted" ? { ...f, status: "confirmed" as FactStatus } : f])));

  return (
    <section id="profile" className="af-section af-profile" aria-labelledby="profile-title">
      <Reveal order={2} className="af-profile-demo">
        <div className="af-panel" data-ui>
          <div className="af-panel-head">
            <div>
              <p className="af-panel-title">Jordan Reyes</p>
              <p className="af-panel-sub">Career profile</p>
            </div>
            <p className="af-count" role="status" aria-live="polite">
              <span className="af-count-num">{confirmed}</span> of {ALL_FACTS.length} facts confirmed
            </p>
          </div>

          <Tabs tab={tab} onChange={setTab} />

          <div className="af-panel-body" role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`}>
            {tab === "experience" && (
              <>
                <p className="af-role">
                  <span className="af-role-org">{EXPERIENCE.organization}</span>
                  <span className="af-role-meta">
                    {EXPERIENCE.title}, {EXPERIENCE.dates}
                  </span>
                </p>
                <FactList facts={EXPERIENCE_FACTS} state={facts} onSet={set} multiline />
              </>
            )}
            {tab === "skills" && <FactList facts={SKILL_FACTS} state={facts} onSet={set} />}
            {tab === "wants" && (
              <>
                <dl className="af-wants">
                  {PREFERENCES.map((p) => (
                    <div key={p.label}>
                      <dt>{p.label}</dt>
                      <dd>{p.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="af-panel-aside">From the onboarding questions. You wrote these, so there’s nothing to confirm.</p>
              </>
            )}
          </div>

          <div className="af-panel-foot">
            <p className="af-panel-aside">Facts you haven’t confirmed stay out of every application.</p>
            <div className="af-panel-actions">
              <button type="button" className="af-btn af-btn-quiet" onClick={() => setFacts(fresh())} disabled={confirmed === 0}>
                Start over
              </button>
              <button type="button" className="af-btn" onClick={confirmAll} disabled={confirmed === ALL_FACTS.length}>
                Confirm all
              </button>
            </div>
          </div>
        </div>
        <p className="af-demo-note">Sample profile for a fictional student. Changes here stay on this page.</p>
      </Reveal>

      <div className="af-profile-copy">
        <Reveal as="h2" className="af-h2">
          <span id="profile-title">Check every fact first</span>
        </Reveal>
        <Reveal as="p" order={1} className="af-lede">
          Your files and a few short questions become one career profile: your experience, your skills and the work you’re after. Anything read from a file stays marked until you confirm it or fix it.
        </Reveal>
        <Reveal as="p" order={2} className="af-pledge">
          Every application is built from this profile alone. AGENT FROG doesn’t add jobs, numbers or skills you don’t have.
        </Reveal>
      </div>
    </section>
  );
}

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const group = useId();
  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation).
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (i + d + TABS.length) % TABS.length;
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  };
  return (
    <LayoutGroup id={group}>
      <div className="af-tabs" role="tablist" aria-label="Profile sections">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`profile-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`profile-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className="af-tab"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {t.label}
            {tab === t.id && <motion.span layoutId="tab-mark" className="af-tab-mark" transition={{ type: "spring", bounce: 0, duration: 0.35 }} />}
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

function FactList({ facts, state, onSet, multiline }: { facts: Fact[]; state: Record<string, { status: FactStatus; text: string }>; onSet: (id: string, p: Partial<{ status: FactStatus; text: string }>) => void; multiline?: boolean }) {
  return (
    <ul className="af-facts-list">
      {facts.map((f) => (
        <FactRow key={f.id} fact={f} value={state[f.id]} onSet={(p) => onSet(f.id, p)} multiline={multiline} />
      ))}
    </ul>
  );
}

const STATUS_LABEL: Record<FactStatus, string> = { extracted: "Not checked yet", confirmed: "Confirmed", edited: "Edited by you" };

function FactRow({ fact, value, onSet, multiline }: { fact: Fact; value: { status: FactStatus; text: string }; onSet: (p: Partial<{ status: FactStatus; text: string }>) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.text);
  const inputId = useId();
  const editBtn = useRef<HTMLButtonElement>(null);

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    onSet({ text, status: text === fact.text ? "confirmed" : "edited" });
    setEditing(false);
    requestAnimationFrame(() => editBtn.current?.focus());
  };
  const cancel = () => {
    setDraft(value.text);
    setEditing(false);
    requestAnimationFrame(() => editBtn.current?.focus());
  };

  return (
    <li className="af-fact" data-status={value.status}>
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="edit" className="af-fact-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <label htmlFor={inputId} className="af-sr-only">
              Edit this fact
            </label>
            {multiline ? (
              <textarea id={inputId} name="fact" autoComplete="off" className="af-input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Escape" && cancel()} />
            ) : (
              <input id={inputId} name="fact" autoComplete="off" className="af-input" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus onKeyDown={(e) => (e.key === "Enter" ? save() : e.key === "Escape" && cancel())} />
            )}
            <div className="af-fact-actions">
              <button type="button" className="af-btn af-btn-sm" onClick={save} disabled={!draft.trim()}>
                Save
              </button>
              <button type="button" className="af-btn af-btn-sm af-btn-quiet" onClick={cancel}>
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="view" className="af-fact-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <p className="af-fact-text">{value.text}</p>
            <div className="af-fact-meta">
              <span className={`af-status af-status-${value.status}`}>{STATUS_LABEL[value.status]}</span>
              <span className="af-fact-source">{fact.source}</span>
              <span className="af-fact-actions">
                {value.status === "extracted" && (
                  <button type="button" className="af-btn af-btn-sm" onClick={() => onSet({ status: "confirmed" })}>
                    Confirm
                  </button>
                )}
                <button
                  ref={editBtn}
                  type="button"
                  className="af-btn af-btn-sm af-btn-quiet"
                  onClick={() => {
                    setDraft(value.text);
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
