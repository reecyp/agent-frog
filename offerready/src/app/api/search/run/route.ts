import { z } from "zod";
import { activeStudentId } from "@/server/profile";
import { runSearch, type SearchEvent } from "@/server/jobs/search";

const Filters = z.object({
  titles: z.array(z.string().max(80)).max(20),
  keywords: z.array(z.string().max(80)).max(12),
  jobTypes: z.array(z.enum(["internship", "full_time", "unknown"])),
  locations: z.array(z.string().max(80)).max(10),
  arrangements: z.array(z.enum(["remote", "hybrid", "onsite", "unknown"])),
  companies: z.array(z.string().max(80)).max(10),
  postedWithinDays: z.number().int().positive().max(365).nullable(),
});
const Body = z.object({ query: z.string().max(600), filters: Filters, interpretedBy: z.enum(["claude", "rules"]) });

/** Streams real pipeline progress as newline-delimited JSON. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Those filters couldn't be read. Adjust them and try again." }, { status: 400 });
  if (parsed.data.filters.titles.length === 0 && parsed.data.filters.keywords.length === 0) {
    return Response.json({ error: "Add at least one job title or keyword to search for." }, { status: 400 });
  }
  const studentId = await activeStudentId();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: SearchEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        await runSearch(studentId, parsed.data.query, parsed.data.filters, parsed.data.interpretedBy, send);
      } catch (e) {
        send({ type: "error", message: `The search stopped: ${(e as Error).message}` });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
