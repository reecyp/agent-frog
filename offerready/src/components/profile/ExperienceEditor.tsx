"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, PencilLine, Plus, Trash2 } from "lucide-react";
import type { ProfileSnapshot } from "@/domain/profile";
import { addBullet, confirmItem, deleteBullet, deleteExperience, editBullet, saveExperience } from "@/app/(app)/profile/actions";
import { useToast } from "../ui/Toast";
import { EvidenceBadge } from "./EvidenceBadge";

type Exp = ProfileSnapshot["experiences"][number];
type Bullet = Exp["bullets"][number];

function useAct() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string } | { ok: true }>, msg?: string, after?: () => void) =>
    start(async () => {
      const r = (await fn()) as { ok: boolean; error?: string };
      if (!r.ok) return toast(r.error ?? "That didn't work.", "error");
      if (msg) toast(msg, "ok");
      after?.();
    });
  return { pending, act };
}

function BulletRow({ b }: { b: Bullet }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(b.text);
  const { pending, act } = useAct();
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      {editing ? (
        <div className="grid gap-2">
          <label htmlFor={`bt-${b.id}`} className="sr-only">Edit bullet</label>
          <textarea id={`bt-${b.id}`} className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => act(() => editBullet(b.id, text), "Saved in your own words.", () => setEditing(false))}>{pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Save</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setEditing(false); setText(b.text); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 @xl:gap-3">
          <div className="flex min-w-0 flex-1 gap-2.5">
            <span aria-hidden className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-ink-3" />
            <div className="min-w-0">
              <p className="break-words text-[0.9375rem] leading-relaxed">{b.text}</p>
              {b.text !== b.originalText || b.status !== "confirmed" ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <EvidenceBadge status={b.status} />
                  {b.text !== b.originalText && <span className="t-meta">Edited, original kept</span>}
                </div>
              ) : (
                <EvidenceBadge status={b.status} />
              )}
            </div>
          </div>
          <div className="-mr-2 -mt-1.5 flex shrink-0 items-center @xl:mr-0 @xl:gap-0.5">
            {b.status === "extracted" && (
              <button type="button" className="btn btn-quiet btn-sm btn-icon" aria-label="Confirm this bullet is accurate" title="Confirm" disabled={pending} onClick={() => act(() => confirmItem("bullet", b.id), "Confirmed.")}>
                <Check className="size-4" aria-hidden />
              </button>
            )}
            <button type="button" className="btn btn-quiet btn-sm btn-icon" aria-label="Edit bullet" title="Edit" onClick={() => setEditing(true)}><PencilLine className="size-4" aria-hidden /></button>
            <button type="button" className="btn btn-quiet btn-sm btn-icon text-danger" aria-label="Delete bullet" title="Delete" disabled={pending} onClick={() => act(() => deleteBullet(b.id), "Deleted.")}><Trash2 className="size-4" aria-hidden /></button>
          </div>
        </div>
      )}
    </li>
  );
}

/** One experience, rendered as a row inside the section's `.list`. */
export function ExperienceBlock({ experience: x }: { experience: Exp }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const { pending, act } = useAct();
  if (editing) return <ExperienceForm initial={x} onDone={() => setEditing(false)} inList />;
  return (
    <article className="px-4 py-4 @xl:px-5">
      {/* Narrow columns put the actions under the title; they don't fit beside it */}
      <header className="flex flex-col gap-2 @md:flex-row @md:items-start @md:justify-between @md:gap-3 @xl:gap-4">
        <div className="min-w-0">
          <h3 className="t-card break-words">{x.organization}{x.city ? <span className="font-normal text-ink-2">, {x.city}</span> : null}</h3>
          <p className="break-words text-[0.9375rem] text-ink-2">{x.title}</p>
          <p className="t-meta t-num">{x.startDate} – {x.endDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 @md:-mr-2 @md:shrink-0 @md:justify-end @xl:mr-0">
          <EvidenceBadge status={x.status} />
          {x.status === "extracted" && <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => act(() => confirmItem("experience", x.id), "Confirmed.")}><Check className="size-3.5" aria-hidden /> Confirm</button>}
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(true)}><PencilLine className="size-3.5" aria-hidden /> Edit</button>
        </div>
      </header>
      {x.bullets.length > 0 && <ul className="mt-3 divide-y divide-line">{x.bullets.map((b) => <BulletRow key={b.id} b={b} />)}</ul>}
      {x.bullets.length < 2 && <p className="t-meta mt-2">The Neeley guide asks for at least two bullets per experience.</p>}
      {adding ? (
        <div className="mt-3 grid gap-2 border-t border-line pt-3">
          <label htmlFor={`nb-${x.id}`} className="t-label">New bullet</label>
          <textarea id={`nb-${x.id}`} className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="What you did, how you did it, and the result (X + Y + Z)" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => act(() => addBullet(x.id, text), "Added.", () => { setText(""); setAdding(false); })}>Add bullet</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-quiet btn-sm -ml-3 mt-2 text-accent" onClick={() => setAdding(true)}><Plus className="size-3.5" aria-hidden /> Add a bullet</button>
      )}
    </article>
  );
}

