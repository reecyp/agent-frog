import Link from "next/link";
import { CheckCircle2, Download, FileText, Lock, ShieldCheck } from "lucide-react";
import type { ApplicationView } from "@/server/applicationView";
import { Section, formatDate } from "../ui";
import { MarkAppliedButton } from "./MarkApplied";

export function ExportStep({ view }: { view: ApplicationView }) {
  const docs = [
    { label: "Resume", d: view.resume },
    { label: "Cover letter", d: view.coverLetter },
  ];
  const both = docs.every((x) => x.d?.status === "approved");
  const applied = view.app.status === "applied" || view.app.status === "interviewing";
  return (
    <div className="flex flex-col gap-10">
      <Section
        title="Download approved files"
        description="Each PDF is rendered fresh from the text you approved, on the Neeley template, as real selectable text. It has no highlights or notes."
      >
        <ul className="list">
          {docs.map(({ label, d }) => {
            const approved = d?.status === "approved";
            return (
              <li key={label} className="list-row flex flex-wrap items-center gap-x-4 gap-y-3 @xl:px-5">
                <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-control ${approved ? "bg-ok-soft text-ok" : "bg-bg-muted text-ink-3"}`}>
                  {approved ? <CheckCircle2 className="size-[1.125rem]" /> : <FileText className="size-[1.125rem]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{label}{d ? <span className="t-num font-normal text-ink-3"> v{d.version}</span> : ""}</p>
                  <p className="t-meta">
                    {!d ? "Not drafted yet" : approved ? `Approved ${formatDate(d.approvedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Not approved yet"}
                  </p>
                </div>
                {approved ? (
                  <a href={`/api/documents/${d.id}/pdf`} className="btn btn-secondary" download>
                    <Download className="size-4" aria-hidden /> Download PDF
                  </a>
                ) : (
                  <Link href={`/jobs/${view.job.id}?step=review&doc=${label === "Resume" ? "resume" : "cover_letter"}`} className="btn btn-secondary">
                    <Lock className="size-4" aria-hidden /> Review and approve first
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Section>
      {both && (
        <Section title="Submit">
          <div className="panel flex flex-col gap-4 p-4 @2xl:flex-row @2xl:items-center @2xl:justify-between @xl:p-5">
            <p className="measure flex items-start gap-2 text-[0.875rem] text-ink-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
              <span>Apply on the employer&apos;s own site. AGENT FROG never submits for you. When you&apos;ve applied, record it here and a follow-up reminder is added for 7 days out.</span>
            </p>
            <div className="shrink-0">
              {applied ? (
                <p className="badge badge-ok"><CheckCircle2 className="size-3.5" aria-hidden /> Applied {formatDate(view.app.appliedAt)}</p>
              ) : (
                <MarkAppliedButton applicationId={view.app.id} company={view.job.company} />
              )}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
