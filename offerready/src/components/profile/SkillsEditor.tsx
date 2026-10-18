"use client";

import { useState, useTransition } from "react";
import { Check, FileSearch, Plus, X } from "lucide-react";
import type { ProfileSnapshot } from "@/domain/profile";
import { addSkill, confirmItem, deleteSkill } from "@/app/(app)/profile/actions";
import { useToast } from "../ui/Toast";

const CATS = [
  { id: "technical", label: "Technical" },
  { id: "certification", label: "Certifications" },
  { id: "language", label: "Languages" },
  { id: "interest", label: "Interests" },
] as const;

export function SkillsEditor({ skills }: { skills: ProfileSnapshot["skills"] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState<{ category: (typeof CATS)[number]["id"]; name: string; proficiency: string }>({ category: "technical", name: "", proficiency: "" });
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast(r.error ?? "That didn't work.", "error");
      else after?.();
    });
  return (
    <div className="list overflow-hidden">
      <dl className="divide-y divide-line">
        {CATS.map((c) => {
          const items = skills.filter((s) => s.category === c.id);
          return (
            <div key={c.id} className="grid gap-2 px-4 py-3.5 @xl:grid-cols-[8rem_minmax(0,1fr)] @xl:gap-4 @xl:px-5">
              <dt className="t-label @xl:pt-1.5">{c.label}</dt>
              <dd className="min-w-0">
                {items.length === 0 ? (
                  <p className="t-meta @xl:pt-1.5">None yet</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {items.map((s) => (
                      <li key={s.id} className={`chip max-w-full ${s.status === "extracted" ? "bg-caution-soft" : ""}`}>
                        {s.status === "extracted" && <FileSearch className="size-3.5 shrink-0 text-caution" aria-hidden />}
                        <span className="min-w-0 break-words">{s.name}{s.proficiency ? <span className="text-ink-2"> ({s.proficiency})</span> : null}</span>
                        {s.status === "extracted" && <span className="sr-only">, from your upload, confirm it</span>}
                        {s.status === "extracted" && (
                          <button type="button" aria-label={`Confirm ${s.name}`} title="From your upload. Confirm it's accurate" onClick={() => run(() => confirmItem("skill", s.id))} disabled={pending}><Check className="size-3.5" aria-hidden /></button>
                        )}
                        <button type="button" aria-label={`Remove ${s.name}`} title="Remove" onClick={() => run(() => deleteSkill(s.id))} disabled={pending}><X className="size-3.5" aria-hidden /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      <form
        aria-label="Add a skill"
        className="grid gap-3 bg-bg-subtle px-4 py-4 @xl:grid-cols-[9rem_minmax(0,1fr)_8rem_auto] @xl:items-end @xl:gap-2 @xl:px-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addSkill(f), () => setF({ ...f, name: "", proficiency: "" }));
        }}
      >
        <div className="field min-w-0">
          <label htmlFor="sk-cat" className="t-label">Type</label>
          <select id="sk-cat" className="input w-full" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as typeof f.category })}>{CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        </div>
        <div className="field min-w-0"><label htmlFor="sk-name" className="t-label">Skill</label><input id="sk-name" className="input w-full" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Power BI" /></div>
        <div className="field min-w-0"><label htmlFor="sk-prof" className="t-label">Level</label><input id="sk-prof" className="input w-full" value={f.proficiency} onChange={(e) => setF({ ...f, proficiency: e.target.value })} placeholder="Advanced" /></div>
        <button type="submit" className="btn btn-secondary justify-self-start" disabled={pending}><Plus className="size-4" aria-hidden /> Add skill</button>
      </form>
    </div>
  );
}
