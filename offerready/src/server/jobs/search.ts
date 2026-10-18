import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { newId } from "../ids";
import { loadProfile, getStudent } from "../profile";
import { aiConfigured } from "../ai/claude";
import { aiInterpretSearch } from "../ai/tasks";
import { BOARDS, PROVIDER_LABEL, adzunaConfigured, fetchAdzunaFullText, fetchDetail, listBoard, searchAdzuna, type Listing } from "./providers";
import { classifyArrangement, classifyLevel, fingerprint, locationMatches, passesFilters, titleMatches } from "@/domain/jobs";
import { extractRequirements, seniorityMismatch } from "@/domain/requirements";
import { assessFit, findStrongestMatch } from "@/domain/matching";
import { declinedRequirements, evidenceFrom } from "@/domain/profile";
import { interpretSearchRules } from "@/domain/searchInterpret";
import type { SearchFilters, SearchStats, SourceStat, Verification } from "@/domain/types";

export type SearchEvent =
  | { type: "stage"; stage: string; message: string }
  | { type: "source"; stat: SourceStat }
  | { type: "done"; searchId: string; stats: SearchStats }
  | { type: "error"; message: string };

const DETAIL_LIMIT = 24;
const CONCURRENCY = 8;
// Adzuna's site blocks bursts, so its full-text pages are read a few at a time.
const ADZUNA_CONCURRENCY = 3;

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }));
  return out;
}

export async function interpret(studentId: string, query: string): Promise<{ filters: SearchFilters; interpretedBy: "claude" | "rules"; clarification: string; aiError?: string }> {
  const student = await getStudent(studentId);
  if (aiConfigured()) {
    try {
      const { clarification, ...filters } = await aiInterpretSearch(query, student.preferences);
      return { filters, interpretedBy: "claude", clarification };
    } catch (e) {
      // Fall back to deterministic parsing, and say so.
      return { filters: interpretSearchRules(query, student.preferences), interpretedBy: "rules", clarification: "", aiError: (e as Error).message };
    }
  }
  return { filters: interpretSearchRules(query, student.preferences), interpretedBy: "rules", clarification: "" };
}

/**
 * The discovery pipeline: list -> filter -> de-duplicate -> read and verify the full posting ->
 * extract requirements -> match against the student's evidence -> save.
 * Only postings whose full text was read from the employer's board are marked verified.
 */
