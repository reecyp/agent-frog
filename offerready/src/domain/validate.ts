import type { ClaimIssue, DocLine, DocumentContent, EvidenceItem, LineVerification } from "./types";
import {
  FUTURE_MARKERS,
  OWNERSHIP_VERBS,
  WEAK_LEAD_VERBS,
  firstWord,
  numbersIn,
  skillsIn,
  toolSkillsIn,
} from "./text";

export const PLACEHOLDER = /\[\[\s*PERSONALIZE:[^\]]*\]\]/gi;

export interface ValidationContext {
  /** Every evidence item for the student, keyed by id. */
  evidence: Map<string, EvidenceItem>;
  /** Tool skills (Excel, SQL...) the student has confirmed anywhere in the profile. */
  profileTools: Set<string>;
  /** "resume" lines must not use personal pronouns; cover letters may. */
  documentKind: "resume" | "cover_letter";
  /** Job title and company. Naming the role ("Data Analyst (SQL)") is not a claim about the student. */
  jobNames: string[];
}

export function buildValidationContext(evidence: EvidenceItem[], documentKind: "resume" | "cover_letter", jobNames: string[] = []): ValidationContext {
  const usable = evidence.filter((e) => e.status !== "unverified");
  return {
    evidence: new Map(evidence.map((e) => [e.id, e])),
    profileTools: new Set(usable.flatMap((e) => toolSkillsIn(e.text))),
    documentKind,
    jobNames: jobNames.filter(Boolean),
  };
}

function stripNames(text: string, names: string[]): string {
  let out = text;
  for (const n of names) out = out.split(n).join(" ");
  return out;
}

/**
 * Checks one generated line against the evidence it cites. Purely deterministic: an AI saying a
 * line is accurate is never accepted as proof.
 */
export function validateLine(line: Pick<DocLine, "text" | "sourceEvidenceIds" | "transformation">, ctx: ValidationContext): ClaimIssue[] {
  const issues: ClaimIssue[] = [];
  const text = line.text;

  if (PLACEHOLDER.test(text)) {
    issues.push({ code: "placeholder_unresolved", severity: "critical", message: "Fill in this personalization before sending." });
  }
  PLACEHOLDER.lastIndex = 0;
  const withoutPlaceholders = stripNames(text.replace(PLACEHOLDER, " "), ctx.jobNames);

  const sources = line.sourceEvidenceIds.map((id) => ctx.evidence.get(id)).filter((e): e is EvidenceItem => !!e);
  if (sources.some((s) => s.status === "unverified")) {
    issues.push({ code: "no_source", severity: "critical", message: "Cites evidence you haven't confirmed yet." });
  }
  const sourceText = sources.map((s) => s.text).join(" \n ");

  if (line.transformation !== "generated" && sources.length === 0) {
    issues.push({
      code: "no_source",
      severity: "critical",
      message: "This line isn't tied to anything in your profile.",
      question: "Is this true? If so, add it to your experience library so it has a source.",
    });
    return issues;
  }

  // Metrics must already exist in the cited evidence.
  if (sources.length > 0 || line.transformation === "generated") {
    const allowed = new Set(numbersIn(sourceText));
    const extra = numbersIn(withoutPlaceholders).filter((n) => !allowed.has(n));
    if (extra.length) {
      issues.push({
        code: "number_not_in_evidence",
        severity: "critical",
        message: `The figure ${extra.join(", ")} doesn't appear in your source evidence.`,
        question: `Where does ${extra[0]} come from? Give the real number, or remove it.`,
      });
    }
  }

  // Tools/software must exist in this line's sources or the student's confirmed skills.
  const lineTools = toolSkillsIn(withoutPlaceholders);
  const srcTools = new Set(toolSkillsIn(sourceText));
  const unsupportedTools = lineTools.filter((t) => !srcTools.has(t) && !ctx.profileTools.has(t));
  if (unsupportedTools.length) {
    issues.push({
      code: "skill_not_in_evidence",
      severity: "critical",
      message: `${unsupportedTools.join(", ")} isn't in your profile.`,
      question: `Have you actually used ${unsupportedTools[0]}? Where?`,
    });
  } else if (line.transformation !== "generated") {
    // A tool that is in the profile but not in this line's own source is a softer issue.
    const borrowed = lineTools.filter((t) => !srcTools.has(t));
    if (borrowed.length) {
      issues.push({
        code: "skill_not_in_evidence",
        severity: "warning",
        message: `${borrowed.join(", ")} is in your skills, but not in the source for this line.`,
        question: `Did you use ${borrowed[0]} in this specific role?`,
      });
    }
  }

  // Stronger ownership than the source supports ("Assisted with" -> "Led").
  if (sources.length) {
    const srcWeak = sources.some((s) => WEAK_LEAD_VERBS.test(s.text.trim()));
    const srcOwn = OWNERSHIP_VERBS.test(sourceText);
    const lineVerb = firstWord(withoutPlaceholders);
    const lineOwn = OWNERSHIP_VERBS.test(withoutPlaceholders);
    if ((srcWeak && !WEAK_LEAD_VERBS.test(withoutPlaceholders.trim()) && lineOwn) || (lineOwn && !srcOwn && /^(led|managed|owned|directed|spearheaded|headed|oversaw|supervised|founded)$/i.test(lineVerb))) {
      issues.push({
        code: "ownership_escalation",
        severity: "warning",
        message: `"${lineVerb}" claims more ownership than your original wording.`,
        question: `Is "${lineVerb}" accurate? Confirm only if you did this yourself, not in support of someone else.`,
      });
    }
  }

  // A plan or proposal must not become a finished result.
  if (sources.length && FUTURE_MARKERS.test(sourceText) && !FUTURE_MARKERS.test(withoutPlaceholders)) {
    issues.push({
      code: "outcome_tense",
      severity: "critical",
      message: "Your source describes a plan or something in progress; this line states it as done.",
      question: "Has this actually happened yet?",
    });
  }

  if (ctx.documentKind === "resume" && /\b(i|me|my|mine|we|our)\b/i.test(withoutPlaceholders)) {
    issues.push({ code: "personal_pronoun", severity: "warning", message: "Resume bullets shouldn't use personal pronouns (Neeley guide)." });
  }

  // Skill mentions in generated cover-letter text must be backed by something in the profile.
  if (line.transformation === "generated") {
    const claimed = skillsIn(withoutPlaceholders).filter((s) => toolSkillsIn(s).length > 0);
    const missing = claimed.filter((s) => !ctx.profileTools.has(s));
    if (missing.length && !issues.some((i) => i.code === "skill_not_in_evidence")) {
      issues.push({ code: "skill_not_in_evidence", severity: "critical", message: `${missing.join(", ")} isn't in your profile.` });
    }
  }
  return issues;
}

