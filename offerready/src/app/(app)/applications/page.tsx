import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Suspense } from "react";
import { activeStudentId } from "@/server/profile";
import { listApplications } from "@/server/applications";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/domain/types";
import { EmptyState, ListSkeleton, PageHeader, SectionTabs, formatDate } from "@/components/ui";
import { StatusSelect } from "@/components/applications/StatusSelect";
import { PasteButton } from "@/components/discover/PastePosting";

export const metadata: Metadata = { title: "Applications" };

export default function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  return (
    <>
      <PageHeader
        title="Applications"
        lede="Every role you're pursuing, with its documents, deadlines and status in one place."
        actions={<><PasteButton label="Add a posting" /><Link href="/discover" className="btn btn-primary">Discover jobs</Link></>}
        tabs={<SectionTabs group="applications" current="/applications" />}
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Tracker searchParams={searchParams} />
      </Suspense>
    </>
  );
}

type Row = Awaited<ReturnType<typeof listApplications>>[number];

function DocBadge({ label, d }: { label: string; d: Row["resume"] }) {
  if (!d) return <span className="badge badge-neutral">No {label.toLowerCase()}</span>;
  const approved = d.status === "approved";
  return <span className={`badge ${approved ? "badge-ok" : "badge-caution"}`}>{label} v{d.version}, {approved ? "approved" : "draft"}</span>;
}

const segment = (on: boolean) =>
  `grid min-h-[2.125rem] place-items-center rounded-[6px] px-3 text-[0.8125rem] font-semibold ${on ? "bg-[#33281f] text-[var(--ink)] shadow-[0_1px_2px_rgb(0_0_0/0.5),inset_0_1px_0_rgb(255_235_210/0.07)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]"}`;

