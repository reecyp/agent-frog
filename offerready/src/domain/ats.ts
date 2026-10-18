import type { AtsCheck, AtsReport, DocumentContent, EvidenceItem } from "./types";
import { allLines, PLACEHOLDER } from "./validate";
import { normalize, skillsIn } from "./text";

const DATE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December) \d{4}$|^Present$|^Summers? \d{4}(, \d{4})*$/;
const PHONE = /^(\(\d{3}\) \d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{3}\.\d{3}\.\d{4})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** The resume renderer only emits these section headings, in this order (Neeley template). */
export const RESUME_HEADINGS = ["EDUCATION", "EXPERIENCE", "LEADERSHIP AND COMMUNITY EXPERIENCE", "SKILLS"];

export interface AtsInputs {
  doc: DocumentContent;
  keywords: string[];
  evidence: EvidenceItem[];
  /** From the rendered PDF when available. */
  pdf?: { pageCount: number; extractedText: string } | null;
}

export function documentPlainText(doc: DocumentContent): string[] {
  // The exact reading order the renderer uses; also used to verify the PDF's extracted text.
  if (doc.kind === "resume") {
    const out: string[] = [doc.header.name.toUpperCase()];
    out.push(...RESUME_HEADINGS.slice(0, 1));
    for (const e of doc.education) out.push(e.school);
    if (doc.experience.length) out.push("EXPERIENCE");
    for (const e of doc.experience) {
      out.push(e.organization, e.title);
      out.push(...e.bullets.filter((b) => b.decision !== "removed").map((b) => b.text));
    }
    if (doc.leadership.length) out.push("LEADERSHIP AND COMMUNITY EXPERIENCE");
    for (const e of doc.leadership) {
      out.push(e.organization, e.title);
      out.push(...e.bullets.filter((b) => b.decision !== "removed").map((b) => b.text));
    }
    out.push("SKILLS", ...doc.skills.filter((s) => s.line.decision !== "removed").map((s) => s.line.text));
    return out;
  }
  return [
    doc.header.name,
    doc.greeting.text,
    ...doc.paragraphs.flatMap((p) => p.lines.filter((l) => l.decision !== "removed").map((l) => l.text)),
  ];
}

/** True when every fragment appears in the extracted text, in order. */
export function readingOrderIntact(fragments: string[], extracted: string): boolean {
  const hay = normalize(extracted).replace(/[^a-z0-9%$]+/g, "");
  let pos = 0;
  for (const f of fragments) {
    const needle = normalize(f).replace(/[^a-z0-9%$]+/g, "");
    if (!needle) continue;
    const at = hay.indexOf(needle, pos);
    if (at === -1) return false;
    pos = at + needle.length;
  }
  return true;
}

