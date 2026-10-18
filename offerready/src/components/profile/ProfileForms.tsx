"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { Arrangement, JobLevel, StudentPreferences } from "@/domain/types";
import { saveContact, savePreferences } from "@/app/(app)/profile/actions";
import { useToast } from "../ui/Toast";

export function ContactForm({ student }: { student: { fullName: string; email: string; phone: string; linkedin: string } }) {
  const toast = useToast();
  const [f, setF] = useState(student);
  const [pending, start] = useTransition();
  const fields: [keyof typeof f, string, string][] = [
    ["fullName", "Name", ""],
    ["phone", "Phone", "817-257-7539"],
    ["email", "Email", "Use your TCU email"],
    ["linkedin", "LinkedIn URL", "www.linkedin.com/in/yourname"],
  ];
  return (
    <form className="panel @container grid gap-4 p-4 @xl:p-5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveContact(f); toast(r.ok ? "Contact heading saved." : r.error, r.ok ? "ok" : "error"); }); }}>
      <div className="grid gap-3 @md:grid-cols-2">
        {fields.map(([k, label, ph]) => (
          <div key={k} className="field min-w-0"><label htmlFor={`c-${k}`} className="t-label">{label}</label><input id={`c-${k}`} className="input w-full" value={f[k]} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
      </div>
      <button type="submit" className="btn btn-secondary justify-self-start" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Save contact heading</button>
    </form>
  );
}

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function PreferencesForm({ prefs }: { prefs: StudentPreferences }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    targetRoles: prefs.targetRoles.join(", "),
    industries: prefs.industries.join(", "),
    locations: prefs.locations.join(", "),
    jobTypes: prefs.jobTypes,
    arrangements: prefs.arrangements,
    timeframe: prefs.timeframe,
    graduation: prefs.graduation,
  });
  const toggle = <T extends string>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <form
      className="panel @container grid gap-4 p-4 @xl:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await savePreferences({ targetRoles: list(f.targetRoles), industries: list(f.industries), locations: list(f.locations), jobTypes: f.jobTypes, arrangements: f.arrangements, timeframe: f.timeframe, graduation: f.graduation });
          toast(r.ok ? "Preferences saved. New searches start from these." : r.error, r.ok ? "ok" : "error");
        });
      }}
    >
      <div className="field"><label htmlFor="p-roles" className="t-label">Target roles</label><input id="p-roles" className="input w-full" value={f.targetRoles} onChange={(e) => setF({ ...f, targetRoles: e.target.value })} placeholder="Finance intern, business analyst" /></div>
      <div className="grid gap-3 @md:grid-cols-2">
        <div className="field min-w-0"><label htmlFor="p-ind" className="t-label">Industries</label><input id="p-ind" className="input w-full" value={f.industries} onChange={(e) => setF({ ...f, industries: e.target.value })} /></div>
        <div className="field min-w-0"><label htmlFor="p-loc" className="t-label">Locations</label><input id="p-loc" className="input w-full" value={f.locations} onChange={(e) => setF({ ...f, locations: e.target.value })} placeholder="Dallas, TX, Remote" /></div>
      </div>
      <p className="t-meta -mt-2">Separate several with commas.</p>
      <div className="grid gap-4 @md:grid-cols-2">
        <fieldset className="min-w-0">
          <legend className="t-label mb-1.5">Job type</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
            {([["internship", "Internship"], ["full_time", "Full-time"]] as [JobLevel, string][]).map(([v, l]) => (
              <label key={v} className="flex min-h-10 items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.jobTypes.includes(v)} onChange={() => setF({ ...f, jobTypes: toggle(f.jobTypes, v) })} />{l}</label>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="t-label mb-1.5">Work arrangement</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
            {([["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-site"]] as [Arrangement, string][]).map(([v, l]) => (
              <label key={v} className="flex min-h-10 items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={f.arrangements.includes(v)} onChange={() => setF({ ...f, arrangements: toggle(f.arrangements, v) })} />{l}</label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field min-w-0"><label htmlFor="p-tf" className="t-label">Start term</label><input id="p-tf" className="input w-full" value={f.timeframe} onChange={(e) => setF({ ...f, timeframe: e.target.value })} placeholder="Summer 2027" /></div>
        <div className="field min-w-0"><label htmlFor="p-grad" className="t-label">Graduation</label><input id="p-grad" className="input w-full" value={f.graduation} onChange={(e) => setF({ ...f, graduation: e.target.value })} placeholder="May 2028" /></div>
      </div>
      <button type="submit" className="btn btn-secondary justify-self-start" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Save preferences</button>
    </form>
  );
}
