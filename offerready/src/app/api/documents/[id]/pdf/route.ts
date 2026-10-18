import { activeStudentId } from "@/server/profile";
import { WorkflowError, exportPdf } from "@/server/applications";

/** Clean export: rendered fresh from approved content. Unapproved documents are refused. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { bytes, filename } = await exportPdf(await activeStudentId(), id);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const status = e instanceof WorkflowError ? 403 : 500;
    return new Response((e as Error).message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
