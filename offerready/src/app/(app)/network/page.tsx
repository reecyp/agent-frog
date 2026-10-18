import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, SearchX, Sparkles, Users } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { activeStudentId } from "@/server/profile";
import { ALUMNI_PAGE_SIZE, alumniStatus, findAlumni } from "@/server/alumni";
import { EmptyState, ListSkeleton, PageHeader, Section, formatDate } from "@/components/ui";
import { AlumniSearchBar } from "@/components/network/AlumniSearchBar";
import { alumniHref } from "@/components/network/alumniHref";

export const metadata: Metadata = { title: "Network" };

type SearchParams = Record<string, string | string[] | undefined>;

export default function NetworkPage({ searchParams }: PageProps<"/network">) {
  return (
    <>
      <PageHeader
        title="Network"
        lede="TCU alumni at the companies you're targeting, and a record of every conversation you've had. Drafts never send on their own; you send from your own email."
      />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <NetworkBody searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NetworkBody({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Number(sp.page) || 1;
  const studentId = await activeStudentId();
  const db = await getDb();
  const [status, notes] = await Promise.all([
    alumniStatus(),
    db.select().from(schema.alumniNotes).where(eq(schema.alumniNotes.studentId, studentId)).orderBy(desc(schema.alumniNotes.createdAt)),
  ]);

  // One row per contact, using their latest note.
  const contacts = [...new Map(notes.map((n) => [n.alumniKey, n])).values()];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-14">
      <Section title="Your contacts" aside={<span className="t-num">{contacts.length} with notes</span>}>
        {contacts.length === 0 ? (
          <EmptyState icon={Users} title="No contacts yet" body="Find an alum below or open one from a job page, then save your first note. They'll appear here with their status and next follow-up." />
        ) : (
          <ul className="list overflow-hidden">
            {contacts.map((c) => {
              const due = c.followUpDate && c.followUpDate <= today;
              const role = [c.jobTitle, c.employer].filter(Boolean).join(", ");
              return (
                <li key={c.alumniKey}>
                  <Link href={`/network/${c.alumniKey}`} className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-bg-subtle @xl:flex-row @xl:items-center @xl:gap-4 @xl:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-semibold text-ink group-hover:text-accent">{c.alumniName}</span>
                      {role && <span className="t-secondary block break-words">{role}</span>}
                      <span className="t-meta block">Last contact: {c.method}{c.contactDate ? `, ${formatDate(c.contactDate)}` : ""}</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap items-center gap-2 @xl:flex-col @xl:items-end @xl:gap-1">
                      <span className="badge badge-neutral">{c.outreachStatus}</span>
                      {c.followUpDate &&
                        (due ? (
                          <span className="badge badge-danger"><CalendarClock className="size-3.5" aria-hidden /> Follow-up due</span>
                        ) : (
                          <span className="t-meta">Follow up {formatDate(c.followUpDate)}</span>
                        ))}
                    </span>
                    <ChevronRight className="hidden size-4 shrink-0 text-ink-3 @xl:block" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <section id="find" aria-label="Find alumni" className="scroll-mt-6">
        <div className="mb-5">
          <h2 className="t-section">Find alumni</h2>
          {status.available && (
            <p className="measure mt-0.5 text-[0.875rem] text-[var(--ink-2)]">
              Search <span className="t-num">{status.count.toLocaleString()}</span> TCU alumni by role, employer, or both, in your own words. Claude widens them to related titles and companies; the directory itself never leaves this computer.
            </p>
          )}
        </div>
        {!status.available ? (
          <EmptyState icon={SearchX} title="Alumni directory not loaded" body={<>The private TCU alumni file wasn&apos;t found on this computer. Set <code className="t-mono">ALUMNI_DATA_PATH</code> in <code className="t-mono">.env.local</code>. See Settings.</>} />
        ) : (
          <>
            {/* Keyed by the search, so the bar resets to whatever the URL says after Back/Forward. */}
            <AlumniSearchBar key={query} query={query} />
            {query && (
              <Suspense key={`${query}|${page}`} fallback={<div className="mt-8"><p className="t-meta mb-3">Searching the directory…</p><ListSkeleton rows={4} /></div>}>
                <AlumniResults query={query} page={page} />
              </Suspense>
            )}
          </>
        )}
      </section>
    </div>
  );
}

async function AlumniResults({ query, page }: { query: string; page: number }) {
  const r = await findAlumni(query, page);
  const from = (r.page - 1) * ALUMNI_PAGE_SIZE + 1;
  const to = from + r.people.length - 1;
  const widened = [...new Set([...r.terms.roles, ...r.terms.employers])].filter((t) => t.toLowerCase() !== r.query.toLowerCase());

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.875rem]" aria-live="polite">
          {r.total ? (
            <>Showing <span className="t-num font-semibold">{from}–{to}</span> of <span className="t-num font-semibold">{r.total.toLocaleString()}</span> {r.total === 1 ? "alum" : "alumni"}</>
          ) : (
            "No alumni match yet"
          )}
        </p>
        {r.widenedBy === "none" && <p className="t-meta">{r.aiError ? `Claude couldn't read this search (${r.aiError}). Matched your exact words.` : "Matched your exact words (no AI key)."}</p>}
      </div>

      {r.widenedBy === "claude" && widened.length > 0 && (
        <details className="group mb-4 text-[0.8125rem] text-[var(--ink-3)]">
          <summary className="flex cursor-pointer list-none items-start gap-2 hover:text-[var(--ink-2)]">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--frog-text)]" aria-hidden />
            <span className="min-w-0">
              {r.note || "Claude widened your search."} <span className="font-semibold text-[var(--ink-2)] underline decoration-white/15 underline-offset-[3px] group-open:hidden">See what was searched</span>
            </span>
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5 pl-5">
            {widened.map((t) => <li key={t} className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[var(--ink-2)]">{t}</li>)}
          </ul>
        </details>
      )}

      {r.total === 0 ? (
        <EmptyState icon={SearchX} title="Nobody matched" body="Try something broader, like “finance” instead of “FP&A analyst”, or just a company name." />
      ) : (
        <>
          <ul className="list overflow-hidden">
            {r.people.map((a) => (
              <li key={a.key}>
                <Link href={`/network/${a.key}`} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-bg-subtle @xl:px-5">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--bg-muted)] text-[0.75rem] font-semibold text-[var(--ink-2)]">{initials(a.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold group-hover:text-accent">{a.name}</span>
                    <span className="t-secondary block break-words">{[a.title, a.employer].filter(Boolean).join(", ")}</span>
                    {(a.classYear || a.location) && <span className="t-meta block">{[a.classYear && `Class of ${yearOf(a.classYear)}`, a.location].filter(Boolean).join(" · ")}</span>}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          {r.pages > 1 && (
            <nav aria-label="Result pages" className="mt-4 flex items-center justify-between gap-3">
              <PageLink href={alumniHref(query, r.page - 1)} disabled={r.page <= 1} dir="prev" />
              <span className="t-meta t-num">Page {r.page} of {r.pages}</span>
              <PageLink href={alumniHref(query, r.page + 1)} disabled={r.page >= r.pages} dir="next" />
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function PageLink({ href, disabled, dir }: { href: string; disabled: boolean; dir: "prev" | "next" }) {
  const label = dir === "prev" ? <><ChevronLeft className="size-4" aria-hidden /> Previous</> : <>Next <ChevronRight className="size-4" aria-hidden /></>;
  return disabled ? (
    <span className="btn btn-quiet btn-sm" aria-disabled="true">{label}</span>
  ) : (
    <Link href={href} scroll={false} className="btn btn-secondary btn-sm">{label}</Link>
  );
}

/** The directory stores "Last, First"; initials read first-name first. */
function displayName(name: string) {
  const [last, first] = name.split(",").map((s) => s.trim());
  return first ? `${first} ${last}` : name;
}

function initials(name: string) {
  return displayName(name).split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

/** The directory sometimes stores class year as a full date string; show just the year. */
function yearOf(v: string) {
  return String(v).match(/\b(19|20)\d{2}\b/)?.[0] ?? v;
}
