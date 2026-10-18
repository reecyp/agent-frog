"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { addAlumniNote } from "@/app/(app)/network/actions";
import { METHODS, OUTREACH_STATUSES } from "@/domain/network";
import { useToast } from "../ui/Toast";

export function NoteForm({ alumniKey, jobs, defaultJobId }: { alumniKey: string; jobs: { id: string; label: string }[]; defaultJobId: string | null }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ contactDate: new Date().toISOString().slice(0, 10), method: "Email", outreachStatus: "Reached out", followUpDate: "", linkedJobId: defaultJobId ?? "", body: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form
      className="panel @container grid gap-4 p-4 @xl:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addAlumniNote({ alumniKey, ...form, linkedJobId: form.linkedJobId || null });
          if (!r.ok) return toast(r.error, "error");
          toast(form.followUpDate ? "Note saved and follow-up reminder added." : "Note saved.", "ok");
          setForm((f) => ({ ...f, body: "", followUpDate: "" }));
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 @[18rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="field min-w-0">
          <label htmlFor="n-date" className="t-label">Date</label>
          <input id="n-date" type="date" className="input w-full min-w-0" value={form.contactDate} onChange={set("contactDate")} />
        </div>
        <div className="field min-w-0">
          <label htmlFor="n-method" className="t-label">How</label>
          <select id="n-method" className="input w-full min-w-0" value={form.method} onChange={set("method")}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        </div>
        <div className="field min-w-0">
          <label htmlFor="n-status" className="t-label">Status</label>
          <select id="n-status" className="input w-full min-w-0" value={form.outreachStatus} onChange={set("outreachStatus")}>{OUTREACH_STATUSES.map((m) => <option key={m}>{m}</option>)}</select>
        </div>
        <div className="field min-w-0">
          <label htmlFor="n-follow" className="t-label">Follow up on</label>
          <input id="n-follow" type="date" className="input w-full min-w-0" value={form.followUpDate} onChange={set("followUpDate")} />
        </div>
      </div>
      {jobs.length > 0 && (
        <div className="field min-w-0">
          <label htmlFor="n-job" className="t-label">Related job</label>
          <select id="n-job" className="input w-full min-w-0" value={form.linkedJobId} onChange={set("linkedJobId")}>
            <option value="">None</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
          </select>
        </div>
      )}
      <div className="field min-w-0">
        <label htmlFor="n-body" className="t-label">Notes</label>
        <textarea id="n-body" className="input w-full min-w-0" rows={4} value={form.body} onChange={set("body")} placeholder="What you asked, what they said, people they mentioned, next steps" />
      </div>
      <button type="submit" className="btn btn-primary justify-self-start" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Save note</button>
    </form>
  );
}
