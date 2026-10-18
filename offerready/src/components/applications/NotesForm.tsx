"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateApplicationAction } from "@/app/actions";
import { useToast } from "../ui/Toast";

export function NotesForm({ applicationId, notes, deadline }: { applicationId: string; notes: string; deadline: string }) {
  const toast = useToast();
  const [n, setN] = useState(notes);
  const [d, setD] = useState(deadline);
  const [pending, start] = useTransition();
  const dirty = n !== notes || d !== deadline;
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateApplicationAction(applicationId, { notes: n, deadline: d });
          toast(r.ok ? "Notes saved" : r.error, r.ok ? "ok" : "error");
        });
      }}
    >
      <div className="field">
        <label htmlFor={`dl-${applicationId}`} className="t-label">Application deadline</label>
        <input id={`dl-${applicationId}`} type="date" className="input" value={d} onChange={(e) => setD(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={`notes-${applicationId}`} className="t-label">Notes</label>
        <textarea id={`notes-${applicationId}`} className="input text-[0.875rem]" rows={4} value={n} onChange={(e) => setN(e.target.value)} placeholder="Recruiter name, referral, what you learned about the team" />
      </div>
      <button type="submit" className="btn btn-secondary btn-sm justify-self-start" disabled={!dirty || pending}>
        {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Save notes
      </button>
    </form>
  );
}
