import "server-only";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { CoverLetterContent, DocLine, ResumeContent } from "@/domain/types";

// Letter size, in points.
const PAGE_W = 612;
const PAGE_H = 792;
const BLACK = rgb(0, 0, 0);

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

interface Layout {
  size: number;
  margin: number;
  lead: number; // line height multiplier
}

/** Larger, roomier settings first; the renderer steps down until the resume fits on one page. */
const LAYOUTS: Layout[] = [
  { size: 11, margin: 54, lead: 1.16 },
  { size: 11, margin: 43, lead: 1.12 },
  { size: 10.5, margin: 40, lead: 1.1 },
  { size: 10, margin: 36, lead: 1.08 },
];

/** Removes characters the standard PDF fonts (WinAnsi) cannot encode. */
export function sanitize(s: string): string {
  return s
    .replace(/[‐-‒]/g, "-")
    .replace(/ /g, " ")
    .replace(/[^\x20-\x7E¡-ÿ–—‘’“”•…€]/g, "");
}

type Segment = { text: string; font: PDFFont };

class Writer {
  page: PDFPage;
  y: number;
  pages: PDFPage[] = [];
  constructor(private doc: PDFDocument, public f: Fonts, public L: Layout) {
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.y = PAGE_H - L.margin;
  }
  get lh() {
    return this.L.size * this.L.lead;
  }
  get right() {
    return PAGE_W - this.L.margin;
  }
  ensure(h: number) {
    if (this.y - h < this.L.margin) {
      this.page = this.doc.addPage([PAGE_W, PAGE_H]);
      this.pages.push(this.page);
      this.y = PAGE_H - this.L.margin;
    }
  }
  gap(points: number) {
    this.y -= points;
  }
  width(segs: Segment[], size = this.L.size) {
    return segs.reduce((w, s) => w + s.font.widthOfTextAtSize(sanitize(s.text), size), 0);
  }
  draw(segs: Segment[], x: number, size = this.L.size) {
    // Merge adjacent words in the same font into one text run, so parsers read whole lines, not single words.
    const runs: Segment[] = [];
    for (const s of segs) {
      const last = runs[runs.length - 1];
      if (last && last.font === s.font) last.text += s.text;
      else runs.push({ ...s });
    }
    let cx = x;
    for (const s of runs) {
      const t = sanitize(s.text);
      if (!t) continue;
      this.page.drawText(t, { x: cx, y: this.y, size, font: s.font, color: BLACK });
      cx += s.font.widthOfTextAtSize(t, size);
    }
  }
  /** One line with left content and optional right-aligned content (dates, city) on the same baseline. */
  row(left: Segment[], rightText?: string, rightFont?: PDFFont) {
    this.ensure(this.lh);
    this.y -= this.L.size;
    this.draw(left, this.L.margin);
    if (rightText) {
      const font = rightFont ?? this.f.regular;
      const w = font.widthOfTextAtSize(sanitize(rightText), this.L.size);
      this.draw([{ text: rightText, font }], this.right - w);
    }
    this.y -= this.lh - this.L.size;
  }
  centered(text: string, font: PDFFont, size: number) {
    this.ensure(size * this.L.lead);
    this.y -= size;
    const w = font.widthOfTextAtSize(sanitize(text), size);
    this.draw([{ text, font }], (PAGE_W - w) / 2, size);
    this.y -= size * this.L.lead - size;
  }
  /** Word-wraps segments into the column. `indent` is applied to continuation lines too (hanging). */
  paragraph(segs: Segment[], opts: { x?: number; bullet?: boolean } = {}) {
    const x0 = (opts.x ?? this.L.margin) + (opts.bullet ? 13 : 0);
    const maxW = this.right - x0;
    const words: Segment[] = [];
    for (const s of segs) for (const w of sanitize(s.text).split(/(\s+)/)) if (w) words.push({ text: w, font: s.font });
    let line: Segment[] = [];
    let first = true;
    const flush = () => {
      while (line.length && /^\s+$/.test(line[line.length - 1].text)) line.pop();
      if (!line.length) return;
      this.ensure(this.lh);
      this.y -= this.L.size;
      if (first && opts.bullet) this.draw([{ text: "•", font: this.f.regular }], x0 - 13);
      this.draw(line, x0);
      this.y -= this.lh - this.L.size;
      first = false;
      line = [];
    };
    for (const w of words) {
      if (!line.length && /^\s+$/.test(w.text)) continue;
      if (this.width([...line, w]) > maxW && line.length) flush();
      if (!line.length && /^\s+$/.test(w.text)) continue;
      line.push(w);
    }
    flush();
  }
  heading(text: string) {
    this.ensure(this.lh + 4);
    this.y -= this.L.size;
    this.draw([{ text, font: this.f.bold }], this.L.margin);
    this.y -= 2.5;
    this.page.drawLine({ start: { x: this.L.margin, y: this.y }, end: { x: this.right, y: this.y }, thickness: 0.75, color: BLACK });
    this.y -= this.lh - this.L.size - 1;
  }
}

