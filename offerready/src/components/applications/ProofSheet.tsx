"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronUp, CircleAlert, Loader2, PencilLine, RotateCcw, ShieldCheck, Trash2, XCircle } from "lucide-react";
import type { CoverLetterContent, DocLine, DocumentContent, ResumeContent, ResumeEntry, Transformation } from "@/domain/types";
import { allLines, reviewState } from "@/domain/validate";
import { approveAction, reviewLineAction } from "@/app/actions";
import { useToast } from "../ui/Toast";
import { popover } from "../motion";

type EvidenceMap = Record<string, { text: string; context: string; provenance: string; status: string }>;

const CHANGE_LABEL: Record<Transformation, string> = {
  unchanged: "Copied exactly from your profile",
  reordered: "Moved up because it's relevant to this posting",
  reworded: "Reworded",
  shortened: "Shortened",
  from_answer: "Built from an answer you gave",
  generated: "Written for this letter",
};

const PLACEHOLDER_SPLIT = /(\[\[\s*PERSONALIZE:[^\]]*\]\])/gi;

function LineText({ text }: { text: string }) {
  return (
    <>
      {text.split(PLACEHOLDER_SPLIT).map((part, i) =>
        /^\[\[\s*PERSONALIZE:/i.test(part) ? (
          <span key={i} className="doc-placeholder">{part.replace(/^\[\[\s*PERSONALIZE:\s*/i, "Fill in: ").replace(/\]\]$/, "")}</span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function ProofSheet({
  applicationId,
  jobId,
  documentId,
  content,
  status,
  requirements,
  evidence,
  sourceLabel,
}: {
  applicationId: string;
  jobId: string;
  documentId: string;
  content: DocumentContent;
  status: "draft" | "approved";
  requirements: Record<string, string>;
  evidence: EvidenceMap;
  sourceLabel: string;
}) {
  const toast = useToast();
  const lines = useMemo(() => allLines(content), [content]);
  const marked = useMemo(() => lines.filter((l) => l.transformation !== "unchanged" || l.issues.length > 0), [lines]);
  const state = useMemo(() => reviewState(content), [content]);
  const firstOpen = marked.find((l) => l.verification !== "supported" && l.decision !== "removed") ?? marked[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstOpen?.id ?? null);
  const selected = lines.find((l) => l.id === selectedId) ?? null;
  const locked = status === "approved";
  const sectionRef = useRef<HTMLElement>(null);
  const wide = useWide(sectionRef);
  const position = marked.findIndex((l) => l.id === selectedId) + 1;

  const step = (dir: 1 | -1) => {
    if (!marked.length) return;
    const i = marked.findIndex((l) => l.id === selectedId);
    const next = marked[(i + dir + marked.length) % marked.length];
    setSelectedId(next.id);
    document.getElementById(`line-${next.id}`)?.focus();
  };

  const note = selected ? (
    <motion.div key={selected.id + selected.decision + selected.text} {...popover}>
      <LineNote
        line={selected}
        locked={locked}
        applicationId={applicationId}
        documentId={documentId}
        requirements={requirements}
        evidence={evidence}
        sourceLabel={sourceLabel}
        onDone={(msg) => toast(msg, "ok")}
        onError={(msg) => toast(msg, "error")}
      />
    </motion.div>
  ) : null;

  const line = (l: DocLine, as: "li" | "span" = "span") => {
    const changed = l.transformation !== "unchanged";
    const flagged = l.decision !== "removed" && l.verification !== "supported";
    const inner = (
      <span
        id={`line-${l.id}`}
        role="button"
        tabIndex={0}
        aria-current={selectedId === l.id ? "true" : undefined}
        aria-label={`${l.text}. ${changed ? CHANGE_LABEL[l.transformation] + "." : "Unchanged."}${flagged ? (l.verification === "unsupported" ? " Needs fixing." : " Needs your confirmation.") : ""}`}
        onClick={() => setSelectedId(l.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedId(l.id);
          }
        }}
        className={`doc-line outline-offset-1 ${l.decision === "removed" ? "doc-removed" : ""}`}
      >
        <span className={changed && l.decision !== "removed" ? "doc-mark" : ""}>
          <LineText text={l.text} />
        </span>
        {flagged && (
          <span className={`doc-flag ${l.verification === "unsupported" ? "badge-danger" : "badge-caution"}`} aria-hidden>
            {l.verification === "unsupported" ? "Fix" : "Confirm"}
          </span>
        )}
        {(l.decision === "accepted" || l.decision === "edited") && !flagged && changed && <Check className="ml-1 inline size-3 text-ok" aria-hidden />}
      </span>
    );
    // Without room for a margin column, the note opens directly under the line it explains.
    // It stays pinned to the visible part of the sheet when the sheet scrolls sideways.
    const inline =
      wide === false && selectedId === l.id ? (
        <div className="sticky left-3 my-2.5 block w-[min(100%,calc(100cqw-4.5rem))] font-sans text-[0.875rem] leading-normal font-normal not-italic text-ink">
          <AnimatePresence mode="wait">{note}</AnimatePresence>
        </div>
      ) : null;
    return as === "li" ? (
      <li key={l.id} className="pl-1">{inner}{inline}</li>
    ) : (
      <Fragment key={l.id}>{inner}{inline ?? " "}</Fragment>
    );
  };

  return (
    <section ref={sectionRef} aria-label="Document review" className="@container/proof">
      {locked && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-panel bg-ok-soft px-4 py-3">
          <p className="flex min-w-0 items-start gap-2 text-[0.875rem] font-semibold text-ok"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> You approved this {content.kind === "resume" ? "resume" : "cover letter"}. It&apos;s locked; draft a new version to change it.</p>
          <Link href={`/jobs/${jobId}?step=export`} className="btn btn-secondary btn-sm">Go to export</Link>
        </div>
      )}
      <div className="grid gap-6 @4xl/proof:grid-cols-[minmax(0,1fr)_19rem]">
        {/* The sheet keeps its print width and scrolls sideways inside this box when the column is narrower. */}
        <div className="-mx-3 min-w-0 overflow-x-auto px-3 pt-1 pb-4 [container-type:inline-size]">
          <div className="sheet doc mx-auto min-w-[34rem] max-w-[46rem] px-[7%] py-[8%]">
            {content.kind === "resume" ? <Resume content={content} line={line} /> : <Letter content={content} line={line} />}
          </div>
        </div>

        {/* Margin note, beside the sheet when there's room */}
        <div className={`hidden @4xl/proof:block ${wide === false ? "@4xl/proof:hidden" : ""}`}>
          <div className="sticky top-6">
            {wide !== false && (
              <AnimatePresence mode="wait">
                {note ?? (
                  <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="panel p-4 text-[0.875rem] text-ink-2">
                    Select any line in the document to see where it came from.
                  </motion.p>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <p className="t-meta measure mx-auto mt-1 text-center">
        Highlighted lines differ from your profile. The exported PDF has no highlights and is rendered fresh from the approved text.
      </p>

      <ApproveBar
        applicationId={applicationId}
        documentId={documentId}
        state={state}
        status={status}
        kind={content.kind}
        nav={
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" className="btn btn-quiet btn-sm btn-icon" onClick={() => step(-1)} aria-label="Previous highlighted line" disabled={!marked.length}><ChevronUp className="size-4" aria-hidden /></button>
            <button type="button" className="btn btn-quiet btn-sm btn-icon" onClick={() => step(1)} aria-label="Next highlighted line" disabled={!marked.length}><ChevronDown className="size-4" aria-hidden /></button>
            <span className="t-num ml-1 text-[0.8125rem] font-semibold whitespace-nowrap text-ink-2">
              {marked.length ? `${position || "–"} of ${marked.length}` : "No highlights"}
            </span>
          </div>
        }
      />
    </section>
  );
}

/** Whether the review area is wide enough for a margin column (matches the `@4xl/proof` container query). `null` until measured. */
function useWide(ref: React.RefObject<HTMLElement | null>) {
  const [wide, setWide] = useState<boolean | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 56 * 16));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return wide;
}

function LineNote({
  line,
  locked,
  applicationId,
  documentId,
  requirements,
  evidence,
  sourceLabel,
  onDone,
  onError,
}: {
  line: DocLine;
  locked: boolean;
  applicationId: string;
  documentId: string;
  requirements: Record<string, string>;
  evidence: EvidenceMap;
  sourceLabel: string;
  onDone: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line.text);
  const [pending, start] = useTransition();
  const sources = line.sourceEvidenceIds.map((id) => evidence[id]).filter(Boolean);
  const quote = line.requirementId ? requirements[line.requirementId] : null;

  const act = (action: Parameters<typeof reviewLineAction>[3], msg: string) =>
    start(async () => {
      const r = await reviewLineAction(applicationId, documentId, line.id, action);
      if (!r.ok) return onError(r.error);
      setEditing(false);
      const after = (r.data as { line: DocLine } | undefined)?.line;
      onDone(after && after.verification === "unsupported" ? "Saved, but it still can't be backed by your evidence." : msg);
    });

  return (
    <div className="panel overflow-hidden text-[0.875rem]">
      <div className={`border-b border-line px-4 py-3 ${line.verification === "unsupported" && line.decision !== "removed" ? "bg-danger-soft" : line.verification === "needs_review" && line.decision !== "removed" ? "bg-caution-soft" : "bg-bg-subtle"}`}>
        <p className={`font-semibold ${line.decision === "removed" ? "text-ink" : line.verification === "unsupported" ? "text-danger" : line.verification === "needs_review" ? "text-caution" : "text-ink"}`}>
          {line.decision === "removed" ? "Removed from this version" : line.verification === "unsupported" ? "Can't be backed by your evidence" : line.verification === "needs_review" ? "Needs your confirmation" : "Backed by your evidence"}
        </p>
        <p className="t-meta">{CHANGE_LABEL[line.transformation]}</p>
      </div>
      <dl className="grid gap-3 px-4 py-4">
        {line.issues.length > 0 && line.decision !== "removed" && (
          <div>
            <dt className="t-label">Problems found</dt>
            <dd>
              <ul className="mt-1 grid gap-2">
                {line.issues.map((i, n) => (
                  <li key={n} className="flex gap-2">
                    {i.severity === "critical" ? <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />}
                    <span>
                      {i.message}
                      {i.question && <span className="mt-0.5 block text-ink-2">{i.question}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {line.transformation !== "unchanged" && line.originalText && line.originalText !== line.text && (
          <div>
            <dt className="t-label">Your original</dt>
            <dd className="mt-0.5 font-document text-[0.95rem] text-ink">{line.originalText}</dd>
          </div>
        )}
        <div>
          <dt className="t-label">Source</dt>
          <dd className="mt-0.5">
            {sources.length ? (
              <ul className="grid gap-1">
                {sources.map((s, i) => (
                  <li key={i}><span className="text-ink-2">{s.context}</span>{s.provenance === "answer" ? <span className="t-meta"> (your answer)</span> : null}</li>
                ))}
              </ul>
            ) : line.transformation === "generated" ? (
              <span className="text-ink-2">No facts about you, so no source is needed.</span>
            ) : (
              <span className="text-danger">None. Nothing in your profile supports this line.</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="t-label">Why</dt>
          <dd className="mt-0.5">
            {quote ? (
              <blockquote className="border-l-2 border-accent/40 pl-2.5 text-ink-2"><q>{quote}</q> <span className="t-meta">({sourceLabel})</span></blockquote>
            ) : (
              <span className="text-ink-2">Not tied to a specific requirement.</span>
            )}
          </dd>
        </div>
      </dl>

      {!locked && (
        <div className="border-t border-line bg-bg px-4 py-3">
          {editing ? (
            <div className="grid gap-2">
              <label htmlFor={`edit-${line.id}`} className="t-label">Edit this line</label>
              <textarea id={`edit-${line.id}`} className="input text-[0.875rem]" rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <p className="t-meta">Your edit is checked against your evidence again when you save.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary btn-sm" disabled={pending || !draft.trim()} onClick={() => act({ type: "edit", text: draft }, "Edit saved and re-checked.")}>
                  {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />} Save and re-check
                </button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setEditing(false); setDraft(line.text); }}>Cancel</button>
              </div>
            </div>
          ) : line.decision === "removed" ? (
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => act({ type: "restore" }, "Line restored.")}>
              <RotateCcw className="size-3.5" aria-hidden /> Restore
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              {line.verification !== "unsupported" && line.decision !== "accepted" && (
                <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => act({ type: "accept" }, line.verification === "needs_review" ? "Confirmed. Logged as your decision." : "Accepted.")}>
                  {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <ShieldCheck className="size-3.5" aria-hidden />}
                  {line.verification === "needs_review" ? "It's accurate" : "Accept"}
                </button>
              )}
              <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => { setDraft(line.text); setEditing(true); }}>
                <PencilLine className="size-3.5" aria-hidden /> Edit
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => act({ type: "remove" }, "Removed from this version.")}>
                <Trash2 className="size-3.5" aria-hidden /> Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The review action bar. It floats at the bottom of the viewport while the sheet is on screen,
 * so stepping through highlights and approving are always one reach away.
 */
function ApproveBar({ applicationId, documentId, state, status, kind, nav }: { applicationId: string; documentId: string; state: ReturnType<typeof reviewState>; status: "draft" | "approved"; kind: "resume" | "cover_letter"; nav: React.ReactNode }) {
  const toast = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();
  const label = kind === "resume" ? "resume" : "cover letter";
  const blocked = state.reasons.length > 0;
  return (
    <div className="floating sticky bottom-3 z-10 mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 @2xl/proof:px-4">
      {nav}
      <span aria-hidden className="hidden h-6 w-px bg-line @2xl/proof:block" />
      {status === "approved" ? (
        <p className="flex min-w-0 flex-1 items-center gap-2 text-[0.875rem] font-semibold text-ok"><ShieldCheck className="size-4 shrink-0" aria-hidden /> Approved</p>
      ) : (
        <>
          <p className="min-w-[min(100%,14rem)] flex-1 text-[0.875rem] text-ink-2" aria-live="polite">
            <span className="t-num font-semibold text-ink">{state.changed} {state.changed === 1 ? "line" : "lines"} changed.</span>{" "}
            {blocked ? (
              <span className="text-caution"><CircleAlert className="mr-1 inline size-3.5 align-[-0.15em]" aria-hidden />Before approving: {state.reasons.join(", ")}.</span>
            ) : (
              "Nothing is blocking approval. Read it once more, then approve."
            )}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className={`flex min-h-10 items-center gap-2 text-[0.875rem] ${state.canApprove ? "text-ink" : "text-ink-3"}`}>
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} disabled={!state.canApprove} />
              Everything in this {label} is true
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!state.canApprove || !confirmed || pending}
              onClick={() =>
                start(async () => {
                  const r = await approveAction(applicationId, documentId);
                  toast(r.ok ? `Approved. The clean PDF passed the export checks.` : r.error, r.ok ? "ok" : "error");
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />} Approve {label}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Neeley template rendering ----------

type LineFn = (l: DocLine, as?: "li" | "span") => React.ReactNode;

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">{left}</div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 mt-4 border-b border-black pb-px font-bold first:mt-0">{children}</h3>;
}

function Entries({ entries, line }: { entries: ResumeEntry[]; line: LineFn }) {
  return (
    <>
      {entries.map((e) => (
        <div key={e.experienceId} className="mt-2.5 first:mt-0">
          <Row left={<><b>{e.organization},</b> {e.city}</>} right={`${e.startDate} – ${e.endDate}`} />
          <p className="italic">{e.title}</p>
          <ul className="ml-5 list-disc">{e.bullets.map((b) => line(b, "li"))}</ul>
        </div>
      ))}
    </>
  );
}

function Resume({ content, line }: { content: ResumeContent; line: LineFn }) {
  const h = content.header;
  return (
    <div>
      <div className="mb-3 text-center">
        <p className="text-[19px] font-bold uppercase">{h.name}</p>
        <p>{[h.phone, h.email].filter(Boolean).join(" | ")}</p>
        {h.linkedin && <p>{h.linkedin}</p>}
      </div>
      <Heading>EDUCATION</Heading>
      {content.education.map((e, i) => (
        <div key={i}>
          <Row left={<><b>{e.school},</b> {e.college}</>} right={e.city} />
          <Row left={e.degree} right={e.graduation} />
          <Row left={[e.majors && `Major: ${e.majors}`, e.minors && `Minor: ${e.minors}`].filter(Boolean).join("; ")} right={e.gpa && `GPA: ${e.gpa}`} />
          {e.honors && <p><i>Honors/Awards:</i> {e.honors}</p>}
          {e.coursework && <p><i>Relevant Coursework:</i> {e.coursework}</p>}
        </div>
      ))}
      {content.experience.length > 0 && <Heading>EXPERIENCE</Heading>}
      <Entries entries={content.experience} line={line} />
      {content.leadership.length > 0 && <Heading>LEADERSHIP AND COMMUNITY EXPERIENCE</Heading>}
      <Entries entries={content.leadership} line={line} />
      {content.skills.length > 0 && <Heading>SKILLS</Heading>}
      {content.skills.map((s) => (
        <div key={s.label}><i>{s.label}:</i> {line(s.line)}</div>
      ))}
    </div>
  );
}

function Letter({ content, line }: { content: CoverLetterContent; line: LineFn }) {
  const h = content.header;
  return (
    <div className="text-[15px] leading-[1.45]">
      <div className="mb-6 text-center">
        <p className="text-[19px] font-bold uppercase">{h.name}</p>
        <p>{[h.phone, h.email].filter(Boolean).join(" | ")}</p>
        {h.linkedin && <p>{h.linkedin}</p>}
      </div>
      <p>{content.date}</p>
      <div className="mt-4">{content.recipient.map((r) => <p key={r}>{r}</p>)}</div>
      <div className="mt-4">{line(content.greeting)}</div>
      {content.paragraphs.map((p, i) => (
        <div key={i} className="mt-4">{p.lines.map((l) => line(l))}</div>
      ))}
      <p className="mt-4">{content.signoff}</p>
      <p className="mt-8">{h.name}</p>
    </div>
  );
}
