import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BackLink } from "@/components/shell/BackLink";
import { activeStudentId } from "@/server/profile";
import { jobsByIds } from "@/server/jobs/read";
import { topKeywords } from "@/domain/requirements";
import { relativeDays } from "@/domain/jobs";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Compare jobs" };

export default function ComparePage({ searchParams }: PageProps<"/jobs/compare">) {
  return (
    <>
      <BackLink fallbackHref="/discover" fallbackLabel="jobs" />
      <PageHeader
        title="Compare jobs"
        lede="Side by side: what each posting asks for, and where your profile is strongest."
      />
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <Compare searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Compare({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const ids = (typeof sp.ids === "string" ? sp.ids.split(",") : []).filter(Boolean).slice(0, 3);
  const rows = await jobsByIds(await activeStudentId(), ids);
  if (rows.length < 2) return <EmptyState title="Pick at least two jobs" body="Use the Compare checkbox on job cards in Discover." action={<Link href="/discover" className="btn btn-secondary">Back to Discover</Link>} />;
  const fields: { label: string; render: (r: (typeof rows)[number]) => React.ReactNode }[] = [
    { label: "Where", render: (r) => `${r.job.location || "Not stated"} (${r.job.arrangement === "unknown" ? "arrangement not stated" : r.job.arrangement})` },
    { label: "Posted", render: (r) => relativeDays(r.job.postedAt) },
    { label: "Source", render: (r) => r.job.sourceLabel },
    { label: "Strongest match", render: (r) => r.match?.strongestMatch ? <><q className="italic">{r.match.strongestMatch.requirementQuote}</q><span className="mt-1 block text-[var(--ink-2)]">You: {r.match.strongestMatch.evidenceText}</span></> : "None found" },
    { label: "Keywords", render: (r) => <ul className="flex flex-wrap gap-1.5">{topKeywords(r.job.description, r.job.requirements).map((k) => <li key={k} className="rounded-[6px] bg-[var(--bg-muted)] px-2 py-0.5 text-[0.75rem] font-medium text-[var(--ink-2)]">{k}</li>)}</ul> },
    { label: "Pay", render: (r) => r.job.compensation || "Not listed" },
  ];
  return (
    <div className="panel overflow-x-auto" role="region" aria-label="Job comparison, scrolls sideways on narrow screens" tabIndex={0}>
      <table className="w-full min-w-[42rem] table-fixed border-collapse text-left text-[0.875rem]">
        <caption className="sr-only">Job comparison</caption>
        <colgroup>
          <col className="w-32" />
          {rows.map((r) => <col key={r.job.id} />)}
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--bg-subtle)]">
            <th scope="col" className="px-4 py-3"><span className="sr-only">Field</span></th>
            {rows.map((r) => (
              <th key={r.job.id} scope="col" className="px-4 py-3 align-bottom font-normal">
                <Link href={`/jobs/${r.job.id}`} className="t-card block break-words hover:text-[var(--accent)] hover:underline underline-offset-4">{r.job.title}</Link>
                <p className="t-meta mt-0.5">{r.job.company}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.label} className="border-t border-[var(--line)] align-top first:border-t-0">
              <th scope="row" className="t-label px-4 py-3">{f.label}</th>
              {rows.map((r) => <td key={r.job.id} className="px-4 py-3 break-words">{f.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
