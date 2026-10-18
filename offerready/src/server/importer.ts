import "server-only";
import { getDb, schema } from "./db";
import { newId } from "./ids";
import { aiConfigured } from "./ai/claude";
import { aiParseResume } from "./ai/tasks";
import { parseResumeText, type ParsedResume } from "@/domain/resumeParse";
import { normalize } from "@/domain/text";
import { sameExperience, similarBullets } from "@/domain/experiences";

const MAX_BYTES = 5 * 1024 * 1024;

export async function extractText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
  const buf = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await pdfText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return value;
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) return new TextDecoder().decode(buf);
  throw new Error(`${file.name}: upload a PDF, DOCX or TXT file.`);
}

export interface ImportResult {
  parsedWith: "claude" | "rules";
  experiences: number;
  bullets: number;
  notVerbatim: number;
  uncertain: string[];
  contact: ParsedResume["contact"];
  aiError?: string;
}

/**
 * Stores the original file untouched, parses it, and writes every fact as "extracted" so the
 * student must confirm it. AI-parsed bullets that don't appear word-for-word in the file are
 * marked unverified instead of being trusted.
 */
/** A role already in the profile, so a LinkedIn import can add to it instead of listing it twice. */
export interface ExistingExperience {
  id: string;
  organization: string;
  title: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export async function importDocument(studentId: string, file: File, kind: "resume" | "linkedin", existing: ExistingExperience[]): Promise<ImportResult> {
  const text = await extractText(file);
  if (text.trim().length < 80) throw new Error(`${file.name} has almost no readable text. If it's a scanned image, export a text-based PDF instead.`);
  const db = await getDb();
  const docId = newId("src");
  await db.insert(schema.sourceDocuments).values({
    id: docId, studentId, kind, filename: file.name, mimeType: file.type || "application/octet-stream",
    fileBase64: Buffer.from(await file.arrayBuffer()).toString("base64"), originalText: text,
  });

  let parsed: ParsedResume = parseResumeText(text);
  let parsedWith: "claude" | "rules" = "rules";
  let aiError: string | undefined;
  if (aiConfigured()) {
    try {
      parsed = await aiParseResume(text);
      parsedWith = "claude";
    } catch (e) {
      aiError = (e as Error).message;
    }
  }

  const haystack = normalize(text).replace(/[^a-z0-9%$]+/g, "");
  const verbatim = (s: string) => haystack.includes(normalize(s).replace(/[^a-z0-9%$]+/g, ""));
  const provenance = kind === "linkedin" ? "linkedin" : "resume";
  let bullets = 0;
  let notVerbatim = 0;
  let experiences = 0;

  // Rows are collected and written in one insert per table: each query is a network round trip on Neon.
  const educationRows: (typeof schema.education.$inferInsert)[] = [];
  const experienceRows: (typeof schema.experiences.$inferInsert)[] = [];
  const bulletRows: (typeof schema.bullets.$inferInsert)[] = [];
  if (kind === "resume" || existing.length === 0) {
    for (const [i, e] of parsed.education.entries()) {
      educationRows.push({ id: newId("edu"), studentId, ...e, status: "extracted", provenance, sortOrder: i });
    }
  }
  for (const [i, x] of parsed.experiences.entries()) {
    // From LinkedIn, a role the resume already has (often named a little differently) gains only
    // the bullets it was missing; it is never listed a second time.
    const match = kind === "linkedin" ? existing.find((e) => sameExperience(e, x)) : undefined;
    if (match) {
      const fresh = x.bullets.filter((b) => !match.bullets.some((m) => similarBullets(m, b)));
      for (const [j, b] of fresh.entries()) {
        const ok = verbatim(b);
        if (!ok) notVerbatim++;
        bullets++;
        bulletRows.push({ id: newId("b"), studentId, experienceId: match.id, text: b, originalText: b, status: ok ? "extracted" : "unverified", provenance, sortOrder: 100 + j });
        match.bullets.push(b);
      }
      continue;
    }
    const expId = newId("exp");
    experienceRows.push({
      id: expId, studentId, section: x.section, organization: x.organization, city: x.city, title: x.title || "(title not found)",
      startDate: x.startDate, endDate: x.endDate, status: "extracted", provenance, sourceDocumentId: docId, sortOrder: 100 + i,
    });
    experiences++;
    for (const [j, b] of x.bullets.entries()) {
      const ok = verbatim(b);
      if (!ok) notVerbatim++;
      bullets++;
      bulletRows.push({ id: newId("b"), studentId, experienceId: expId, text: b, originalText: b, status: ok ? "extracted" : "unverified", provenance, sortOrder: j });
    }
  }
  const skillRows: (typeof schema.skills.$inferInsert)[] = parsed.skills.map((s, i) => ({ id: newId("sk"), studentId, ...s, status: "extracted", provenance, sortOrder: i }));

  // Experiences first: bullets reference them.
  await Promise.all([
    educationRows.length ? db.insert(schema.education).values(educationRows) : null,
    experienceRows.length ? db.insert(schema.experiences).values(experienceRows) : null,
    skillRows.length ? db.insert(schema.skills).values(skillRows) : null,
  ]);
  if (bulletRows.length) await db.insert(schema.bullets).values(bulletRows);
  return { parsedWith, experiences, bullets, notVerbatim, uncertain: parsed.uncertain, contact: parsed.contact, aiError };
}