export function verificationFor(issues: ClaimIssue[]): LineVerification {
  if (issues.some((i) => i.severity === "critical")) return "unsupported";
  if (issues.length) return "needs_review";
  return "supported";
}

/** Re-validates a line and returns an updated copy. Lines the student removed stay as they are. */
export function revalidate(line: DocLine, ctx: ValidationContext): DocLine {
  if (line.decision === "removed") return line;
  const issues = validateLine(line, ctx);
  let verification = verificationFor(issues);
  // A student who confirms a needs-review line (e.g. "yes, I led it") resolves the warning.
  if (verification === "needs_review" && (line.decision === "accepted" || line.decision === "edited")) {
    verification = "supported";
  }
  return { ...line, issues, verification };
}

export function allLines(doc: DocumentContent): DocLine[] {
  if (doc.kind === "resume") {
    return [
      ...doc.experience.flatMap((e) => e.bullets),
      ...doc.leadership.flatMap((e) => e.bullets),
      ...doc.skills.map((s) => s.line),
    ];
  }
  return [doc.greeting, ...doc.paragraphs.flatMap((p) => p.lines)];
}

export function mapLines(doc: DocumentContent, fn: (l: DocLine) => DocLine): DocumentContent {
  if (doc.kind === "resume") {
    return {
      ...doc,
      experience: doc.experience.map((e) => ({ ...e, bullets: e.bullets.map(fn) })),
      leadership: doc.leadership.map((e) => ({ ...e, bullets: e.bullets.map(fn) })),
      skills: doc.skills.map((s) => ({ ...s, line: fn(s.line) })),
    };
  }
  return { ...doc, greeting: fn(doc.greeting), paragraphs: doc.paragraphs.map((p) => ({ ...p, lines: p.lines.map(fn) })) };
}

export interface ReviewState {
  changed: number;
  needsReview: number;
  blockers: number;
  placeholders: number;
  removed: number;
  canApprove: boolean;
  reasons: string[];
}

/** Summarizes what still blocks approval. Export is impossible while `canApprove` is false. */
export function reviewState(doc: DocumentContent): ReviewState {
  const lines = allLines(doc);
  const live = lines.filter((l) => l.decision !== "removed");
  const changed = lines.filter((l) => l.transformation !== "unchanged").length;
  const blockers = live.filter((l) => l.verification === "unsupported").length;
  const placeholders = live.filter((l) => l.issues.some((i) => i.code === "placeholder_unresolved")).length;
  const needsReview = live.filter((l) => l.verification === "needs_review").length;
  const reasons: string[] = [];
  if (blockers - placeholders > 0) reasons.push(`${blockers - placeholders} unsupported ${blockers - placeholders === 1 ? "claim" : "claims"} to fix or remove`);
  if (placeholders) reasons.push(`${placeholders} personalization ${placeholders === 1 ? "blank" : "blanks"} to fill in`);
  if (needsReview) reasons.push(`${needsReview} ${needsReview === 1 ? "line needs" : "lines need"} your confirmation`);
  return {
    changed,
    needsReview,
    blockers,
    placeholders,
    removed: lines.length - live.length,
    canApprove: blockers === 0 && needsReview === 0,
    reasons,
  };
}