function ExperienceForm({ initial, onDone, inList = false }: { initial?: Partial<Exp>; onDone: () => void; inList?: boolean }) {
  const [f, setF] = useState({ section: initial?.section ?? "experience", organization: initial?.organization ?? "", city: initial?.city ?? "", title: initial?.title ?? "", startDate: initial?.startDate ?? "", endDate: initial?.endDate ?? "" });
  const { pending, act } = useAct();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const uid = initial?.id ?? "new";
  return (
    <form
      aria-label={initial?.id ? `Edit ${initial.organization}` : "Add an experience"}
      className={`grid gap-4 ${inList ? "bg-bg-subtle px-4 py-4 @xl:px-5" : "panel p-4 @xl:p-5"}`}
      onSubmit={(e) => {
        e.preventDefault();
        act(() => saveExperience({ id: initial?.id, ...f, section: f.section as Exp["section"] }), "Saved.", onDone);
      }}
    >
      <div className="grid gap-3 @xl:grid-cols-2">
        <div className="field"><label htmlFor={`o-${uid}`} className="t-label">Organization</label><input id={`o-${uid}`} className="input" value={f.organization} onChange={set("organization")} /></div>
        <div className="field"><label htmlFor={`t-${uid}`} className="t-label">Your title</label><input id={`t-${uid}`} className="input" value={f.title} onChange={set("title")} /></div>
        <div className="field"><label htmlFor={`c-${uid}`} className="t-label">City, State</label><input id={`c-${uid}`} className="input" value={f.city} onChange={set("city")} placeholder="Fort Worth, TX" /></div>
        <div className="field">
          <label htmlFor={`s-${uid}`} className="t-label">Section</label>
          <select id={`s-${uid}`} className="input" value={f.section} onChange={set("section")}>
            <option value="experience">Experience</option>
            <option value="leadership">Leadership and community</option>
            <option value="project">Project</option>
          </select>
        </div>
        <div className="field"><label htmlFor={`sd-${uid}`} className="t-label">Start</label><input id={`sd-${uid}`} className="input" value={f.startDate} onChange={set("startDate")} placeholder="May 2026" /></div>
        <div className="field"><label htmlFor={`ed-${uid}`} className="t-label">End</label><input id={`ed-${uid}`} className="input" value={f.endDate} onChange={set("endDate")} placeholder="Aug 2026 or Present" /></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Save</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onDone}>Cancel</button>
        {initial?.id && <button type="button" className="btn btn-danger btn-sm ml-auto" disabled={pending} onClick={() => act(() => deleteExperience(initial.id!), "Deleted.", onDone)}><Trash2 className="size-3.5" aria-hidden /> Delete experience</button>}
      </div>
    </form>
  );
}

export function AddExperience() {
  const [open, setOpen] = useState(false);
  return open ? <ExperienceForm onDone={() => setOpen(false)} /> : (
    <button type="button" className="btn btn-secondary self-start" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> Add an experience</button>
  );
}
