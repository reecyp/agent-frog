"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { newId } from "@/server/ids";
import { activeStudentId, loadProfile } from "@/server/profile";
import { aiConfigured } from "@/server/ai/claude";
import { aiInterviewQuestions } from "@/server/ai/tasks";
import { recordAnswer } from "@/server/interview";
import { evidenceFrom } from "@/domain/profile";
import { QUESTION_FOCUSES, ruleQuestions, type QuestionFocus } from "@/domain/interview";
import type { ActionResult } from "@/app/actions";

export async function startSession(applicationId: string, focuses: QuestionFocus[] = QUESTION_FOCUSES): Promise<ActionResult<{ sessionId: string; note?: string }>> {
  focuses = QUESTION_FOCUSES.filter((f) => focuses.includes(f));
  if (!focuses.length) return { ok: false, error: "Pick at least one type of question." };
  const studentId = await activeStudentId();
  const db = await getDb();
  const [row] = await db.select({ app: schema.applications, job: schema.jobs }).from(schema.applications).innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(and(eq(schema.applications.id, applicationId), eq(schema.applications.studentId, studentId)));
  if (!row) return { ok: false, error: "Application not found." };
  const evidence = evidenceFrom(await loadProfile(studentId));
  let questions = ruleQuestions(row.job, evidence, focuses);
  let generator: "claude" | "rules" = "rules";
  let note: string | undefined;
  if (aiConfigured()) {
    try {
      const q = await aiInterviewQuestions(evidence, row.job, focuses);
      if (q.length >= 3) {
        questions = q.map((x, i) => ({ id: `q_${i}`, ...x }));
        generator = "claude";
      }
    } catch (e) {
      note = `Claude couldn't write questions (${(e as Error).message}). Using the standard set.`;
    }
  }
  const sessionId = newId("int");
  await db.insert(schema.interviewSessions).values({ id: sessionId, studentId, applicationId, generator, questions });
  revalidatePath(`/interview/${applicationId}`);
  return { ok: true, data: { sessionId, note } };
}

export async function submitAnswer(sessionId: string, questionId: string, answer: string, durationSeconds: number): Promise<ActionResult> {
  if (answer.trim().split(/\s+/).length < 8) return { ok: false, error: "Write at least a few sentences so there's something to give feedback on." };
  const saved = await recordAnswer(await activeStudentId(), sessionId, questionId, answer, durationSeconds, false);
  if ("error" in saved) return { ok: false, error: saved.error };
  revalidatePath("/interview/[appId]", "page");
  return { ok: true };
}

/** Deletes answers from a spoken run the student exited, so a half-finished run leaves nothing behind. */
export async function discardAnswers(sessionId: string, answerIds: string[]): Promise<ActionResult> {
  if (!answerIds.length) return { ok: true };
  const studentId = await activeStudentId();
  const db = await getDb();
  const [own] = await db.select({ id: schema.interviewSessions.id }).from(schema.interviewSessions)
    .where(and(eq(schema.interviewSessions.id, sessionId), eq(schema.interviewSessions.studentId, studentId)));
  if (!own) return { ok: false, error: "Practice session not found." };
  await db.delete(schema.interviewAnswers).where(and(eq(schema.interviewAnswers.sessionId, sessionId), inArray(schema.interviewAnswers.id, answerIds)));
  return { ok: true };
}
