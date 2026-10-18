import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { newId } from "./ids";
import { loadProfile } from "./profile";
import { aiConfigured } from "./ai/claude";
import { aiDemoInterviewAnswer, aiInterviewFeedback } from "./ai/tasks";
import { logAi } from "./applications";
import { evidenceFrom } from "@/domain/profile";
import { countFillers, ruleFeedback } from "@/domain/interview";

async function sessionQuestion(studentId: string, sessionId: string, questionId: string) {
  const db = await getDb();
  const [s] = await db.select({ s: schema.interviewSessions, job: schema.jobs }).from(schema.interviewSessions)
    .innerJoin(schema.applications, eq(schema.applications.id, schema.interviewSessions.applicationId))
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .where(and(eq(schema.interviewSessions.id, sessionId), eq(schema.interviewSessions.studentId, studentId)));
  if (!s) return { error: "Practice session not found." };
  const q = s.s.questions.find((x) => x.id === questionId);
  if (!q) return { error: "Question not found." };
  return { session: s.s, job: s.job, question: q };
}

/** Scores one answer (typed or a spoken transcript) and saves it to the session. `demo` marks an answer Claude wrote. */
export async function recordAnswer(studentId: string, sessionId: string, questionId: string, answer: string, durationSeconds: number, spoken: boolean, demo = false): Promise<{ id: string } | { error: string }> {
  const db = await getDb();
  const found = await sessionQuestion(studentId, sessionId, questionId);
  if (found.error !== undefined) return { error: found.error };
  const { session, job, question: q } = found;
  const evidence = evidenceFrom(await loadProfile(studentId));
  const reqQuote = q.text.match(/"([^"]+)"/)?.[1];
  let feedback: Record<string, unknown> = { ...ruleFeedback(q.text, answer, evidence, reqQuote), generator: "rules", spoken, demo };
  if (aiConfigured()) {
    try {
      const fb = await aiInterviewFeedback(evidence, job, q.text, answer, spoken);
      feedback = { ...fb, fillers: countFillers(answer), wordCount: answer.trim().split(/\s+/).length, generator: "claude", spoken, demo };
    } catch (e) {
      await logAi(studentId, session.applicationId, "ai_error", "Claude interview feedback failed; used rule-based feedback.", { error: (e as Error).message });
    }
  }
  const id = newId("ans");
  await db.insert(schema.interviewAnswers).values({ id, sessionId, questionId, answer: answer.trim(), durationSeconds, feedback, rating: Number(feedback.rating) });
  return { id };
}

/**
 * Has Claude write a demo answer to one question, then scores and saves it like a real one. The
 * answer is marked as a demo everywhere it shows, so it's never mistaken for the student's own.
 */
export async function recordDemoAnswer(studentId: string, sessionId: string, questionId: string, spoken: boolean): Promise<{ id: string } | { error: string }> {
  if (!aiConfigured()) return { error: "Demo answers need Claude. Add ANTHROPIC_API_KEY to .env.local." };
  const found = await sessionQuestion(studentId, sessionId, questionId);
  if (found.error !== undefined) return { error: found.error };
  const evidence = evidenceFrom(await loadProfile(studentId));
  const answer = await aiDemoInterviewAnswer(evidence, found.job, found.question.text, spoken);
  // About as long as it would take to say out loud (150 words a minute).
  const seconds = Math.round((answer.trim().split(/\s+/).length / 150) * 60);
  return recordAnswer(studentId, sessionId, questionId, answer, seconds, spoken, true);
}
