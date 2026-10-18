"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { addTask } from "@/app/actions";
import { useToast } from "../ui/Toast";

type Kind = "follow_up" | "interview" | "deadline" | "outreach" | "other";

export function AddTaskForm({ applicationId = null, alumniKey = null, defaultTitle = "" }: { applicationId?: string | null; alumniKey?: string | null; defaultTitle?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<Kind>(alumniKey ? "outreach" : "follow_up");
  const [pending, start] = useTransition();
  const uid = applicationId ?? alumniKey ?? "general";
  if (!open) {
    return (
      <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Add a reminder
      </button>
    );
  }
  return (
    <form
      className="rounded-[var(--r-panel)] border border-[var(--line)] bg-[var(--bg-subtle)] p-3"
      aria-label="New reminder"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addTask({ title, dueDate: date, kind, applicationId, alumniKey });
          if (!r.ok) return toast(r.error, "error");
          toast("Reminder added. It shows on your Overview and Follow-ups pages.", "ok");
          setTitle(defaultTitle);
          setDate("");
          setOpen(false);
        });
      }}
    >
      {/* Wraps to as many rows as the container needs: one row on a wide page, stacked in a sidebar. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="field min-w-0 flex-[1_1_14rem]">
          <label htmlFor={`t-title-${uid}`} className="t-label">Reminder</label>
          <input id={`t-title-${uid}`} className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Send a thank-you note" required autoFocus />
        </div>
        <div className="field min-w-0 flex-[1_1_8.5rem] @4xl:flex-[0_1_10rem]">
          <label htmlFor={`t-date-${uid}`} className="t-label">Due</label>
          <input id={`t-date-${uid}`} type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field min-w-0 flex-[1_1_8.5rem] @4xl:flex-[0_1_10rem]">
          <label htmlFor={`t-kind-${uid}`} className="t-label">Type</label>
          <select id={`t-kind-${uid}`} className="input w-full" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="follow_up">Follow-up</option>
            <option value="interview">Interview</option>
            <option value="deadline">Deadline</option>
            <option value="outreach">Networking</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Add reminder</button>
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </div>
    </form>
  );
}
