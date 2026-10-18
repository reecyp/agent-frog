import "server-only";
import { cookies } from "next/headers";
import type { ImportResult } from "./importer";

/**
 * What the upload read, carried from the upload action to the questions page in a short-lived
 * cookie. The upload moves straight on to the questions, so this is how the student still sees it.
 */
export const IMPORT_COOKIE = "or_import";

export type ImportSummaryLine = Omit<ImportResult, "contact">;
export interface ImportSummary {
  resume: ImportSummaryLine;
  linkedin?: ImportSummaryLine;
}

// Cookies are capped near 4 KB, so the notes are trimmed.
const line = (r: ImportResult): ImportSummaryLine => ({
  parsedWith: r.parsedWith, experiences: r.experiences, bullets: r.bullets, notVerbatim: r.notVerbatim, aiError: r.aiError,
  uncertain: r.uncertain.slice(0, 5).map((u) => u.slice(0, 200)),
});

export async function saveImportSummary(resume: ImportResult, linkedin?: ImportResult) {
  const summary: ImportSummary = { resume: line(resume), linkedin: linkedin && line(linkedin) };
  (await cookies()).set(IMPORT_COOKIE, JSON.stringify(summary), { httpOnly: true, sameSite: "lax", path: "/start", maxAge: 60 * 15 });
}

export async function readImportSummary(): Promise<ImportSummary | null> {
  const raw = (await cookies()).get(IMPORT_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImportSummary;
  } catch {
    return null;
  }
}
