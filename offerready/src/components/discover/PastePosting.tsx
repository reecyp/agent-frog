"use client";

import { useActionState, useState } from "react";
import { ClipboardPaste, Loader2 } from "lucide-react";
import { pastePosting, type ActionResult } from "@/app/actions";
import { Dialog } from "../ui/Dialog";

export function PasteButton({ label = "Paste a posting" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(pastePosting, null);
  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        <ClipboardPaste className="size-4" aria-hidden /> {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Paste a posting" description="Found a role on Handshake, LinkedIn, or anywhere else? Paste the full text and it goes through the same matching and tailoring.">
        <form action={action} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="pp-company" className="t-label">Company</label>
              <input id="pp-company" name="company" required className="input" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="pp-title" className="t-label">Job title</label>
              <input id="pp-title" name="title" required className="input" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="pp-location" className="t-label">Location</label>
              <input id="pp-location" name="location" className="input" placeholder="Dallas, TX or Remote" />
            </div>
            <div className="field">
              <label htmlFor="pp-url" className="t-label">Link to the posting (optional)</label>
              <input id="pp-url" name="url" type="url" className="input" placeholder="https://" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pp-text" className="t-label">Full posting text</label>
            <textarea id="pp-text" name="text" required rows={10} className="input text-[0.875rem]" placeholder="Paste everything: responsibilities, qualifications, preferred skills." />
            <p className="t-meta">Requirements are quoted word for word from this text, so paste the whole thing.</p>
          </div>
          {state && !state.ok && <p role="alert" className="text-sm font-medium text-[var(--danger)]">{state.error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Add posting
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
