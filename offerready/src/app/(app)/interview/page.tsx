import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { activeStudentId } from "@/server/profile";
import { listApplications } from "@/server/applications";
import { APPLICATION_STATUSES } from "@/domain/types";
import { EmptyState, ListSkeleton, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Interview practice" };

export default function InterviewIndex() {
  return (
    <>
      <PageHeader title="Interview practice" lede="Practice with questions written from a specific posting and your real experience. Pick the role you're preparing for." />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Picker />
      </Suspense>
    </>
  );
}

async function Picker() {
  const apps = await listApplications(await activeStudentId());
  if (!apps.length) return <EmptyState icon={MessagesSquare} title="No roles to practice for" body="Start an application first; practice questions come from that posting." action={<Link href="/discover" className="btn btn-primary">Discover jobs</Link>} />;
  const order = ["interviewing", "applied", "ready", "preparing", "saved", "interested", "offer", "accepted", "rejected", "withdrawn"];
  return (
    <ul className="list max-w-[52rem]" aria-label="Roles">
      {[...apps].sort((a, b) => order.indexOf(a.app.status) - order.indexOf(b.app.status)).map((a) => {
        const label = APPLICATION_STATUSES.find((s) => s.value === a.app.status)?.label ?? a.app.status;
        return (
          <li key={a.app.id}>
            <Link href={`/interview/${a.app.id}`} className="group flex items-center gap-3 px-4 py-3.5 transition-colors [li:first-child_&]:rounded-t-[11px] [li:last-child_&]:rounded-b-[11px] hover:bg-[var(--bg-subtle)]">
              <span className="min-w-0 flex-1">
                <span className="block break-words font-semibold leading-snug group-hover:text-[var(--accent)]">{a.job.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.875rem] text-[var(--ink-2)]">
                  <span className="break-words">{a.job.company}</span>
                  <span className={`badge ${a.app.status === "interviewing" ? "badge-accent" : "badge-neutral"}`}>{label}</span>
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-[var(--ink-3)] group-hover:text-[var(--accent)]" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
