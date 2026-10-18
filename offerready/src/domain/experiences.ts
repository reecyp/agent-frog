import type { ProfileSnapshot } from "./profile";

/**
 * Recognizing the same job listed twice. A resume and a LinkedIn PDF often name one role
 * differently ("Nicolo's Pizza" vs "Nicolo's Italian", "TCU Football" vs "Texas Christian
 * University football"), so an exact name match isn't enough. Two entries are the same job when
 * their dates match and their employer names share a distinctive word (or their titles do).
 */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "January/2026", "Jan 2026", "01/2026" and "2026-01" all become "2026-01"; "Present" and "Current" become "present". */
export function monthKey(date: string): string {
  const s = date.toLowerCase().trim();
  if (!s) return "";
  if (/present|current|now/.test(s)) return "present";
  const year = s.match(/\b(19|20)\d{2}\b/)?.[0];
  if (!year) return s.replace(/[^a-z0-9]/g, "");
  const named = MONTHS.findIndex((m) => new RegExp(`\\b${m}`).test(s));
  if (named >= 0) return `${year}-${String(named + 1).padStart(2, "0")}`;
  const num = s.replace(year, " ").match(/\b(0?[1-9]|1[0-2])\b/)?.[0];
  return num ? `${year}-${num.padStart(2, "0")}` : year;
}

/** Dates as they should read on a resume: "January/2026" -> "January 2026". */
export function displayDate(date: string): string {
  return date.replace(/\s*\/\s*(?=(19|20)\d{2}\b)/g, " ").replace(/\s{2,}/g, " ").trim();
}

const GENERIC = new Set([
  "the", "and", "of", "at", "for", "inc", "llc", "llp", "ltd", "co", "company", "corp", "corporation", "group", "team",
  "university", "college", "school", "program", "club", "department", "office", "center", "services", "service",
  "restaurant", "restaurants", "cafe", "texas", "christian",
]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[’']s\b/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
}

/** Distinctive employer words; "Texas Christian University" and "TCU" both yield "tcu". */
function orgTokens(org: string): Set<string> {
  const lower = org.toLowerCase();
  const out = new Set(words(org).filter((w) => w.length >= 3 && !GENERIC.has(w)));
  if (/texas christian/.test(lower)) out.add("tcu");
  return out;
}

const STOP = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "by", "at", "as", "from", "into", "while", "each", "per", "their", "team"]);

/** Content words of a bullet, lightly stemmed so "analyzed" and "analyzing" match. */
function contentWords(s: string): Set<string> {
  return new Set(words(s).filter((w) => !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, "")));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Two bullets that say essentially the same thing. */
export function similarBullets(a: string, b: string): boolean {
  return jaccard(contentWords(a), contentWords(b)) >= 0.45;
}

type Exp = Pick<ProfileSnapshot["experiences"][number], "organization" | "title" | "startDate" | "endDate">;

export function sameExperience(a: Exp, b: Exp): boolean {
  const na = words(a.organization).join(" ");
  const nb = words(b.organization).join(" ");
  if (na && na === nb && words(a.title).join(" ") === words(b.title).join(" ")) return true;
  const start = monthKey(a.startDate);
  const end = monthKey(a.endDate);
  if (!start || start !== monthKey(b.startDate) || end !== monthKey(b.endDate)) return false;
  const ta = orgTokens(a.organization);
  const sharedOrg = [...orgTokens(b.organization)].some((t) => ta.has(t));
  return sharedOrg || jaccard(contentWords(a.title), contentWords(b.title)) >= 0.5;
}

/**
 * Folds duplicate entries of one job into a single entry, keeping the resume's wording of the
 * employer and title (the earlier entry) and every distinct bullet from both. Bullet and answer
 * ids are unchanged, so evidence citations still resolve; answers about a folded entry follow it.
 */
export function mergeDuplicateExperiences(p: ProfileSnapshot): ProfileSnapshot {
  const ordered = [...p.experiences].sort((a, b) => a.sortOrder - b.sortOrder);
  const kept: ProfileSnapshot["experiences"] = [];
  const movedTo = new Map<string, string>();
  for (const x of ordered) {
    const into = kept.find((k) => sameExperience(k, x));
    if (!into) {
      kept.push({ ...x, bullets: [...x.bullets] });
      continue;
    }
    movedTo.set(x.id, into.id);
    const next = into.bullets.length ? Math.max(...into.bullets.map((b) => b.sortOrder)) + 1 : 0;
    const extra = x.bullets.filter((b) => !into.bullets.some((k) => similarBullets(k.text, b.text)));
    into.bullets.push(...extra.map((b, i) => ({ ...b, sortOrder: next + i })));
  }
  if (!movedTo.size) return p;
  return {
    ...p,
    experiences: kept,
    answers: p.answers.map((a) => (a.experienceId && movedTo.has(a.experienceId) ? { ...a, experienceId: movedTo.get(a.experienceId)! } : a)),
  };
}
