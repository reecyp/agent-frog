"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Copy, Loader2, Mail, PenLine } from "lucide-react";
import { draftOutreach } from "@/app/(app)/network/actions";
import { useToast } from "../ui/Toast";

const PLACEHOLDER = /\[\[\s*PERSONALIZE:[^\]]*\]\]/i;

/** Drafts are never sent from AGENT FROG. The student copies them or opens their own email app. */
export function OutreachDraft({ alumniKey, jobId, jobLabel, aiConfigured }: { alumniKey: string; jobId: string | null; jobLabel: string | null; aiConfigured: boolean }) {
  const toast = useToast();
  const [goal, setGoal] = useState("coffee");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [meta, setMeta] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [opening, setOpening] = useState(false);
  const hasBlanks = PLACEHOLDER.test(body) || PLACEHOLDER.test(subject);

  const openEmail = async () => {
    setOpening(true);
    try {
      const res = await fetch(`/api/alumni/${alumniKey}/email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't find an email address.");
      window.location.href = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="panel grid gap-4 p-4 @xl:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="field min-w-0 flex-1 basis-56">
          <label htmlFor="goal" className="t-label">Goal</label>
          <select id="goal" className="input w-full" value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="coffee">Ask for a short conversation</option>
            <option value="role">Ask about the role</option>
            <option value="referral">Ask for a referral (after you&apos;ve talked)</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await draftOutreach(alumniKey, goal, jobId);
              if (!r.ok) return toast(r.error, "error");
              setSubject(r.data!.subject);
              setBody(r.data!.body);
              setMeta(r.data!.note ?? (r.data!.generator === "claude" ? "Drafted by Claude from your profile. Edit it so it sounds like you." : "Template with blanks. Fill them in so it sounds like you."));
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PenLine className="size-4" aria-hidden />} {body ? "Draft again" : "Draft email"}
        </button>
      </div>
      {jobLabel && <p className="t-meta">About: {jobLabel}</p>}
      {!aiConfigured && !body && <p className="t-meta">No AI key is set, so you&apos;ll get a template with blanks to fill in.</p>}
      {body && (
        <>
          <div className="field">
            <label htmlFor="subj" className="t-label">Subject</label>
            <input id="subj" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="body" className="t-label">Message</label>
            <textarea id="body" className="input" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            {meta && <p className="t-meta">{meta}</p>}
          </div>
          {hasBlanks && <p className="badge badge-caution justify-self-start whitespace-normal"><AlertTriangle className="size-3.5 shrink-0" aria-hidden /> Replace every [[PERSONALIZE: …]] blank before sending.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" disabled={hasBlanks} onClick={async () => { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); toast("Copied to your clipboard.", "ok"); }}>
              <Copy className="size-4" aria-hidden /> Copy
            </button>
            <button type="button" className="btn btn-primary" disabled={hasBlanks || opening} onClick={openEmail}>
              {opening ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />} Open in my email app
            </button>
          </div>
          <p className="t-meta border-t border-line pt-3">AGENT FROG never sends email. This opens a draft in your own email app for you to review and send.</p>
        </>
      )}
    </div>
  );
}
