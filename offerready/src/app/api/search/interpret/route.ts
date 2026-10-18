import { z } from "zod";
import { activeStudentId } from "@/server/profile";
import { interpret } from "@/server/jobs/search";

const Body = z.object({ query: z.string().trim().min(3).max(600) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Describe what you're looking for in a few words." }, { status: 400 });
  const studentId = await activeStudentId();
  return Response.json(await interpret(studentId, parsed.data.query));
}
