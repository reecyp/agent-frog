import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ScrollText } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { activeStudentId } from "@/server/profile";
import { EmptyState, ListSkeleton, PageHeader, SectionTabs, formatDate } from "@/components/ui";

export const metadata: Metadata = { title: "AI log" };

const KIND: Record<string, { label: string; cls: string }> = {
  flagged_claim: { label: "Caught by the checker", cls: "badge-caution" },
  student_removed: { label: "You removed it", cls: "badge-danger" },
  student_edited: { label: "You rewrote it", cls: "badge-accent" },
  student_confirmed: { label: "You confirmed it", cls: "badge-ok" },
  ai_error: { label: "AI unavailable", cls: "badge-neutral" },
};

export default function AiLogPage() {
  return (
    <>
      <PageHeader
        tabs={<SectionTabs group="settings" current="/ai-log" />}
        title="AI log"
        lede="An automatic record of every time a generated line was flagged, and what you decided. This is the evidence that personalization stayed honest."
      />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Log />
      </Suspense>
    </>
  );
}

async function Log() {
  const studentId = await activeStudentId();
  const db = await getDb();
  const rows = await db.select({ e: schema.aiEvents, job: schema.jobs }).from(schema.aiEvents)
    .leftJoin(schema.applications, eq(schema.applications.id, schema.aiEvents.applicationId))
    .leftJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(eq(schema.aiEvents.studentId, studentId)).orderBy(desc(schema.aiEvents.createdAt)).limit(200);
  if (!rows.length) return <EmptyState icon={ScrollText} title="Nothing logged yet" body="When drafting flags a claim, or you edit, remove or confirm a flagged line, it's recorded here." />;
  const count = (k: string) => rows.filter((r) => r.e.kind === k).length;
  const totals: [string, number][] = [
    ["Flagged by the checker", count("flagged_claim")],
    ["Removed", count("student_removed")],
    ["Rewritten", count("student_edited")],
    ["Confirmed by you", count("student_confirmed")],
  ];
  return (
    <>
      <dl className="mb-6 grid grid-cols-2 overflow-hidden rounded-panel border border-line @2xl:grid-cols-4">
        {totals.map(([label, n], i) => (
          <div key={label} className={`px-4 py-3 ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line @2xl:border-t-0" : ""} ${i === 2 ? "@2xl:border-l" : ""}`}>
            <dt className="t-meta">{label}</dt>
            <dd className="t-num mt-0.5 text-[1.25rem] font-semibold text-ink">{n}</dd>
          </div>
        ))}
      </dl>
      <ol className="list" aria-label="AI events, newest first">
        {rows.map(({ e, job }) => {
          const k = KIND[e.kind] ?? { label: e.kind, cls: "badge-neutral" };
          const d = e.detail as { text?: string; before?: string; after?: string; source?: string; issues?: { message: string }[]; error?: string };
          return (
            <li key={e.id} className="grid gap-2 px-4 py-4 text-[0.875rem] @2xl:grid-cols-[11rem_minmax(0,1fr)] @2xl:gap-6 @2xl:px-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 @2xl:flex-col @2xl:items-start">
                <span className={`badge ${k.cls}`}>{k.label}</span>
                <time className="t-meta t-num" dateTime={new Date(e.createdAt).toISOString()}>{formatDate(e.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
              </div>
              <div className="min-w-0 break-words">
                <p className="text-ink">{e.summary}</p>
                {(d.before || d.after) && (
                  <dl className="mt-2 grid gap-1 border-l-2 border-line pl-3 text-ink-2">
                    {d.before && <div><dt className="t-label inline">Before: </dt><dd className="inline">{d.before}</dd></div>}
                    {d.after && <div><dt className="t-label inline">After: </dt><dd className="inline">{d.after}</dd></div>}
                  </dl>
                )}
                {d.text && !d.before && <p className="mt-2 border-l-2 border-line pl-3 font-[family-name:var(--font-document)] text-[0.95rem] text-ink">{d.text}</p>}
                {d.source && <p className="t-meta mt-1.5">Source: {d.source}</p>}
                {job && e.applicationId && <Link href={`/applications/${e.applicationId}?step=review`} className="mt-1.5 inline-block text-[0.8125rem] font-semibold text-accent underline decoration-[rgb(201_174_234/0.35)] underline-offset-2 hover:decoration-[var(--accent)]">{job.title}, {job.company}</Link>}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