export async function runSearch(studentId: string, query: string, filters: SearchFilters, interpretedBy: "claude" | "rules", emit: (e: SearchEvent) => void): Promise<string> {
  const startedAt = new Date().toISOString();
  const db = await getDb();
  const profile = await loadProfile(studentId);
  const evidence = evidenceFrom(profile);
  const declined = declinedRequirements(profile);

  emit({ type: "stage", stage: "fetch", message: `Reading ${BOARDS.length} employer job boards` });
  const stats: SourceStat[] = [];
  const byProvider = new Map<string, SourceStat>();
  for (const p of ["greenhouse", "lever", "ashby"] as const) {
    const s: SourceStat = { source: PROVIDER_LABEL[p], boardsQueried: 0, postingsScanned: 0, matched: 0, errors: [], configured: true };
    byProvider.set(p, s);
    stats.push(s);
  }
  const listed = await pool(BOARDS, CONCURRENCY, async (b) => {
    const s = byProvider.get(b.provider)!;
    s.boardsQueried++;
    try {
      const l = await listBoard(b);
      s.postingsScanned += l.length;
      return l;
    } catch (e) {
      s.errors.push(`${b.company}: ${(e as Error).message}`);
      return [] as Listing[];
    }
  });
  for (const s of stats) emit({ type: "source", stat: s });

  let all = listed.flat();
  const adzuna: SourceStat = { source: "Adzuna", boardsQueried: 0, postingsScanned: 0, matched: 0, errors: [], configured: adzunaConfigured() };
  stats.push(adzuna);
  if (adzuna.configured) {
    emit({ type: "stage", stage: "fetch", message: "Searching Adzuna" });
    for (const t of filters.titles.slice(0, 3)) {
      try {
        adzuna.boardsQueried++;
        const r = await searchAdzuna(t, filters.locations.find((l) => l !== "Remote") ?? "");
        adzuna.postingsScanned += r.length;
        all = all.concat(r);
      } catch (e) {
        adzuna.errors.push((e as Error).message);
      }
    }
    emit({ type: "source", stat: adzuna });
  }
  const scanned = all.length;

  emit({ type: "stage", stage: "filter", message: `Filtering ${scanned.toLocaleString()} postings by title, level and location` });
  const anywhere = { ...filters, locations: [], arrangements: [] };
  let outsideLocation = 0;
  const candidates = all.filter((l) => {
    const level = classifyLevel(l.title, l.descriptionText ?? "");
    const arrangement = classifyArrangement(`${l.location} ${l.workplaceHint}`, l.descriptionText ?? "");
    const job = { title: l.title, location: l.location, level, arrangement, company: l.company, postedAt: l.postedAt };
    if (passesFilters(job, filters)) return true;
    if ((filters.locations.length || filters.arrangements.length) && passesFilters(job, anywhere)) outsideLocation++;
    return false;
  });

  // De-duplicate: same company, title and primary location (multi-city postings collapse to one).
  const seen = new Map<string, Listing>();
  for (const c of candidates) {
    const key = fingerprint(c.company, c.title, c.location);
    if (!seen.has(key)) seen.set(key, c);
  }
  const unique = [...seen.values()];
  const duplicatesRemoved = candidates.length - unique.length;

  // Read the most promising postings in full. Newest first; exact title matches first.
  const ranked = unique.sort((a, b) => {
    const am = titleMatches(a.title, filters.titles) ? 1 : 0;
    const bm = titleMatches(b.title, filters.titles) ? 1 : 0;
    return bm - am || (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0);
  }).slice(0, DETAIL_LIMIT);

  emit({ type: "stage", stage: "verify", message: `Reading and verifying ${ranked.length} postings on the employers' own boards` });
  const checkedAt = new Date();
  const adzunaListings = ranked.filter((l) => l.source === "adzuna");
  // Full Adzuna text saved by an earlier search is reused instead of fetched again.
  const savedText = new Map(
    adzunaListings.length
      ? (await db.select({ id: schema.jobs.sourceJobId, text: schema.jobs.description }).from(schema.jobs)
          .where(and(eq(schema.jobs.source, "adzuna"), inArray(schema.jobs.sourceJobId, adzunaListings.map((l) => l.sourceJobId)))))
          .map((r) => [r.id, r.text])
      : [],
  );
  const [boardDetails, adzunaFull] = await Promise.all([
    pool(ranked.filter((l) => l.source !== "adzuna"), CONCURRENCY, async (l) => ({ l, d: await fetchDetail(l) })),
    pool(adzunaListings, ADZUNA_CONCURRENCY, async (l) => {
      const saved = savedText.get(l.sourceJobId) ?? "";
      const full = saved.length > (l.descriptionText ?? "").length + 200 ? saved : await fetchAdzunaFullText(l.url);
      return { l, full };
    }),
  ]);
  const fullText = new Map(adzunaFull.map(({ l, full }) => [l.sourceJobId, full]));
  const details = [...boardDetails, ...adzunaListings.map((l) => ({ l, d: { ok: false as const, reason: "aggregator" } }))];

  emit({ type: "stage", stage: "match", message: "Matching requirements to your profile" });
  const resultIds: string[] = [];
  let verified = 0;
  for (const { l, d } of details) {
    let verification: Verification;
    let note: string;
    let text = l.descriptionText ?? "";
    if (d.ok) {
      verification = "verified_live";
      note = `Read from ${l.company}'s ${PROVIDER_LABEL[l.source]} job board`;
      text = d.text || text;
      verified++;
    } else if (l.source === "adzuna") {
      verification = "unverified";
      const full = fullText.get(l.sourceJobId);
      if (full) text = full;
      note = full ? "Listed by Adzuna. Full posting read from Adzuna's job page." : "Listed by Adzuna. Only a preview of the posting was available.";
    } else {
      // Dead or closed postings are never shown as opportunities.
      continue;
    }
    const level = classifyLevel(l.title, text);
    const arrangement = classifyArrangement(`${l.location} ${l.workplaceHint}`, text);
    const requirements = extractRequirements(text);
    const seniority = seniorityMismatch(text, l.title);
    const fit = assessFit(requirements, evidence, {
      levelMatches: filters.jobTypes.length === 0 || filters.jobTypes.includes(level),
      locationMatches: locationMatches(l.location, filters.locations, arrangement, filters.arrangements),
      seniorityFlag: seniority,
    }, declined);
    const strongest = findStrongestMatch(requirements, evidence);

    const jobRow = {
      id: newId("job"), source: l.source, sourceJobId: l.sourceJobId,
      sourceLabel: `${l.company} via ${PROVIDER_LABEL[l.source]}`, company: l.company, title: l.title, location: l.location,
      arrangement, level, url: l.url, description: text, postedAt: l.postedAt, lastCheckedAt: checkedAt, verification,
      verificationNote: note, requirements: requirements.map((r) => ({ ...r })), compensation: l.compensation, deadline: "",
      fingerprint: fingerprint(l.company, l.title, l.location),
    };
    const [saved] = await db.insert(schema.jobs).values(jobRow).onConflictDoUpdate({
      target: [schema.jobs.source, schema.jobs.sourceJobId],
      set: { title: jobRow.title, location: jobRow.location, description: jobRow.description, lastCheckedAt: checkedAt, verification, verificationNote: note, requirements: jobRow.requirements, arrangement, level, compensation: jobRow.compensation },
    }).returning({ id: schema.jobs.id });

    await db.insert(schema.jobMatches).values({
      id: newId("jm"), studentId, jobId: saved.id, fit: fit.fit, factors: fit.factors, strongestMatch: strongest, gap: fit.gap, state: "new",
    }).onConflictDoUpdate({
      target: [schema.jobMatches.studentId, schema.jobMatches.jobId],
      set: { fit: fit.fit, factors: fit.factors, strongestMatch: strongest, gap: fit.gap, computedAt: new Date() },
    });
    resultIds.push(saved.id);
  }
  for (const s of stats) s.matched = 0;
  for (const { l, d } of details) if (d.ok || l.source === "adzuna") {
    const s = stats.find((x) => x.source === PROVIDER_LABEL[l.source]);
    if (s) s.matched++;
  }

  const finalStats: SearchStats = {
    sources: stats, scanned, afterFilter: candidates.length, outsideLocation, duplicatesRemoved, verified, returned: resultIds.length,
    startedAt, finishedAt: new Date().toISOString(), interpretedBy,
  };
  const searchId = newId("srch");
  await db.insert(schema.searches).values({ id: searchId, studentId, query, filters, stats: finalStats, resultJobIds: resultIds });
  emit({ type: "done", searchId, stats: finalStats });
  return searchId;
}

