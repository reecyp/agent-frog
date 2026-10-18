import { alumniEmail } from "@/server/alumni";
import { activeStudentId } from "@/server/profile";

/**
 * Returns one alum's email address, only when the student asks to open a draft in their own
 * email app. Never rendered into pages, never logged, never sent to an AI model.
 */
export async function POST(_: Request, { params }: { params: Promise<{ key: string }> }) {
  await activeStudentId();
  const { key } = await params;
  if (!/^[a-f0-9]{16}$/.test(key)) return Response.json({ error: "Unknown contact." }, { status: 400 });
  const email = await alumniEmail(key);
  if (!email) return Response.json({ error: "No email address is on file for this alum." }, { status: 404 });
  return Response.json({ email }, { headers: { "Cache-Control": "no-store" } });
}