async function Tracker({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const studentId = await activeStudentId();
  const all = await listApplications(studentId);
  const view = sp.view === "board" ? "board" : "list";
  const status = APPLICATION_STATUSES.some((s) => s.value === sp.status) ? (sp.status as ApplicationStatus) : null;
  const sort = ["deadline", "company", "updated"].includes(String(sp.sort)) ? String(sp.sort) : "updated";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const rows = all
    .filter((r) => !status || r.app.status === status)
    .filter((r) => !q || `${r.job.company} ${r.job.title} ${r.job.location}`.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === "company") return a.job.company.localeCompare(b.job.company);
      if (sort === "deadline") {
        const da = a.app.deadline || a.job.deadline || "9999";
        const db = b.app.deadline || b.job.deadline || "9999";
        return da.localeCompare(db);
      }
      return b.app.updatedAt.getTime() - a.app.updatedAt.getTime();
    });

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | null> = { view, status, sort, q: q || null, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/applications?${p}`;
  };

  if (all.length === 0) {
    return <EmptyState title="No applications yet" body="Start an application from any posting in Discover, or add one you found elsewhere." action={<Link href="/discover" className="btn btn-primary">Discover jobs</Link>} />;
  }

  const filtered = !!status || !!q;
  const canMarkReady = (r: Row) => r.resume?.status === "approved" && r.coverLetter?.status === "approved";

  return (
    <>
      <div className="mb-5">
        <form className="flex min-w-0 flex-wrap items-end gap-2" action="/applications" role="search" aria-label="Filter applications">
          <input type="hidden" name="view" value={view} />
          <div className="field w-full min-w-0 @4xl:w-auto @4xl:flex-[1_1_13rem]">
            <label htmlFor="q" className="t-label">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-3)]" aria-hidden />
              <input id="q" name="q" type="search" defaultValue={q} className="input w-full pl-9" placeholder="Company, title, city" />
            </div>
          </div>
          <div className="field min-w-0 flex-[1_1_9.5rem] @xl:flex-[0_1_11rem]">
            <label htmlFor="status" className="t-label">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""} className="input w-full">
              <option value="">All statuses</option>
              {APPLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="field min-w-0 flex-[1_1_9.5rem] @xl:flex-[0_1_11rem]">
            <label htmlFor="sort" className="t-label">Sort by</label>
            <select id="sort" name="sort" defaultValue={sort} className="input w-full">
              <option value="updated">Recently updated</option>
              <option value="deadline">Deadline</option>
              <option value="company">Employer</option>
            </select>
          </div>
          <button type="submit" className="btn btn-secondary">Apply</button>
          <nav className="segmented ml-auto shrink-0 @4xl:ml-4" aria-label="View">
            <Link href={href({ view: "list" })} aria-current={view === "list" ? "page" : undefined} className={segment(view === "list")}>List</Link>
            <Link href={href({ view: "board" })} aria-current={view === "board" ? "page" : undefined} className={segment(view === "board")}>Board</Link>
          </nav>
        </form>
      </div>

      {filtered && rows.length > 0 && (
        <p className="t-meta mb-3" role="status">
          <span className="t-num">{rows.length}</span> of <span className="t-num">{all.length}</span> shown.{" "}
          <Link href={href({ status: null, q: null })} className="font-semibold text-[var(--accent)] hover:underline">Clear filters</Link>
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState title="Nothing matches these filters" body="Clear the search or pick a different status." action={<Link href={href({ status: null, q: null })} className="btn btn-secondary">Clear filters</Link>} />
      ) : view === "list" ? (
        <div className="list">
          <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_11rem_6.5rem_11rem] gap-4 rounded-t-[var(--r-panel)] bg-[var(--bg-subtle)] px-4 py-2.5 text-[0.8125rem] font-semibold text-[var(--ink-2)] @3xl:grid">
            <span>Role</span><span>Documents</span><span>Deadline</span><span>Status</span>
          </div>
          <ul aria-label="Applications" className="divide-y divide-[var(--line)]">
            {rows.map((r) => {
              const deadline = formatDate(r.app.deadline || r.job.deadline);
              return (
                <li key={r.app.id} className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-4 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_11rem_6.5rem_11rem] @3xl:items-start @3xl:gap-4 @3xl:py-3.5">
                  <div className="w-full min-w-0 @3xl:w-auto">
                    <Link href={`/jobs/${r.job.id}`} className="break-words font-semibold leading-snug hover:text-[var(--accent)] hover:underline">{r.job.title}</Link>
                    <p className="break-words text-[0.875rem] text-[var(--ink-2)]">{r.job.company}{r.job.location ? `, ${r.job.location}` : ""}</p>
                    <p className="t-meta mt-0.5">Updated {formatDate(r.app.updatedAt)}{r.app.appliedAt ? `, applied ${formatDate(r.app.appliedAt)}` : ""}</p>
                  </div>
                  <div className="order-3 flex flex-wrap items-center gap-1.5 @3xl:order-none @3xl:flex-col @3xl:items-start">
                    <span className="sr-only">Documents:</span>
                    <DocBadge label="Resume" d={r.resume} />
                    <DocBadge label="Letter" d={r.coverLetter} />
                  </div>
                  <p className="order-2 text-[0.875rem] @3xl:order-none @3xl:pt-1.5">
                    <span className="text-[var(--ink-3)] @3xl:sr-only">Deadline </span>
                    {deadline ? <span className="t-num">{deadline}</span> : <span className="text-[var(--ink-3)]"><span className="@3xl:hidden">not set</span><span className="hidden @3xl:inline">Not set</span></span>}
                  </p>
                  <div className="order-1 w-[12rem] min-w-0 @3xl:order-none @3xl:w-auto [&_select]:w-full">
                    <StatusSelect compact applicationId={r.app.id} status={r.app.status} canMarkReady={canMarkReady(r)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto px-1 pb-2" role="region" aria-label="Board" tabIndex={0}>
          <div className="flex min-w-max gap-3">
            {APPLICATION_STATUSES.filter((s) => s.active || rows.some((r) => r.app.status === s.value)).map((s) => {
              const col = rows.filter((r) => r.app.status === s.value);
              return (
                <section key={s.value} aria-label={s.label} className="subtle flex w-60 flex-col gap-2 p-2">
                  <h2 className="flex items-center justify-between gap-2 px-1.5 pt-1 text-[0.8125rem] font-semibold">
                    {s.label}
                    <span className="t-num rounded-full bg-[var(--bg-muted)] px-2 text-[0.75rem] text-[var(--ink-2)]">{col.length}</span>
                  </h2>
                  {col.map((r) => (
                    <article key={r.app.id} className="rounded-[var(--r-control)] border border-[var(--line)] bg-[var(--bg)] p-3">
                      <Link href={`/jobs/${r.job.id}`} className="block break-words text-[0.875rem] font-semibold leading-snug hover:text-[var(--accent)] hover:underline">{r.job.title}</Link>
                      <p className="t-meta break-words">{r.job.company}</p>
                      <div className="mt-2.5 [&_select]:w-full">
                        <StatusSelect compact applicationId={r.app.id} status={r.app.status} canMarkReady={canMarkReady(r)} />
                      </div>
                    </article>
                  ))}
                  {col.length === 0 && <p className="px-1.5 pb-1.5 text-[0.8125rem] text-[var(--ink-3)]">None</p>}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
