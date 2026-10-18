import type {
  Coverage,
  EvidenceItem,
  FitFactor,
  JobRequirement,
  RequirementCoverage,
  StrongestMatch,
} from "./types";
import { contentTokens, skillsIn, toolSkillsIn } from "./text";

/** Generic traits match nearly every resume, so they count less than tools and domain skills. */
const GENERIC = new Set(["Communication", "Teamwork", "Leadership", "Reporting", "Customer service", "Operations", "Research"]);

export interface PairScore {
  score: number;
  sharedSkills: string[];
  sharedTokens: string[];
}

export function scorePair(requirement: string, evidence: string): PairScore {
  const rs = new Set(skillsIn(requirement));
  const sharedSkills = skillsIn(evidence).filter((s) => rs.has(s));
  const rt = new Set(contentTokens(requirement));
  const sharedTokens = [...new Set(contentTokens(evidence).filter((t) => rt.has(t)))];
  const skillPoints = sharedSkills.reduce((n, s) => n + (GENERIC.has(s) ? 1 : 3), 0);
  return { score: skillPoints + sharedTokens.length, sharedSkills, sharedTokens };
}

/** Evidence the student has explicitly declined (e.g. "I have not used Tableau") by requirement text. */
export type DeclinedSet = Set<string>;

export function assessCoverage(
  req: JobRequirement,
  evidence: EvidenceItem[],
  declined: DeclinedSet = new Set(),
): RequirementCoverage {
  const usable = evidence.filter((e) => e.status !== "unverified");
  const scored = usable
    .map((e) => ({ e, s: scorePair(req.quote, e.text) }))
    .filter((x) => x.s.score > 0)
    .sort((a, b) => b.s.score - a.s.score);

  // Only concrete tools (Excel, SQL, Tableau...) count as a missing skill worth asking about.
  const reqTools = toolSkillsIn(req.quote);
  const coveredTools = new Set(scored.flatMap((x) => x.s.sharedSkills));
  const missingTools = reqTools.filter((t) => !coveredTools.has(t));
  const top = scored[0];
  const evidenceIds = scored.slice(0, 3).map((x) => x.e.id);
  const matchedTerms = [...new Set(scored.slice(0, 3).flatMap((x) => [...x.s.sharedSkills, ...x.s.sharedTokens]))];

  let coverage: Coverage;
  let note: string;
  if (declined.has(req.quote)) {
    coverage = "not_supported";
    note = "You said you don't have this. It stays off your materials.";
  } else if (top && top.s.score >= 3 && missingTools.length === 0) {
    coverage = top.e.status === "confirmed" || top.e.provenance === "demo" ? "supported" : "partial";
    note = coverage === "supported" ? `Backed by: ${top.e.context}` : `Backed by an unconfirmed line in ${top.e.context}`;
  } else if (missingTools.length > 0) {
    coverage = "needs_clarification";
    note = `Your profile doesn't mention ${missingTools.join(", ")}.`;
  } else if (top && top.s.score >= 1) {
    coverage = "partial";
    note = `Loosely related: ${top.e.context}`;
  } else if (req.kind === "education" || req.kind === "trait" || req.kind === "other") {
    coverage = "needs_clarification";
    note = "Nothing in your profile speaks to this yet.";
  } else {
    coverage = "not_supported";
    note = "No matching evidence in your profile.";
  }
  return { requirementId: req.id, coverage, evidenceIds, matchedTerms, note };
}

export function findStrongestMatch(reqs: JobRequirement[], evidence: EvidenceItem[]): StrongestMatch | null {
  let best: { r: JobRequirement; e: EvidenceItem; s: PairScore; rank: number } | null = null;
  for (const r of reqs) {
    for (const e of evidence) {
      if (e.status === "unverified" || e.kind === "title") continue;
      const s = scorePair(r.quote, e.text);
      if (s.score === 0) continue;
      // Prefer required over preferred, bullets (actions with results) over bare skill names.
      const rank = s.score + (r.preferred ? 0 : 1) + (e.kind === "bullet" || e.kind === "answer" ? 1 : 0);
      if (!best || rank > best.rank) best = { r, e, s, rank };
    }
  }
  if (!best) return null;
  return {
    requirementId: best.r.id,
    requirementQuote: best.r.quote,
    evidenceId: best.e.id,
    evidenceText: best.e.text,
    matchedTerms: [...best.s.sharedSkills, ...best.s.sharedTokens].slice(0, 6),
    strength: best.s.score >= 3 ? "clear" : "weak",
  };
}

export interface FitResult {
  fit: "strong" | "good" | "stretch";
  points: number;
  factors: FitFactor[];
  coverage: RequirementCoverage[];
  gap: string | null;
}

/**
 * A transparent fit label. Points are listed as factors so the student can see exactly why a
 * posting is Strong / Good / Stretch; there is no hidden model score.
 */
export function assessFit(
  reqs: JobRequirement[],
  evidence: EvidenceItem[],
  context: { levelMatches: boolean; locationMatches: boolean; seniorityFlag: string | null },
  declined: DeclinedSet = new Set(),
): FitResult {
  const coverage = reqs.map((r) => assessCoverage(r, evidence, declined));
  const required = reqs.filter((r) => !r.preferred);
  const preferred = reqs.filter((r) => r.preferred);
  const covered = (ids: Set<string>) =>
    coverage.filter((c) => ids.has(c.requirementId) && (c.coverage === "supported" || c.coverage === "partial")).length;

  const factors: FitFactor[] = [];
  let points = 0;
  if (required.length) {
    const n = covered(new Set(required.map((r) => r.id)));
    const p = Math.round((n / required.length) * 60);
    points += p;
    factors.push({ label: "Required qualifications", detail: `${n} of ${required.length} have evidence in your profile`, weight: p });
  }
  if (preferred.length) {
    const n = covered(new Set(preferred.map((r) => r.id)));
    const p = Math.round((n / preferred.length) * 15);
    points += p;
    factors.push({ label: "Preferred qualifications", detail: `${n} of ${preferred.length} have evidence`, weight: p });
  }
  if (context.levelMatches) {
    points += 15;
    factors.push({ label: "Level", detail: "Matches the job type you're looking for", weight: 15 });
  }
  if (context.locationMatches) {
    points += 10;
    factors.push({ label: "Location", detail: "Matches your location or work-arrangement preference", weight: 10 });
  }
  if (context.seniorityFlag) {
    points -= 25;
    factors.push({ label: "Seniority", detail: context.seniorityFlag, weight: -25 });
  }

  const fit = points >= 70 ? "strong" : points >= 45 ? "good" : "stretch";
  const firstGap = coverage.find(
    (c) => (c.coverage === "needs_clarification" || c.coverage === "not_supported") && !reqs.find((r) => r.id === c.requirementId)?.preferred,
  );
  const gapReq = firstGap ? reqs.find((r) => r.id === firstGap.requirementId) : null;
  const short = (q: string) => (q.length > 90 ? `${q.slice(0, 89).trimEnd()}…` : q);
  return { fit, points, factors, coverage, gap: firstGap && gapReq ? `"${short(gapReq.quote)}": ${firstGap.note}` : null };
}
