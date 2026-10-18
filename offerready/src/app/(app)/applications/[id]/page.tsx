import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { activeStudentId } from "@/server/profile";
import { ListSkeleton } from "@/components/ui";

/** Applications live on their job's page now; old links (reminders, AI log, overview) land there. */
export default function ApplicationRedirect({ params, searchParams }: PageProps<"/applications/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={2} />}>
      <Redirect params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Redirect({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<never> {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const studentId = await activeStudentId();
  const db = await getDb();
  const [app] = await db.select({ jobId: schema.applications.jobId }).from(schema.applications).where(and(eq(schema.applications.id, id), eq(schema.applications.studentId, studentId)));
  if (!app) notFound();
  const query = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"));
  redirect(`/jobs/${app.jobId}${query.size ? `?${query}` : ""}`);
}
