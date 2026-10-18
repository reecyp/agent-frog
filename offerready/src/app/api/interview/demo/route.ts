import { activeStudentId } from "@/server/profile";
import { recordDemoAnswer } from "@/server/interview";

/**
 * One demo answer: Claude writes it, the real evaluator scores it, and it's saved marked as a demo.
 * A plain route (not a server action) so several can run in parallel during spoken practice.
 */
export async function POST(request: Request) {
  const studentId = await activeStudentId();
  const body = (await request.json().catch(() => null)) as { sessionId?: string; questionId?: string; spoken?: boolean } | null;
  if (!body?.sessionId || !body.questionId) return Response.json({ error: "Missing question." }, { status: 400 });
  try {
    const saved = await recordDemoAnswer(studentId, body.sessionId, body.questionId, Boolean(body.spoken));
    if ("error" in saved) return Response.json({ error: saved.error }, { status: saved.error.startsWith("Demo answers need") ? 503 : 404 });
    return Response.json({ id: saved.id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
