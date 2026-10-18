import { activeStudentId } from "@/server/profile";
import { recordAnswer } from "@/server/interview";
import { speechConfigured, transcribe } from "@/server/speech";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * One spoken answer: audio in, transcript + feedback saved. A plain route (not a server action)
 * so several answers can be processed in parallel while the student moves on.
 */
export async function POST(request: Request) {
  const studentId = await activeStudentId();
  if (!speechConfigured()) return Response.json({ error: "Voice practice needs DEEPGRAM_API_KEY in .env.local." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  const sessionId = String(form?.get("sessionId") ?? "");
  const questionId = String(form?.get("questionId") ?? "");
  const duration = Math.max(0, Math.round(Number(form?.get("durationSeconds")) || 0));
  if (!(audio instanceof Blob) || audio.size === 0) return Response.json({ error: "No audio was recorded." }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "That recording is too long." }, { status: 413 });
  try {
    const transcript = await transcribe(audio);
    if (transcript.split(/\s+/).filter(Boolean).length < 3) return Response.json({ error: "No speech was picked up for this answer." }, { status: 422 });
    const saved = await recordAnswer(studentId, sessionId, questionId, transcript, duration, true);
    if ("error" in saved) return Response.json({ error: saved.error }, { status: 404 });
    return Response.json({ id: saved.id, transcript });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
