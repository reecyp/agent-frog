import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { loadProfile } from "../profile";
import { assessCoverage } from "@/domain/matching";
import { declinedRequirements, evidenceFrom } from "@/domain/profile";
import { topKeywords } from "@/domain/requirements";

export async function jobWithMatch(studentId: string, jobId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ job: schema.jobs, match: schema.jobMatches })
    .from(schema.jobs)
    .leftJoin(schema.jobMatches, and(eq(schema.jobMatches.jobId, schema.jobs.id), eq(schema.jobMatches.studentId, studentId)))
    .where(eq(schema.jobs.id, jobId));
  if (!row) return null;
  const [app] = await db.select({ id: schema.applications.id, status: schema.applications.status }).from(schema.applications).where(and(eq(schema.applications.jobId, jobId), eq(schema.applications.studentId, studentId)));
  const profile = await loadProfile(studentId);
  const evidence = evidenceFrom(profile);
  const declined = declinedRequirements(profile);
  const coverage = row.job.requirements.map((r) => ({ requirement: r, ...assessCoverage(r, evidence, declined) }));
  await db.update(schema.jobMatches).set({ lastViewedAt: new Date() }).where(and(eq(schema.jobMatches.jobId, jobId), eq(schema.jobMatches.studentId, studentId)));
  return { ...row, application: app ?? null, coverage, evidence, keywords: topKeywords(row.job.description, row.job.requirements) };
}

export async function jobsByIds(studentId: string, ids: string[]) {
  const db = await getDb();
  if (!ids.length) return [];
  return db
    .select({ job: schema.jobs, match: schema.jobMatches })
    .from(schema.jobs)
    .leftJoin(schema.jobMatches, and(eq(schema.jobMatches.jobId, schema.jobs.id), eq(schema.jobMatches.studentId, studentId)))
    .where(inArray(schema.jobs.id, ids));
}