/** Saves a posting the student pasted (from Handshake, LinkedIn, anywhere) and matches it. */
export async function addManualPosting(studentId: string, input: { company: string; title: string; location: string; url: string; text: string }) {
  const db = await getDb();
  const profile = await loadProfile(studentId);
  const evidence = evidenceFrom(profile);
  const requirements = extractRequirements(input.text);
  const arrangement = classifyArrangement(input.location, input.text);
  const level = classifyLevel(input.title, input.text);
  const student = await getStudent(studentId);
  const fit = assessFit(requirements, evidence, {
    levelMatches: student.preferences.jobTypes.length === 0 || student.preferences.jobTypes.includes(level),
    locationMatches: locationMatches(input.location, student.preferences.locations, arrangement, student.preferences.arrangements),
    seniorityFlag: seniorityMismatch(input.text, input.title),
  }, declinedRequirements(profile));
  const id = newId("job");
  await db.insert(schema.jobs).values({
    id, source: "manual", sourceJobId: id, sourceLabel: `${input.company} posting (pasted by you)`, company: input.company, title: input.title,
    location: input.location, arrangement, level, url: input.url, description: input.text, postedAt: null, lastCheckedAt: null,
    verification: "student_provided", verificationNote: "You pasted this posting. OfferReady hasn't checked that it's still open.",
    requirements, compensation: "", deadline: "", fingerprint: fingerprint(input.company, input.title, input.location),
  });
  await db.insert(schema.jobMatches).values({
    id: newId("jm"), studentId, jobId: id, fit: fit.fit, factors: fit.factors, strongestMatch: findStrongestMatch(requirements, evidence), gap: fit.gap, state: "saved",
  });
  return { id, requirementsFound: requirements.length };
}

export async function jobsForSearch(studentId: string, searchId: string) {
  const db = await getDb();
  const [s] = await db.select().from(schema.searches).where(and(eq(schema.searches.id, searchId), eq(schema.searches.studentId, studentId)));
  if (!s) return null;
  const ids = s.resultJobIds;
  if (!ids.length) return { search: s, jobs: [] };
  const rows = await db
    .select({ job: schema.jobs, match: schema.jobMatches })
    .from(schema.jobs)
    .innerJoin(schema.jobMatches, and(eq(schema.jobMatches.jobId, schema.jobs.id), eq(schema.jobMatches.studentId, studentId)))
    .where(inArray(schema.jobs.id, ids));
  return { search: s, jobs: rows };
}

export async function latestSearchId(studentId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.select({ id: schema.searches.id }).from(schema.searches).where(eq(schema.searches.studentId, studentId)).orderBy(sql`${schema.searches.createdAt} desc`).limit(1);
  return row?.id ?? null;
}