async function fonts(doc: PDFDocument): Promise<Fonts> {
  return {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
}

const live = (lines: DocLine[]) => lines.filter((l) => l.decision !== "removed");

function contactLine(h: ResumeContent["header"]) {
  return [h.phone, h.email].filter(Boolean).join(" | ");
}

async function renderResumeWith(content: ResumeContent, L: Layout) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${content.header.name} Resume`);
  doc.setAuthor(content.header.name);
  doc.setProducer("OfferReady");
  const f = await fonts(doc);
  const w = new Writer(doc, f, L);

  w.centered(content.header.name.toUpperCase(), f.bold, 14);
  w.centered(contactLine(content.header), f.regular, L.size);
  if (content.header.linkedin) w.centered(content.header.linkedin, f.regular, L.size);
  w.gap(L.size * 0.7);

  w.heading("EDUCATION");
  for (const e of content.education) {
    w.row([{ text: `${e.school},`, font: f.bold }, { text: e.college ? ` ${e.college}` : "", font: f.regular }], e.city);
    w.row([{ text: e.degree, font: f.regular }], e.graduation);
    const studies = [e.majors && `Major: ${e.majors}`, e.minors && `Minor: ${e.minors}`].filter(Boolean).join("; ");
    if (studies || e.gpa) w.row([{ text: studies, font: f.regular }], e.gpa ? `GPA: ${e.gpa}` : undefined);
    if (e.honors) w.paragraph([{ text: "Honors/Awards: ", font: f.italic }, { text: e.honors, font: f.regular }]);
    if (e.coursework) w.paragraph([{ text: "Relevant Coursework: ", font: f.italic }, { text: e.coursework, font: f.regular }]);
  }

  const section = (title: string, entries: ResumeContent["experience"]) => {
    const withBullets = entries.filter((e) => live(e.bullets).length > 0);
    if (!withBullets.length) return;
    w.gap(L.size * 0.7);
    w.heading(title);
    withBullets.forEach((e, i) => {
      if (i > 0) w.gap(L.size * 0.55);
      w.row([{ text: `${e.organization},`, font: f.bold }, { text: e.city ? ` ${e.city}` : "", font: f.regular }], `${e.startDate} – ${e.endDate}`);
      w.row([{ text: e.title, font: f.italic }]);
      for (const b of live(e.bullets)) w.paragraph([{ text: b.text, font: f.regular }], { bullet: true });
    });
  };
  section("EXPERIENCE", content.experience);
  section("LEADERSHIP AND COMMUNITY EXPERIENCE", content.leadership);

  const skills = content.skills.filter((s) => s.line.decision !== "removed");
  if (skills.length) {
    w.gap(L.size * 0.7);
    w.heading("SKILLS");
    for (const s of skills) w.paragraph([{ text: `${s.label}: `, font: f.italic }, { text: s.line.text, font: f.regular }]);
  }
  return { doc, pageCount: w.pages.length };
}

export async function renderResumePdf(content: ResumeContent): Promise<{ bytes: Uint8Array; pageCount: number; fontSize: number }> {
  let last: { doc: PDFDocument; pageCount: number } | null = null;
  let used = LAYOUTS[0];
  for (const L of LAYOUTS) {
    last = await renderResumeWith(content, L);
    used = L;
    if (last.pageCount === 1) break;
  }
  const bytes = await last!.doc.save();
  return { bytes, pageCount: last!.pageCount, fontSize: used.size };
}

export async function renderCoverLetterPdf(content: CoverLetterContent): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${content.header.name} Cover Letter`);
  doc.setAuthor(content.header.name);
  doc.setProducer("OfferReady");
  const f = await fonts(doc);
  const L: Layout = { size: 11, margin: 72, lead: 1.2 };
  const w = new Writer(doc, f, L);
  // Same heading as the resume, per the TCU cover letter guide.
  w.centered(content.header.name.toUpperCase(), f.bold, 14);
  w.centered(contactLine(content.header), f.regular, L.size);
  if (content.header.linkedin) w.centered(content.header.linkedin, f.regular, L.size);
  w.gap(L.size * 1.2);
  w.paragraph([{ text: content.date, font: f.regular }]);
  w.gap(L.size * 0.8);
  for (const r of content.recipient) w.paragraph([{ text: r, font: f.regular }]);
  w.gap(L.size * 0.8);
  w.paragraph([{ text: content.greeting.text, font: f.regular }]);
  for (const p of content.paragraphs) {
    const text = live(p.lines).map((l) => l.text).join(" ");
    if (!text.trim()) continue;
    w.gap(L.size * 0.8);
    w.paragraph([{ text, font: f.regular }]);
  }
  w.gap(L.size * 0.8);
  w.paragraph([{ text: content.signoff, font: f.regular }]);
  w.gap(L.size * 2);
  w.paragraph([{ text: content.header.name, font: f.regular }]);
  const bytes = await doc.save();
  return { bytes, pageCount: w.pages.length };
}

/** Reads text back out of a rendered PDF, the way an ATS parser would. */
export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: Array.isArray(text) ? text.join("\n") : text, pages: totalPages };
}
