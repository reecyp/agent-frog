import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, Banknote, Bookmark, ChevronDown, Clock, Download, ExternalLink, FileCheck2, MapPin, MessagesSquare } from "lucide-react";
import { activeStudentId } from "@/server/profile";
import { jobWithMatch } from "@/server/jobs/read";
import { loadApplicationView, type ApplicationView } from "@/server/applicationView";
import { alumniAtCompany, alumniStatus } from "@/server/alumni";
import { aiConfigured } from "@/server/ai/claude";
import { relativeDays } from "@/domain/jobs";
import { seniorityMismatch } from "@/domain/requirements";
import { trackJobAction } from "@/app/actions";
import { CoverageBadge } from "@/components/CoverageBadge";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState, ListSkeleton, Section, Skeleton } from "@/components/ui";
import { GenerateButton } from "@/components/applications/GenerateButton";
import { StatusSelect } from "@/components/applications/StatusSelect";
import { Stepper, type StepId } from "@/components/applications/Stepper";
import { ReviewStep } from "@/components/applications/ReviewStep";
import { ExportStep } from "@/components/applications/ExportStep";
import { ApplicationSidebar, ASIDE_BLOCK } from "@/components/applications/ApplicationSidebar";
import { BackLink } from "@/components/shell/BackLink";

export const metadata: Metadata = { title: "Job" };

export default function JobPage({ params, searchParams }: PageProps<"/jobs/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <ListSkeleton rows={2} />
        </div>
      }
    >
      <JobDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** Quotes are lifted from bulleted postings; drop a leading bullet glyph so the quote reads cleanly. */
const cleanQuote = (q: string) => q.replace(/^[\s•·▪◦*–-]+/, "");

const TAILOR_HINT = {
  ai: "Claude rewords your real bullets for this posting. Every line is then checked against your evidence before you see it.",
  rules: "No AI key is set, so drafting is rule-based: it reorders your real bullets by relevance and flags any wording you should confirm. It never writes new claims.",
};

