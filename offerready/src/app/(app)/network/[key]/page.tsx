import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CalendarClock, ChevronLeft } from "lucide-react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { activeStudentId } from "@/server/profile";
import { alumByKey } from "@/server/alumni";
import { aiConfigured } from "@/server/ai/claude";
import { ListSkeleton, Section, formatDate } from "@/components/ui";
import { NoteForm } from "@/components/network/NoteForm";
import { OutreachDraft } from "@/components/network/OutreachDraft";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage({ params, searchParams }: PageProps<"/network/[key]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={2} />}>
      <Contact params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Contact({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { key } = await params;
  const sp = await searchParams;
  const studentId = await activeStudentId();
  const alum = await alumByKey(key);
  if (!alum) notFound();
  const db = await getDb();
  // An old link may carry a superseded key (see alumni.ts); notes under either belong to this person.
  const [notes, apps] = await Promise.all([
    db.select().from(schema.alumniNotes).where(and(eq(schema.alumniNotes.studentId, studentId), inArray(schema.alumniNotes.alumniKey, [...new Set([key, alum.key])]))).orderBy(desc(schema.alumniNotes.createdAt)),
    db.select({ jobId: schema.jobs.id, title: schema.jobs.title, company: schema.jobs.company }).from(schema.applications).innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId)).where(eq(schema.applications.studentId, studentId)),
  ]);
  const jobId = typeof sp.job === "string" ? sp.job : notes.find((n) => n.linkedJobId)?.linkedJobId ?? null;
  const linkedJob = jobId ? (await db.select({ id: schema.jobs.id, title: schema.jobs.title, company: schema.jobs.company }).from(schema.jobs).where(eq(schema.jobs.id, jobId)))[0] ?? null : null;
  const jobOptions = [...new Map([...(linkedJob ? [{ jobId: linkedJob.id, title: linkedJob.title, company: linkedJob.company }] : []), ...apps].map((j) => [j.jobId, j])).values()];

  const role = [alum.title, alum.employer].filter(Boolean).join(", ");
  const facts = [alum.classYear && `TCU class of ${yearOf(alum.classYear)}`, alum.majors, alum.location].filter(Boolean) as string[];

  return (
    <article>
      <nav aria-label="Breadcrumb" className="t-meta mb-4 flex items-center gap-1">
        <Link href="/network" className="inline-flex items-center gap-1 rounded-control hover:text-accent hover:underline">
          <ChevronLeft className="size-3.5" aria-hidden /> Network
        </Link>
      </nav>
      <header className="mb-8 border-b border-line pb-6">
        <h1 className="t-title break-words">{alum.name}</h1>
        {role && <p className="mt-1.5 break-words text-[1rem] text-ink-2">{role}</p>}
        {facts.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Directory details">
            {facts.map((f) => <li key={f} className="badge badge-neutral whitespace-normal">{f}</li>)}
          </ul>
        )}
        <p className="t-secondary measure mt-4">Listed in the TCU alumni directory. You haven&apos;t been introduced, so introduce yourself as a student who found them through the alumni network.</p>
      </header>

      <div className="grid gap-10 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:items-start @5xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <Section title="Draft an introduction" description="Get a starting draft, edit it, then send it yourself.">
            <OutreachDraft alumniKey={alum.key} jobId={linkedJob?.id ?? null} jobLabel={linkedJob ? `${linkedJob.title} at ${linkedJob.company}` : null} aiConfigured={aiConfigured()} />
          </Section>
          <Section title="Conversation history" aside={<span className="t-num">{notes.length} {notes.length === 1 ? "note" : "notes"}</span>}>
            {notes.length === 0 ? (
              <p className="t-secondary measure">No notes yet. After you reach out, record it with Add a note so you know when to follow up.</p>
            ) : (
              <ol className="list overflow-hidden">
                {notes.map((n) => (
                  <li key={n.id} className="list-row @xl:px-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[0.875rem] font-semibold">{n.method}{n.contactDate ? <span className="font-normal text-ink-2">, {formatDate(n.contactDate, { month: "short", day: "numeric", year: "numeric" })}</span> : ""}</p>
                      <span className="badge badge-neutral">{n.outreachStatus}</span>
                    </div>
                    {n.body && <p className="measure mt-1.5 whitespace-pre-line break-words text-[0.875rem] text-ink-2">{n.body}</p>}
                    {n.followUpDate && <p className="t-meta mt-1.5 inline-flex items-center gap-1"><CalendarClock className="size-3.5" aria-hidden /> Follow up {formatDate(n.followUpDate)}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
        <Section title="Add a note" description="Log each contact and set a follow-up reminder." className="min-w-0 @4xl:sticky @4xl:top-6">
          <NoteForm alumniKey={alum.key} jobs={jobOptions.map((j) => ({ id: j.jobId, label: `${j.title}, ${j.company}` }))} defaultJobId={linkedJob?.id ?? null} />
        </Section>
      </div>
    </article>
  );
}

/** The directory sometimes stores class year as a full date string; show just the year. */
function yearOf(v: string) {
  return String(v).match(/\b(19|20)\d{2}\b/)?.[0] ?? v;
}
