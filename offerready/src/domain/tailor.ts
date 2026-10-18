import type {
  ChangeSummaryItem,
  CoverLetterContent,
  DocLine,
  EvidenceItem,
  JobRequirement,
  ResumeContent,
  ResumeEntry,
  Transformation,
} from "./types";
import type { ProfileSnapshot } from "./profile";
import { scorePair } from "./matching";
import { normalize, skillsIn, strengthenOpeningVerb, truncate } from "./text";
import { buildValidationContext, mapLines, revalidate, PLACEHOLDER } from "./validate";
import { displayDate, similarBullets } from "./experiences";

export interface BulletPlan {
  text: string;
  sourceEvidenceIds: string[];
  requirementId: string | null;
  transformation: Transformation;
}

/** Which bullets go under each experience, in order. Keys are experience ids. */
export interface TailorPlan {
  entries: Record<string, BulletPlan[]>;
}

export interface JobContext {
  company: string;
  title: string;
  sourceLabel: string;
  requirements: JobRequirement[];
  keywords: string[];
}

let lineCounter = 0;
function lineId(prefix: string) {
  lineCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${lineCounter.toString(36)}`;
}

export function bestRequirement(text: string, reqs: JobRequirement[]): { req: JobRequirement; score: number } | null {
  let best: { req: JobRequirement; score: number } | null = null;
  for (const r of reqs) {
    const s = scorePair(r.quote, text).score + (r.preferred ? 0 : 0.5);
    if (s >= 2 && (!best || s > best.score)) best = { req: r, score: s };
  }
  return best;
}

const MAX_BULLETS = { experience: 4, leadership: 3, project: 3 } as const;

/**
 * Deterministic tailoring used when Claude is not configured. It never writes new claims:
 * it reorders real bullets by relevance and proposes stronger opening verbs, which the
 * validator flags for the student to confirm.
 */
export function rulePlan(profile: ProfileSnapshot, job: JobContext): TailorPlan {
  const entries: TailorPlan["entries"] = {};
  for (const x of profile.experiences) {
    const usable = x.bullets.filter((b) => b.status !== "unverified").sort((a, b) => a.sortOrder - b.sortOrder);
    const ranked = usable
      .map((b, i) => ({ b, i, best: bestRequirement(b.text, job.requirements) }))
      .sort((a, b) => (b.best?.score ?? 0) - (a.best?.score ?? 0) || a.i - b.i);
    const limit = Math.max(2, MAX_BULLETS[x.section]);
    entries[x.id] = ranked.slice(0, limit).map(({ b, best }) => {
      const strengthened = strengthenOpeningVerb(b.text);
      return {
        text: strengthened ?? b.text,
        sourceEvidenceIds: [b.id],
        requirementId: best?.req.id ?? null,
        transformation: strengthened ? "reworded" : "unchanged",
      };
    });
  }
  return { entries };
}

/** Character edits between two strings (Levenshtein), for spotting a "rewrite" that changed almost nothing. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** A rewrite within a few characters of the original (an apostrophe, a dash, one word) isn't worth a change. */
function nearlySame(original: string, rewrite: string): boolean {
  return editDistance(original.toLowerCase(), rewrite.toLowerCase()) <= Math.max(3, Math.round(original.length * 0.03));
}

function makeLine(plan: BulletPlan, original: string): DocLine {
  return {
    id: lineId("ln"),
    text: plan.text.trim(),
    originalText: original,
    sourceEvidenceIds: plan.sourceEvidenceIds,
    requirementId: plan.requirementId,
    transformation: plan.transformation,
    verification: "supported",
    decision: "pending",
    issues: [],
  };
}

export interface AssembledResume {
  content: ResumeContent;
  changeSummary: ChangeSummaryItem[];
}

/** Builds the resume from a plan. Employers, titles, cities and dates always come from the profile. */
export function assembleResume(profile: ProfileSnapshot, job: JobContext, plan: TailorPlan, evidence: EvidenceItem[]): AssembledResume {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const reqById = new Map(job.requirements.map((r) => [r.id, r]));
  const summary: ChangeSummaryItem[] = [];
  const quoteOf = (rid: string | null) => (rid ? reqById.get(rid)?.quote ?? null : null);
  // Every fact appears once on the page: what's already been used, across all entries.
  const usedSources = new Set<string>();
  const usedTexts: string[] = [];
  const repeats = (p: BulletPlan) =>
    (p.sourceEvidenceIds.length > 0 && p.sourceEvidenceIds.every((id) => usedSources.has(id))) || usedTexts.some((t) => similarBullets(t, p.text));
  const thin: ProfileSnapshot["experiences"] = [];

  const buildEntry = (x: ProfileSnapshot["experiences"][number], allowSingle = false): ResumeEntry | null => {
    const proposed = plan.entries[x.id] ?? [];
    if (proposed.length === 0) return null;
    // Drop bullets that repeat a fact already on the page (or earlier in this entry).
    const planned: BulletPlan[] = [];
    const take = (p: BulletPlan) => {
      planned.push(p);
      p.sourceEvidenceIds.forEach((id) => usedSources.add(id));
      usedTexts.push(p.text);
    };
    for (const p of proposed) if (!repeats(p)) take(p);
    // At least two bullets: top up from this role's other real bullets, word for word.
    for (const b of x.bullets.filter((b) => b.status !== "unverified").sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (planned.length >= 2) break;
      const extra: BulletPlan = { text: b.text, sourceEvidenceIds: [b.id], requirementId: bestRequirement(b.text, job.requirements)?.req.id ?? null, transformation: "unchanged" };
      if (!repeats(extra)) take(extra);
    }
    // A role with only one thing to say reads thin; leave it off unless its section would be empty.
    if (planned.length < 2 && !allowSingle) {
      planned.forEach((p) => {
        p.sourceEvidenceIds.forEach((id) => usedSources.delete(id));
        usedTexts.splice(usedTexts.indexOf(p.text), 1);
      });
      thin.push(x);
      return null;
    }
    const baseOrder = x.bullets.filter((b) => b.status !== "unverified").sort((a, b) => a.sortOrder - b.sortOrder).map((b) => b.id);
    const bullets = planned.map((p, idx) => {
      const src = p.sourceEvidenceIds.map((id) => byId.get(id)).filter(Boolean) as EvidenceItem[];
      const original = src.map((s) => s.text).join(" / ");
      let transformation = p.transformation;
      const firstSrc = p.sourceEvidenceIds[0];
      // A near-identical "rewrite" keeps the student's own words exactly, so it isn't highlighted as a change.
      if (src.length === 1 && nearlySame(src[0].text, p.text)) p = { ...p, text: src[0].text };
      const sameText = src.length === 1 && normalize(src[0].text) === normalize(p.text);
      if (sameText && transformation === "reworded") transformation = "unchanged";
      if (sameText && baseOrder.indexOf(firstSrc) !== idx && baseOrder.includes(firstSrc)) transformation = "reordered";
      if (!sameText && transformation === "unchanged") transformation = "reworded";
      const line = makeLine({ ...p, transformation }, original);
      const quote = quoteOf(p.requirementId);
      if (transformation === "reordered") {
        summary.push({ lineId: line.id, kind: "moved", description: `Moved "${truncate(p.text, 70)}" up within ${x.organization}.`, postingQuote: quote, postingSource: quote ? job.sourceLabel : null });
      } else if (transformation === "reworded" || transformation === "shortened") {
        summary.push({ lineId: line.id, kind: transformation === "shortened" ? "shortened" : "emphasized", description: `Reworded "${truncate(original, 70)}"`, postingQuote: quote, postingSource: quote ? job.sourceLabel : null });
      } else if (transformation === "from_answer") {
        summary.push({ lineId: line.id, kind: "added_from_answer", description: `Added from your answer: "${truncate(original, 70)}"`, postingQuote: quote, postingSource: quote ? job.sourceLabel : null });
      }
      return line;
    });
    const usedIds = new Set(planned.flatMap((p) => p.sourceEvidenceIds));
    for (const b of x.bullets) {
      if (!usedIds.has(b.id) && b.status !== "unverified") {
        summary.push({ lineId: null, kind: "omitted", description: `Left out "${truncate(b.text, 70)}" (${x.organization}) to keep the page focused on this role.`, postingQuote: null, postingSource: null });
      }
    }
    return { experienceId: x.id, organization: x.organization, city: x.city, title: x.title, startDate: displayDate(x.startDate), endDate: displayDate(x.endDate), moved: false, bullets };
  };

  // Entries stay in reverse-chronological profile order (a Neeley non-negotiable).
  const ordered = [...profile.experiences].sort((a, b) => a.sortOrder - b.sortOrder);
  const section = (xs: ProfileSnapshot["experiences"]) => {
    thin.length = 0;
    const built = xs.map((x) => buildEntry(x)).filter((e): e is ResumeEntry => !!e);
    // Never leave a whole section empty just because its roles are thin.
    if (built.length === 0) return thin.splice(0).map((x) => buildEntry(x, true)).filter((e): e is ResumeEntry => !!e);
    for (const x of thin) {
      summary.push({ lineId: null, kind: "omitted", description: `Left out ${x.organization}: your profile has only one bullet for it, and a single bullet reads thin. Add another in your profile to include it.`, postingQuote: null, postingSource: null });
    }
    return built;
  };
  const experience = section(ordered.filter((x) => x.section === "experience"));
  const leadership = section(ordered.filter((x) => x.section !== "experience"));

  // Skills: relevant technical skills first, with proficiency, exactly as confirmed.
  const relevant = new Set(job.keywords.concat(job.requirements.flatMap((r) => r.keywords)));
  const skillLine = (label: string, cat: ProfileSnapshot["skills"][number]["category"]) => {
    const items = profile.skills.filter((s) => s.category === cat && s.status !== "unverified");
    if (!items.length) return null;
    const ranked = [...items].sort((a, b) => Number(relevant.has(skillsIn(b.name)[0] ?? b.name)) - Number(relevant.has(skillsIn(a.name)[0] ?? a.name)));
    const reordered = ranked.some((s, i) => s.id !== items[i].id);
    const text = ranked.map((s) => (s.proficiency ? `${s.name} (${s.proficiency})` : s.name)).join(", ");
    const line = makeLine({ text, sourceEvidenceIds: ranked.map((s) => s.id), requirementId: null, transformation: reordered ? "reordered" : "unchanged" }, items.map((s) => s.name).join(", "));
    if (reordered) {
      const first = ranked.filter((s) => relevant.has(skillsIn(s.name)[0] ?? s.name)).map((s) => s.name);
      const req = job.requirements.find((r) => first.some((f) => skillsIn(r.quote).includes(skillsIn(f)[0] ?? f)));
      summary.push({ lineId: line.id, kind: "moved", description: `Listed ${first.join(", ")} first in ${label}.`, postingQuote: req?.quote ?? null, postingSource: req ? job.sourceLabel : null });
    }
    return { label, line };
  };
  const skills = [
    skillLine("Technical", "technical"),
    skillLine("Certifications", "certification"),
    skillLine("Language", "language"),
    skillLine("Interests", "interest"),
  ].filter((s): s is { label: string; line: DocLine } => !!s);

  const content: ResumeContent = {
    kind: "resume",
    header: { name: profile.student.fullName, phone: profile.student.phone, email: profile.student.email, linkedin: profile.student.linkedin },
    education: profile.education.map((e) => ({ school: e.school, college: e.college, city: e.city, degree: e.degree, graduation: e.graduation, majors: e.majors, minors: e.minors, gpa: e.gpa, honors: e.honors, coursework: e.coursework })),
    experience,
    leadership,
    skills,
  };

  // Keywords from the posting that now appear in the document and are backed by evidence.
  const docText = [...experience, ...leadership].flatMap((e) => e.bullets.map((b) => b.text)).concat(skills.map((s) => s.line.text)).join(" ");
  const docSkills = new Set(skillsIn(docText));
  const evidenceSkills = new Set(evidence.flatMap((e) => skillsIn(e.text)));
  for (const k of job.keywords) {
    if (docSkills.has(k)) {
      const req = job.requirements.find((r) => r.keywords.includes(k));
      summary.push({ lineId: null, kind: "keyword", description: `"${k}" appears in your materials, backed by your own experience.`, postingQuote: req?.quote ?? null, postingSource: req ? job.sourceLabel : null });
    } else if (!evidenceSkills.has(k)) {
      summary.push({ lineId: null, kind: "omitted", description: `"${k}" is in the posting but not in your profile, so it was left out.`, postingQuote: job.requirements.find((r) => r.keywords.includes(k))?.quote ?? null, postingSource: job.sourceLabel });
    }
  }

  const ctx = buildValidationContext(evidence, "resume", [job.title, job.company]);
  return { content: mapLines(content, (l) => revalidate(l, ctx)) as ResumeContent, changeSummary: summary };
}

// ---------- Cover letter ----------

export interface CoverLetterPlan {
  whyThem: BulletPlan[];
  whyYou: BulletPlan[][]; // one or two paragraphs
  closing: BulletPlan[];
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function isCurrent(endDate: string) {
  return /present|current/i.test(endDate);
}

/** Template-driven letter following the Neeley structure. Personal reasons stay as visible blanks. */
export function ruleCoverLetterPlan(profile: ProfileSnapshot, job: JobContext): CoverLetterPlan {
  const whyThem: BulletPlan[] = [
    { text: `I am applying for the ${job.title} position at ${job.company}.`, sourceEvidenceIds: [], requirementId: null, transformation: "generated" },
    { text: "[[PERSONALIZE: name a specific, genuine reason this company interests you, such as a product, initiative, news story, or conversation]]", sourceEvidenceIds: [], requirementId: null, transformation: "generated" },
    { text: "[[PERSONALIZE: how you found the role, or who referred you (delete if no one did)]]", sourceEvidenceIds: [], requirementId: null, transformation: "generated" },
  ];
  // Pick the two best (requirement, bullet) pairs from different experiences.
  const pairs: { req: JobRequirement; exp: ProfileSnapshot["experiences"][number]; bullet: ProfileSnapshot["experiences"][number]["bullets"][number]; score: number }[] = [];
  for (const exp of profile.experiences) {
    for (const b of exp.bullets) {
      if (b.status === "unverified") continue;
      const best = bestRequirement(b.text, job.requirements);
      // A cover letter paragraph needs a real connection, not a one-word overlap.
      if (best && best.score >= 3) pairs.push({ req: best.req, exp, bullet: b, score: best.score });
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const chosen: typeof pairs = [];
  for (const p of pairs) {
    if (chosen.some((c) => c.exp.id === p.exp.id || c.req.id === p.req.id)) continue;
    chosen.push(p);
    if (chosen.length === 2) break;
  }
  const whyYou: BulletPlan[][] = chosen.map((p) => {
    const verbTense = isCurrent(p.exp.endDate) ? "As" : "As a former";
    const role = `${verbTense} ${p.exp.title} with ${p.exp.organization}, I ${lowerFirst(p.bullet.text.replace(/\.$/, ""))}.`;
    return [
      { text: role, sourceEvidenceIds: [p.bullet.id, `${p.exp.id}:title`], requirementId: p.req.id, transformation: "reworded" as const },
      { text: `[[PERSONALIZE: in one or two sentences, explain how this experience prepares you for "${truncate(p.req.quote, 90)}"]]`, sourceEvidenceIds: [], requirementId: p.req.id, transformation: "generated" as const },
    ];
  });
  if (whyYou.length === 0) {
    whyYou.push([{ text: "[[PERSONALIZE: describe one specific experience that shows you can do this job. Nothing in your profile matched this posting closely]]", sourceEvidenceIds: [], requirementId: null, transformation: "generated" }]);
  }
  const closing: BulletPlan[] = [
    { text: `Thank you for your time and consideration. I look forward to discussing my qualifications for the ${job.title} role in greater detail.`, sourceEvidenceIds: [], requirementId: null, transformation: "generated" },
  ];
  return { whyThem, whyYou, closing };
}

export function assembleCoverLetter(profile: ProfileSnapshot, job: JobContext, plan: CoverLetterPlan, evidence: EvidenceItem[], today = new Date()): { content: CoverLetterContent; changeSummary: ChangeSummaryItem[] } {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  const reqById = new Map(job.requirements.map((r) => [r.id, r]));
  const toLine = (p: BulletPlan) => makeLine(p, p.sourceEvidenceIds.map((id) => byId.get(id)?.text).filter(Boolean).join(" / "));
  const content: CoverLetterContent = {
    kind: "cover_letter",
    header: { name: profile.student.fullName, phone: profile.student.phone, email: profile.student.email, linkedin: profile.student.linkedin },
    date: today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    recipient: [job.company],
    greeting: makeLine({ text: "Dear Hiring Committee:", sourceEvidenceIds: [], requirementId: null, transformation: "generated" }, ""),
    paragraphs: [
      { role: "why_them", lines: plan.whyThem.map(toLine) },
      ...plan.whyYou.map((p) => ({ role: "why_you" as const, lines: p.map(toLine) })),
      { role: "closing", lines: plan.closing.map(toLine) },
    ],
    signoff: "Sincerely,",
  };
  const summary: ChangeSummaryItem[] = [];
  for (const p of content.paragraphs) {
    for (const l of p.lines) {
      if (PLACEHOLDER.test(l.text)) {
        PLACEHOLDER.lastIndex = 0;
        summary.push({ lineId: l.id, kind: "omitted", description: "Left a blank for something only you can write.", postingQuote: l.requirementId ? reqById.get(l.requirementId)?.quote ?? null : null, postingSource: l.requirementId ? job.sourceLabel : null });
      } else if (l.sourceEvidenceIds.length) {
        summary.push({ lineId: l.id, kind: "emphasized", description: `Built from "${truncate(l.originalText, 80)}"`, postingQuote: l.requirementId ? reqById.get(l.requirementId)?.quote ?? null : null, postingSource: l.requirementId ? job.sourceLabel : null });
      }
    }
  }
  const ctx = buildValidationContext(evidence, "cover_letter", [job.title, job.company]);
  return { content: mapLines(content, (l) => revalidate(l, ctx)) as CoverLetterContent, changeSummary: summary };
}