export function checkAts({ doc, keywords, evidence, pdf }: AtsInputs): AtsReport {
  const checks: AtsCheck[] = [];
  const add = (id: string, group: AtsCheck["group"], label: string, passed: boolean, detail: string) =>
    checks.push({ id, group, label, passed, detail });
  const lines = allLines(doc).filter((l) => l.decision !== "removed");

  // ----- Format -----
  add("single_column", "format", "Single column, no tables or graphics", true, "The export renderer only writes left-aligned text lines and right-aligned dates on the same baseline.");
  add("no_headers", "format", "No headers or footers", true, "Contact details are in the body, not a page header.");
  if (doc.kind === "resume") {
    add("headings", "format", "Standard section headings", true, `Uses ${RESUME_HEADINGS.map((h) => h.charAt(0) + h.slice(1).toLowerCase()).join(", ")}.`);
    const entries = [...doc.experience, ...doc.leadership];
    const badDates = entries.filter((e) => !DATE.test(e.startDate.trim()) || !DATE.test(e.endDate.trim()));
    add("dates", "format", "Dates include month and year", badDates.length === 0,
      badDates.length ? `Check dates for ${badDates.map((e) => e.organization).join(", ")}.` : "Every entry uses Month Year format.");
    const bulletCounts = entries.filter((e) => {
      const n = e.bullets.filter((b) => b.decision !== "removed").length;
      return n < 2 || n > 5;
    });
    add("bullet_count", "format", "Two to five bullets per entry", bulletCounts.length === 0,
      bulletCounts.length ? `${bulletCounts.map((e) => e.organization).join(", ")} ${bulletCounts.length === 1 ? "has" : "have"} too few or too many bullets.` : "Every entry has 2–5 bullets.");
    const long = lines.filter((l) => l.text.length > 210 && !doc.skills.some((s) => s.line.id === l.id));
    add("bullet_length", "format", "Bullets fit on two lines", long.length === 0, long.length ? `${long.length} bullet${long.length === 1 ? " runs" : "s run"} past two lines.` : "No bullet is longer than about two lines.");
    const firstWords = entries.flatMap((e) => e.bullets.filter((b) => b.decision !== "removed").map((b) => b.text.split(/\s+/)[0]?.toLowerCase()));
    const repeats = firstWords.filter((w, i) => w && firstWords.indexOf(w) !== i);
    add("action_verbs", "format", "Different action verb for each bullet", repeats.length === 0,
      repeats.length ? `Repeated opening verbs: ${[...new Set(repeats)].join(", ")}.` : "Each bullet opens with a different verb.");
  }
  add("contact", "format", "Contact information is complete", PHONE.test(doc.header.phone) && EMAIL.test(doc.header.email),
    PHONE.test(doc.header.phone) && EMAIL.test(doc.header.email) ? "Phone and email are in an accepted format." : "Use a phone like 817-257-7539 and a valid email address.");
  if (pdf) {
    add("one_page", "format", "One page", pdf.pageCount === 1, pdf.pageCount === 1 ? "The exported PDF is one page." : `The exported PDF is ${pdf.pageCount} pages. Remove or shorten lines.`);
    const intact = readingOrderIntact(documentPlainText(doc), pdf.extractedText);
    add("text_extraction", "format", "Text extracts cleanly from the PDF", intact,
      intact ? "Every line was read back out of the PDF in the right order." : "Some text didn't come back out of the PDF in order. Re-export before submitting.");
  }

  // ----- Keywords (only ones the student can honestly claim) -----
  const docText = lines.map((l) => l.text).join(" ");
  const inDoc = new Set(skillsIn(docText));
  const inEvidence = new Set(evidence.filter((e) => e.status !== "unverified").flatMap((e) => skillsIn(e.text)));
  const keywordCoverage = keywords.map((k) => ({ keyword: k, inDocument: inDoc.has(k), inEvidence: inEvidence.has(k) }));
  const claimableMissing = keywordCoverage.filter((k) => k.inEvidence && !k.inDocument);
  add("keywords_used", "keywords", "Posting keywords you have are in the document", claimableMissing.length === 0,
    claimableMissing.length ? `You have evidence for ${claimableMissing.map((k) => k.keyword).join(", ")} but it isn't on the page.` : "Every posting keyword backed by your profile appears.");
  const notClaimable = keywordCoverage.filter((k) => !k.inEvidence);
  add("keywords_honest", "keywords", "No keywords without evidence", true,
    notClaimable.length ? `Left out on purpose: ${notClaimable.map((k) => k.keyword).join(", ")} (not in your profile).` : "Every keyword is backed by your profile.");

  // ----- Accuracy -----
  const unsupported = lines.filter((l) => l.verification === "unsupported" && !l.issues.every((i) => i.code === "placeholder_unresolved"));
  add("claims", "accuracy", "Every claim traces to your profile", unsupported.length === 0,
    unsupported.length ? `${unsupported.length} line${unsupported.length === 1 ? "" : "s"} can't be traced to your evidence.` : "Each line cites evidence you confirmed.");
  const unconfirmed = lines.filter((l) => l.verification === "needs_review");
  add("confirmations", "accuracy", "Flagged lines confirmed by you", unconfirmed.length === 0,
    unconfirmed.length ? `${unconfirmed.length} line${unconfirmed.length === 1 ? " needs" : "s need"} your confirmation.` : "Nothing waiting on you.");
  const blanks = lines.filter((l) => { const r = PLACEHOLDER.test(l.text); PLACEHOLDER.lastIndex = 0; return r; });
  add("placeholders", "accuracy", "Personalization blanks filled in", blanks.length === 0,
    blanks.length ? `${blanks.length} blank${blanks.length === 1 ? "" : "s"} left to fill in.` : "No blanks remain.");

  return {
    checks,
    keywordCoverage,
    extractedTextMatches: pdf ? readingOrderIntact(documentPlainText(doc), pdf.extractedText) : null,
    checkedAt: new Date().toISOString(),
  };
}
