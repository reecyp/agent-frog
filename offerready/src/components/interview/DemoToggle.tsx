"use client";

/** The per-question "Demo answer" checkbox: Claude answers that question, and it's scored like a real one. */
export function DemoToggle({ checked, onChange, disabled, label = "Demo answer" }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <label className={`inline-flex min-h-9 shrink-0 cursor-pointer select-none items-center gap-2 rounded-[var(--r-control)] px-2 text-[0.8125rem] font-medium transition-colors hover:bg-white/[0.04] ${checked ? "text-[var(--frog-text)]" : "text-[var(--ink-3)] hover:text-[var(--ink-2)]"} ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-4 cursor-pointer accent-[var(--frog-hi)]" />
      {label}
    </label>
  );
}

/** Asks Claude for a demo answer; the server scores and saves it. Returns the saved answer's id. */
export async function requestDemoAnswer(sessionId: string, questionId: string, spoken: boolean): Promise<{ id: string } | { error: string }> {
  try {
    const res = await fetch("/api/interview/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, questionId, spoken }) });
    const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    return body.id ? { id: body.id } : { error: body.error ?? "Couldn't write a demo answer." };
  } catch {
    return { error: "Couldn't reach the server. Check your connection." };
  }
}
