import Link from "next/link";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import type { ApplicationView } from "@/server/applicationView";
import type { AtsReport, ChangeSummaryItem } from "@/domain/types";
import { EmptyState, Section } from "../ui";
import { ProofSheet } from "./ProofSheet";
import { GenerateButton } from "./GenerateButton";
import { ResolveAllDemo } from "./ResolveAllDemo";

const KIND_LABEL: Record<ChangeSummaryItem["kind"], string> = {
  emphasized: "Reworded",
  moved: "Moved",
  keyword: "Keyword",
  shortened: "Shortened",
  removed: "Removed",
  added_from_answer: "From your answer",
  omitted: "Left out",
};

export function ReviewStep({ view, which }: { view: ApplicationView; which: "resume" | "cover_letter" }) {
  const doc = which === "resume" ? view.resume : view.coverLetter;
  if (!view.resume || !view.coverLetter || !doc) {
    return <EmptyState title="No drafts yet" body="Tailor your resume and cover letter from the Requirements tab." action={<GenerateButton jobId={view.job.id} applicationId={view.app.id} aiConfigured={view.aiConfigured} hasDrafts={false} />} />;
  }
  const requirements = Object.fromEntries(view.job.requirements.map((r) => [r.id, r.quote]));
  const evidence = Object.fromEntries(view.evidence.map((e) => [e.id, { text: e.text, context: e.context, provenance: e.provenance, status: e.status }]));
  const tab = (k: "resume" | "cover_letter", label: string, d: NonNullable<ApplicationView["resume"]>) => (
    <Link
      href={`/jobs/${view.job.id}?step=review&doc=${k}`}
      scroll={false}
      aria-current={which === k ? "page" : undefined}
      className={`flex min-h-10 items-center gap-2 rounded-[6px] px-3 text-[0.875rem] font-semibold whitespace-nowrap ${which === k ? "bg-bg text-ink ring-1 ring-line" : "text-ink-2 hover:text-ink"}`}
    >
      {label}
      {d.status === "approved" ? (
        <span className="badge badge-ok"><CheckCircle2 className="size-3.5" aria-hidden /> Approved</span>
      ) : d.review.canApprove ? (
        <span className="badge badge-neutral">Ready to approve</span>
      ) : (
        <span className="badge badge-caution"><CircleAlert className="size-3.5" aria-hidden /> {d.review.blockers + d.review.needsReview} to resolve</span>
      )}
    </Link>
  );
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <nav className="scroll-x inline-flex max-w-full gap-0.5 rounded-control bg-bg-muted p-[3px]" aria-label="Document">
          {tab("resume", "Resume", view.resume)}
          {tab("cover_letter", "Cover letter", view.coverLetter)}
        </nav>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="t-meta">
            Version {doc.version}, drafted {doc.generator === "claude" ? "by Claude" : "with rules (no AI)"} on {doc.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          {(view.resume.status !== "approved" || view.coverLetter.status !== "approved") && <ResolveAllDemo applicationId={view.app.id} jobId={view.job.id} />}
        </div>
      </div>

      <ProofSheet
        key={doc.id}
        applicationId={view.app.id}
        jobId={view.job.id}
        documentId={doc.id}
        content={doc.content}
        status={doc.status}
        requirements={requirements}
        evidence={evidence}
        sourceLabel={view.job.sourceLabel}
      />

      <ChangeSummary items={doc.changeSummary} />
      {doc.ats && <AtsChecklist report={doc.ats} />}
      {doc.status !== "approved" && (
        <div className="subtle flex flex-col gap-3 p-4 @2xl:flex-row @2xl:items-center @2xl:justify-between">
          <p className="measure text-[0.875rem] text-ink-2">Answered more questions or added experience? A new version starts from your updated profile. This version stays in the history.</p>
          <div className="shrink-0"><GenerateButton jobId={view.job.id} applicationId={view.app.id} aiConfigured={view.aiConfigured} hasDrafts showHint={false} variant="secondary" /></div>
        </div>
      )}
    </div>
  );
}

function ChangeSummary({ items }: { items: ChangeSummaryItem[] }) {
  return (
    <Section title="What changed and why" aside={`${items.length} ${items.length === 1 ? "note" : "notes"}`}>
      {items.length === 0 ? (
        <p className="text-[0.875rem] text-ink-2">Nothing was changed from your profile.</p>
      ) : (
        <ul className="list">
          {items.map((c, i) => (
            <li key={i} className="list-row grid gap-1 @xl:grid-cols-[8.5rem_minmax(0,1fr)] @xl:gap-x-4 @xl:px-5">
              <span className="t-label @xl:pt-px">{KIND_LABEL[c.kind]}</span>
              <div className="min-w-0 text-[0.875rem] break-words">
                <p>{c.description}</p>
                {c.postingQuote && (
                  <p className="mt-1.5 border-l-2 border-accent/40 pl-2.5 text-ink-2">
                    <q>{c.postingQuote}</q>
                    {c.postingSource && <span className="t-meta"> ({c.postingSource})</span>}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function AtsChecklist({ report }: { report: AtsReport }) {
  const groups: { id: "format" | "keywords" | "accuracy"; title: string }[] = [
    { id: "format", title: "Format" },
    { id: "keywords", title: "Keywords" },
    { id: "accuracy", title: "Accuracy" },
  ];
  return (
    <Section title="ATS and accuracy checks" aside={report.extractedTextMatches === null ? "PDF checks run when you approve" : report.extractedTextMatches ? "PDF text read back cleanly" : "PDF text check failed"}>
      <p className="measure mb-4 text-[0.875rem] text-ink-2">
        These checks confirm the document can be parsed and that every claim is backed. They don&apos;t predict whether an employer will interview you, so there&apos;s no score.
      </p>
      <div className="panel grid divide-y divide-line @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-y-0">
        {groups.map((g) => (
          <div key={g.id} className="min-w-0 p-4">
            <h3 className="t-label mb-2.5">{g.title}</h3>
            <ul className="grid gap-2.5">
              {report.checks.filter((c) => c.group === g.id).map((c) => (
                <li key={c.id} className="flex gap-2 text-[0.8125rem]">
                  {c.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Passed" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Needs attention" />}
                  <span className="min-w-0 break-words"><span className="font-semibold">{c.label}</span><br /><span className="text-ink-2">{c.detail}</span></span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
