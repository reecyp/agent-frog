import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { applicationEvents, gapAnalysis, jobContext, latestDocuments } from "./applications";
import { aiConfigured } from "./ai/claude";
import { reviewState } from "@/domain/validate";

/** Everything the application workspace renders, gathered in one place. */
export async function loadApplicationView(studentId: string, applicationId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ app: schema.applications, job: schema.jobs })
    .from(schema.applications)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(and(eq(schema.applications.id, applicationId), eq(schema.applications.studentId, studentId)));
  if (!row) return null;
  const [{ coverage, evidence }, docs, events, tasks] = await Promise.all([
    gapAnalysis(studentId, applicationId),
    latestDocuments(applicationId),
    applicationEvents(applicationId),
    db.select().from(schema.tasks).where(and(eq(schema.tasks.studentId, studentId), eq(schema.tasks.applicationId, applicationId))).orderBy(asc(schema.tasks.dueDate)),
  ]);
  const ctx = jobContext(row.job);
  return {
    ...row,
    coverage,
    evidence,
    keywords: ctx.keywords,
    resume: docs.resume ? { ...docs.resume, review: reviewState(docs.resume.content) } : null,
    coverLetter: docs.cover_letter ? { ...docs.cover_letter, review: reviewState(docs.cover_letter.content) } : null,
    events,
    tasks,
    aiConfigured: aiConfigured(),
  };
}

export type ApplicationView = NonNullable<Awaited<ReturnType<typeof loadApplicationView>>>;
