import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { activeStudentId } from "@/server/profile";
import { jobsForSearch, latestSearchId } from "@/server/jobs/search";
import { countAlumniAt } from "@/server/alumni";
import { topKeywords } from "@/domain/requirements";
import { EmptyState, formatDate } from "../ui";
import { JobCard, type JobCardData } from "./JobCard";
import { CompareBar } from "./CompareBar";
import { WidenSearch } from "./WidenSearch";

const PAGE = 10;
const FIT_RANK = { strong: 0, good: 1, stretch: 2 } as const;

export async function Results({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const studentId = await activeStudentId();
  const searchId = (typeof sp.search === "string" && sp.search) || (await latestSearchId(studentId));
  if (!searchId) {
    return (
      <div className="mt-10">
        <EmptyState title="No searches yet" body="Describe a role above and set filters. Results stay here, so you can come back to them." />
      </div>
    );
  }
  const result = await jobsForSearch(studentId, searchId);
  if (!result) return <div className="mt-10"><EmptyState title="That search isn't available" body="It may belong to a different profile. Run a new search above." /></div>;
  const { search, jobs } = result;
  const s = search.stats;
  const sort = sp.sort === "newest" ? "newest" : "fit";
  const showDismissed = sp.dismissed === "1";
  const page = Math.max(1, Number(sp.page) || 1);

  const visible = jobs
    .filter((r) => showDismissed || r.match.state !== "dismissed")
    .sort((a, b) =>
      sort === "newest"
        ? (b.job.postedAt?.getTime() ?? 0) - (a.job.postedAt?.getTime() ?? 0)
        : FIT_RANK[a.match.fit] - FIT_RANK[b.match.fit] || (b.job.postedAt?.getTime() ?? 0) - (a.job.postedAt?.getTime() ?? 0),
    );
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const slice = visible.slice((page - 1) * PAGE, page * PAGE);
  const alumni = await countAlumniAt([...new Set(slice.map((r) => r.job.company))]);
  const dismissedCount = jobs.filter((r) => r.match.state === "dismissed").length;
  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams({ search: searchId, sort, ...(showDismissed ? { dismissed: "1" } : {}) });
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return `/discover?${p}`;
  };

  const cards: JobCardData[] = slice.map(({ job, match }) => ({
    id: job.id, title: job.title, company: job.company, location: job.location, arrangement: job.arrangement, level: job.level,
    url: job.url, sourceLabel: job.sourceLabel, source: job.source,
    postedAt: job.postedAt?.toISOString() ?? null, deadline: job.deadline,
    compensation: job.compensation, keywords: topKeywords(job.description, job.requirements),
    strongest: match.strongestMatch, state: match.state, alumni: alumni[job.company] ?? 0,
  }));

  const segment = (active: boolean) =>
    `relative inline-grid min-h-[2.125rem] place-items-center whitespace-nowrap rounded-[6px] px-3 text-[0.8125rem] font-semibold ${
      active ? "bg-[#33281f] text-[var(--ink)] shadow-[0_1px_2px_rgb(0_0_0/0.5),inset_0_1px_0_rgb(255_235_210/0.07)]" : "text-[var(--ink-2)] hover:text-[var(--ink)]"
    }`;

  return (
    <section aria-label="Results" className="mt-10">
      <div className="mb-4 flex flex-col gap-3 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="min-w-0">
          <h2 className="t-section text-pretty break-words">
            <span className="t-num">{s.returned}</span> {s.returned === 1 ? "opening" : "openings"}
            <span className="font-normal text-[var(--ink-2)]"> for &ldquo;{(search.query || search.filters.titles.slice(0, 2).join(", ")).trim()}&rdquo;</span>
          </h2>
          <p className="t-meta measure mt-1 t-num">
            Scanned {s.scanned.toLocaleString()} postings across {s.sources.reduce((n, x) => n + x.boardsQueried, 0)} boards on {formatDate(search.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. {s.afterFilter} matched your filters, {s.duplicatesRemoved} {s.duplicatesRemoved === 1 ? "duplicate" : "duplicates"} removed.
          </p>
        </div>
        <div className="segmented shrink-0 self-start @2xl:self-auto" role="group" aria-label="Sort">
          <Link href={qs({ sort: "fit", page: null })} aria-pressed={sort === "fit"} role="button" className={segment(sort === "fit")}>Best match</Link>
          <Link href={qs({ sort: "newest", page: null })} aria-pressed={sort === "newest"} role="button" className={segment(sort === "newest")}>Newest</Link>
        </div>
      </div>

      <details className="group mb-5 text-[0.875rem]">
        <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-[var(--r-control)] font-semibold text-[var(--ink-2)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
          Sources and errors
        </summary>
        <ul className="subtle mt-2 grid gap-1 px-4 py-3 text-[var(--ink-2)]">
          {s.sources.map((src) => (
            <li key={src.source} className="break-words">
              <span className="font-semibold text-[var(--ink)]">{src.source}</span>:{" "}
              {src.configured ? `${src.boardsQueried} ${src.source === "Adzuna" ? "queries" : "boards"}, ${src.postingsScanned.toLocaleString()} postings, ${src.matched} kept` : "not configured (add ADZUNA_APP_ID and ADZUNA_APP_KEY)"}
              {src.errors.length > 0 && <span className="text-[var(--danger)]">. Failed: {src.errors.slice(0, 3).join("; ")}{src.errors.length > 3 ? ` and ${src.errors.length - 3} more` : ""}</span>}
            </li>
          ))}
          <li className="t-meta mt-1">Filters {s.interpretedBy === "claude" ? "were interpreted by Claude" : "came from keyword rules"}. Postings that failed the live check are never shown.</li>
        </ul>
      </details>

      {(s.outsideLocation ?? 0) > 0 && visible.length > 0 && visible.length < 5 && (
        <div className="mb-4 flex flex-col gap-3 rounded-[var(--r-panel)] bg-[var(--accent-soft)] px-4 py-3 @2xl:flex-row @2xl:items-center @2xl:justify-between">
          <p className="min-w-0 text-[0.875rem]">{s.outsideLocation} more postings match your titles and job type but are outside {search.filters.locations.join(" or ")}.</p>
          <WidenSearch query={search.query} filters={search.filters} interpretedBy={s.interpretedBy} count={s.outsideLocation!} />
        </div>
      )}
      {visible.length === 0 ? (
        <EmptyState
          title={jobs.length ? "Everything here is dismissed" : `No live openings in ${search.filters.locations.join(" or ") || "your locations"} right now`}
          body={
            jobs.length
              ? "Show dismissed jobs, or run a new search."
              : (s.outsideLocation ?? 0) > 0
                ? `${s.outsideLocation} postings match your titles and job type elsewhere. Many banks and large firms use application systems with no public feed, so you can also paste a posting you found on Handshake or LinkedIn.`
                : "Try broader titles or remove the posted-within limit. You can also paste a posting you found on Handshake or LinkedIn."
          }
          action={
            jobs.length ? (
              <Link className="btn btn-secondary" href={qs({ dismissed: "1" })}>Show dismissed</Link>
            ) : (s.outsideLocation ?? 0) > 0 ? (
              <WidenSearch query={search.query} filters={search.filters} interpretedBy={s.interpretedBy} count={s.outsideLocation!} />
            ) : undefined
          }
        />
      ) : (
        <ol className="list">
          {cards.map((c) => (
            <li key={c.id} className="@container min-w-0">
              <JobCard job={c} />
            </li>
          ))}
        </ol>
      )}

      <nav aria-label="Pages" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[0.875rem]">
        <span className="t-meta t-num">Page {page} of {pages}</span>
        <div className="flex flex-wrap gap-2">
          {page > 1 && <Link className="btn btn-secondary btn-sm" href={qs({ page: String(page - 1) })}>Previous</Link>}
          {page < pages && <Link className="btn btn-secondary btn-sm" href={qs({ page: String(page + 1) })}>Next</Link>}
          {dismissedCount > 0 && (
            <Link className="btn btn-quiet btn-sm" href={showDismissed ? qs({ dismissed: null }) : qs({ dismissed: "1" })}>
              {showDismissed ? "Hide dismissed" : `Show ${dismissedCount} dismissed`}
            </Link>
          )}
        </div>
      </nav>
      <CompareBar />
    </section>
  );
}
