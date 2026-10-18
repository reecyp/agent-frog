import type { JobRequirement } from "./types";
import { normalize, skillsIn } from "./text";

/** Converts posting HTML (including entity-escaped HTML from Greenhouse) to plain text with line structure. */
export function htmlToText(html: string): string {
  let s = html;
  if (/&lt;\/?[a-z]/i.test(s)) s = decodeEntities(s); // Greenhouse returns escaped HTML
  s = s
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|h[1-6]|ul|ol|li|section|tr)\s*>/gi, "\n")
    .replace(/<\s*(p|div|h[1-6]|ul|ol|section|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter((l, i, arr) => l.length > 0 || (i > 0 && arr[i - 1].length > 0))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

const REQUIRED_HEADINGS =
  /^(requirements|qualifications|minimum qualifications|basic qualifications|required qualifications|what you('|’)ll need|what you bring|what we('|’)re looking for|who you are|you (have|might be|are)|about you|skills|your background|we('|’)d love to hear from you if|must have)/i;
const PREFERRED_HEADINGS =
  /^(preferred|nice to have|bonus|preferred qualifications|plus(es)?|it('|’)s a plus|ideally you|extra credit)/i;
const STOP_HEADINGS =
  /^(benefits|perks|compensation|pay|salary|about (us|the company|[a-z]+)$|equal opportunity|eeo|our (values|culture)|why join|what we offer|the (base )?pay|location|how to apply)/i;
const DUTY_HEADINGS = /^(responsibilities|what you('|’)ll do|in this role|the role|your impact|day to day|key responsibilities)/i;

function classify(text: string): JobRequirement["kind"] {
  if (/\b(degree|bachelor|major|gpa|graduat|enrolled|junior|senior|student|class of)\b/i.test(text)) return "education";
  if (/\b(\d+\+?\s*years?|experience (in|with)|prior (internship|experience))\b/i.test(text)) return "experience";
  if (skillsIn(text).length > 0 && /\b(proficien|knowledge|familiar|skills?|experience with|using)\b/i.test(text)) return "skill";
  if (/\b(detail|communicat|curious|self[- ]starter|team|collaborat|ownership|motivated|organized)\b/i.test(text)) return "trait";
  return "other";
}

function isHeading(line: string): boolean {
  const clean = line.replace(/[:：]\s*$/, "").trim();
  return clean.length > 0 && clean.length < 70 && !clean.startsWith("•") && !/[.!?]$/.test(clean);
}

/**
 * Extracts requirement statements from posting text. Each requirement's `quote` is a verbatim
 * line from the posting, so the change summary can cite it exactly.
 */
export function extractRequirements(postingText: string, max = 10): JobRequirement[] {
  const lines = postingText.split("\n").map((l) => l.trim()).filter(Boolean);
  type Mode = "none" | "required" | "preferred" | "duty" | "stop";
  let mode: Mode = "none";
  const picked: { text: string; preferred: boolean; duty: boolean }[] = [];

  for (const raw of lines) {
    const line = raw.replace(/^[•*\-–]\s*/, "").trim();
    if (isHeading(raw)) {
      const h = raw.replace(/[:：]\s*$/, "").trim();
      if (PREFERRED_HEADINGS.test(h)) mode = "preferred";
      else if (REQUIRED_HEADINGS.test(h)) mode = "required";
      else if (DUTY_HEADINGS.test(h)) mode = "duty";
      else if (STOP_HEADINGS.test(h)) mode = "stop";
      continue;
    }
    if (mode === "none" || mode === "stop") continue;
    if (line.length < 12 || line.length > 320) continue;
    picked.push({ text: line, preferred: mode === "preferred", duty: mode === "duty" });
  }

  // Fall back to bullet lines anywhere if the posting has no recognizable sections.
  if (picked.filter((p) => !p.duty).length === 0) {
    for (const raw of lines) {
      if (!raw.startsWith("•")) continue;
      const line = raw.replace(/^•\s*/, "");
      if (line.length >= 12 && line.length <= 320) picked.push({ text: line, preferred: false, duty: false });
    }
  }

  // Requirements first, then preferred, then duties; de-duplicate near-identical lines.
  const ordered = [
    ...picked.filter((p) => !p.duty && !p.preferred),
    ...picked.filter((p) => p.preferred),
    ...picked.filter((p) => p.duty),
  ];
  const seen = new Set<string>();
  const out: JobRequirement[] = [];
  for (const p of ordered) {
    const key = normalize(p.text).slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `req_${out.length + 1}`,
      quote: p.text,
      keywords: skillsIn(p.text),
      kind: classify(p.text),
      preferred: p.preferred,
    });
    if (out.length >= max) break;
  }
  return out;
}

/** The 3–5 qualifications or keywords the posting emphasizes most, by frequency across the posting. */
export function topKeywords(postingText: string, requirements: JobRequirement[], n = 5): string[] {
  const counts = new Map<string, number>();
  for (const r of requirements) {
    for (const k of r.keywords) counts.set(k, (counts.get(k) ?? 0) + (r.preferred ? 1 : 2));
  }
  for (const k of skillsIn(postingText)) counts.set(k, (counts.get(k) ?? 0) + 1);
  // Generic traits are weaker signals than tools and domain skills.
  const generic = new Set(["Communication", "Teamwork", "Leadership", "Reporting", "Customer service", "Operations"]);
  return [...counts.entries()]
    .sort((a, b) => b[1] - (generic.has(b[0]) ? 1.5 : 0) - (a[1] - (generic.has(a[0]) ? 1.5 : 0)))
    .slice(0, n)
    .map(([k]) => k);
}

/** Flags "entry-level" postings that ask for several years of experience. */
export function seniorityMismatch(postingText: string, title = ""): string | null {
  if (/\b(ph\.?d|doctoral|mba|master'?s|ms\/phd|m\.s\.)\b/i.test(title)) return "Asks for a graduate degree";
  const m = postingText.match(/\b(\d+)\+?\s*(?:-\s*\d+\s*)?years?\s+(?:of\s+)?(?:professional\s+|relevant\s+|work\s+|full[- ]time\s+)?experience/i);
  if (m && Number(m[1]) >= 3) return `Asks for ${m[1]}+ years of experience`;
  return null;
}