/** One page per job: the posting checked against the student, then tailoring, review and export once they start. */
async function JobDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const studentId = await activeStudentId();
  const data = await jobWithMatch(studentId, id);
  if (!data) notFound();
  const { job, match, application, coverage, evidence, keywords } = data;
  const view = application ? await loadApplicationView(studentId, application.id) : null;
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const seniority = seniorityMismatch(job.description, job.title);
  const ai = aiConfigured();

  const hasDrafts = !!view?.resume && !!view?.coverLetter;
  const bothApproved = view?.resume?.status === "approved" && view?.coverLetter?.status === "approved";
  const fallback: StepId = !hasDrafts ? "requirements" : bothApproved ? "export" : "review";
  const requested = String(sp.step);
  const step: StepId = view && (requested === "review" || requested === "export") ? requested : sp.step === "requirements" ? "requirements" : fallback;
  const adzunaPreview = job.source === "adzuna" && !job.verificationNote.includes("Full posting read");
  const backed = coverage.filter((c) => c.coverage === "supported").length;
  const reviewing = step === "review";

  // The one primary action in the header is whatever moves this application forward next.
  const primary = !hasDrafts ? (
    <GenerateButton jobId={job.id} applicationId={view?.app.id ?? null} aiConfigured={ai} hasDrafts={false} showHint={false} />
  ) : !bothApproved && step !== "review" ? (
    <Link href={`/jobs/${job.id}?step=review`} scroll={false} className="btn btn-primary"><FileCheck2 className="size-4" aria-hidden /> Review drafts</Link>
  ) : bothApproved && step !== "export" ? (
    <Link href={`/jobs/${job.id}?step=export`} scroll={false} className="btn btn-primary"><Download className="size-4" aria-hidden /> Download files</Link>
  ) : null;

  return (
    <article>
      <header className="mb-8">
        <BackLink fallbackHref={view ? "/applications" : "/discover"} fallbackLabel={view ? "applications" : "jobs"} />
        <h1 className="t-title measure text-balance break-words">{job.title}</h1>
        <p className="mt-1.5 text-[1.0625rem] font-semibold break-words text-ink">{job.company}</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.875rem] text-ink-2">
          <li className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-ink-3" aria-hidden /><span className="break-words">{job.location || "Location not stated"}</span></li>
          <li className="flex items-center gap-1.5"><Clock className="size-3.5 shrink-0 text-ink-3" aria-hidden />Posted {relativeDays(job.postedAt)}</li>
          {job.compensation && <li className="flex min-w-0 items-center gap-1.5"><Banknote className="size-3.5 shrink-0 text-ink-3" aria-hidden /><span className="break-words">{job.compensation}</span></li>}
        </ul>

        <div className="mt-5 flex flex-wrap items-start gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex min-w-0 flex-wrap items-start gap-2">
              {primary}
              {view ? (
                <Link href={`/interview/${view.app.id}`} className="btn btn-secondary"><MessagesSquare className="size-4" aria-hidden /> Practice interview</Link>
              ) : (
                <ActionButton action={trackJobAction.bind(null, job.id)} className="btn btn-secondary" success="Saved to your applications">
                  <Bookmark className="size-4" aria-hidden /> Save to applications
                </ActionButton>
              )}
              {job.url && (
                <a className="btn btn-quiet" href={job.url} target="_blank" rel="noopener noreferrer">
                  Original posting <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
            {!hasDrafts && <p className="t-meta measure">{ai ? TAILOR_HINT.ai : TAILOR_HINT.rules}</p>}
          </div>
          {view && (
            <div className="@3xl:ml-auto">
              <StatusSelect applicationId={view.app.id} status={view.app.status} canMarkReady={bothApproved} inline />
            </div>
          )}
        </div>
      </header>

      {view && (
        <div className="mb-8">
          <Stepper
            jobId={job.id}
            current={step}
            state={{
              requirements: "done",
              review: !hasDrafts ? "locked" : bothApproved ? "done" : "todo",
              export: bothApproved ? "todo" : "locked",
            }}
          />
        </div>
      )}

      {/* The document needs the full width while reviewing, so the sidebar moves below it. Otherwise it sits beside the work once the container is wide enough. */}
      <div className={`grid gap-10 ${reviewing ? "" : "@4xl:grid-cols-[minmax(0,1fr)_18rem] @4xl:gap-12"}`}>
        <div className="flex min-w-0 flex-col gap-10">
          {reviewing && view && <ReviewStep view={view} which={sp.doc === "cover_letter" ? "cover_letter" : "resume"} />}
          {step === "export" && view && <ExportStep view={view} />}
          {step === "requirements" && (
            <>
              {match?.strongestMatch && (
                <Section title="Strongest match">
                  <dl className="panel grid gap-4 p-4 @xl:grid-cols-[7rem_minmax(0,1fr)] @xl:gap-x-4 @xl:p-5">
                    <dt className="t-label @xl:pt-0.5">Posting asks</dt>
                    <dd className="-mt-3 border-l-2 border-accent/40 pl-3 text-ink-2 @xl:mt-0"><q>{cleanQuote(match.strongestMatch.requirementQuote)}</q></dd>
                    <dt className="t-label @xl:pt-0.5">You have</dt>
                    <dd className="-mt-3 min-w-0 @xl:mt-0">
                      {match.strongestMatch.evidenceText}
                      {match.strongestMatch.strength === "weak" && <span className="t-meta mt-1 block">The overlap is thin, so treat this as a stretch.</span>}
                    </dd>
                  </dl>
                </Section>
              )}

              <Section
                title="Requirements, checked against your profile"
                description="Anything not in your profile stays off your tailored resume and cover letter."
                aside={coverage.length > 0 ? <span className="t-num">{backed} of {coverage.length} backed by your evidence</span> : undefined}
              >
                {coverage.length === 0 ? (
                  <EmptyState title="No requirement section found" body="This posting doesn't list qualifications in a way that can be quoted. Read the full posting below." />
                ) : (
                  <ol className="list">
                    {coverage.map((c) => (
                      <li key={c.requirement.id} className="list-row grid gap-2 @xl:grid-cols-[minmax(0,1fr)_auto] @xl:gap-x-6 @xl:px-5">
                        <div className="min-w-0">
                          <p className="break-words">
                            <q>{cleanQuote(c.requirement.quote)}</q>
                            {c.requirement.preferred && <span className="badge badge-neutral ml-2 align-[0.1em]">Preferred</span>}
                          </p>
                          <p className="t-meta mt-1 break-words">
                            {c.evidenceIds.length > 0 && (c.coverage === "supported" || c.coverage === "partial")
                              ? `From your profile: ${byId.get(c.evidenceIds[0])?.text ?? ""}`
                              : c.note}
                          </p>
                        </div>
                        <div className="@xl:pt-0.5"><CoverageBadge coverage={c.coverage} /></div>
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              {view && hasDrafts && (
                <div className="subtle flex flex-col gap-3 p-4 @2xl:flex-row @2xl:items-center @2xl:justify-between">
                  <p className="measure text-[0.875rem] text-ink-2">Changed your profile since drafting? A new version starts from your updated profile. Earlier versions stay in the history.</p>
                  <div className="shrink-0"><GenerateButton jobId={job.id} applicationId={view.app.id} aiConfigured={ai} hasDrafts showHint={false} variant="secondary" /></div>
                </div>
              )}

              <section aria-label="Full posting">
                {adzunaPreview && (
                  <p className="mb-3 flex items-start gap-2 text-[0.875rem] text-ink-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
                    <span>
                      Adzuna only shared the start of this posting.{" "}
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                        Read the full posting <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
                      </a>
                    </span>
                  </p>
                )}
                <details className="panel group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-panel px-4 py-3 hover:bg-bg-subtle @xl:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="t-card">Full posting</span>
                    <span className="flex items-center gap-1 text-[0.875rem] text-ink-2">
                      <span className="group-open:hidden">Show</span>
                      <span className="hidden group-open:inline">Hide</span>
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                    </span>
                  </summary>
                  <div className="measure border-t border-line px-4 py-4 text-[0.9375rem] leading-relaxed whitespace-pre-line break-words text-ink-2 @xl:px-5">
                    {job.description || "No text was captured for this posting."}
                  </div>
                </details>
              </section>
            </>
          )}
        </div>

        <Aside view={view} seniority={seniority} keywords={keywords} company={job.company} jobId={job.id} below={reviewing} />
      </div>
    </article>
  );
}

function Aside({ view, seniority, keywords, company, jobId, below }: { view: ApplicationView | null; seniority: string | null; keywords: string[]; company: string; jobId: string; below: boolean }) {
  return (
    <aside
      aria-label="About this job"
      className={`min-w-0 gap-10 border-t border-line pt-8 @2xl:columns-2 ${below ? "@5xl:columns-3" : "@4xl:columns-1 @4xl:border-0 @4xl:pt-0"}`}
    >
      {seniority && (
        <section aria-label="Heads up" className={ASIDE_BLOCK}>
          <p className="flex items-start gap-2 rounded-panel bg-caution-soft px-3.5 py-3 text-[0.875rem] text-caution">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span><span className="font-semibold">Heads up:</span> listed as early-career but {seniority.toLowerCase()}.</span>
          </p>
        </section>
      )}
      {keywords.length > 0 && (
        <section aria-labelledby="kw-h" className={ASIDE_BLOCK}>
          <h2 id="kw-h" className="t-card mb-2.5">Keywords the posting stresses</h2>
          <ul className="flex flex-wrap gap-1.5">
            {keywords.map((k) => <li key={k} className="rounded-full bg-bg-muted px-2.5 py-0.5 text-[0.8125rem] text-ink-2">{k}</li>)}
          </ul>
        </section>
      )}
      <Suspense fallback={<Skeleton className={`h-24 ${ASIDE_BLOCK}`} />}>
        <Alumni company={company} jobId={jobId} />
      </Suspense>
      {view && <ApplicationSidebar view={view} />}
    </aside>
  );
}

async function Alumni({ company, jobId }: { company: string; jobId: string }) {
  const status = await alumniStatus();
  const people = status.available ? await alumniAtCompany(company, 8) : [];
  return (
    <section id="alumni" aria-labelledby="alumni-h" className={`scroll-mt-6 ${ASIDE_BLOCK}`}>
      <h2 id="alumni-h" className="t-card mb-2.5 break-words">TCU alumni at {company}</h2>
      {!status.available ? (
        <p className="text-[0.875rem] text-ink-2">The private alumni directory isn&apos;t loaded on this computer. See Settings.</p>
      ) : people.length === 0 ? (
        <p className="text-[0.875rem] text-ink-2">No one in the TCU alumni directory lists {company} as their employer.</p>
      ) : (
        <ul className="list">
          {people.map((p) => (
            <li key={p.key} className="list-row py-2.5">
              <Link href={`/network/${p.key}?job=${jobId}`} className="font-semibold hover:text-accent hover:underline">{p.name}</Link>
              <p className="t-meta">{[p.title, p.classYear && `Class of ${p.classYear}`].filter(Boolean).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
