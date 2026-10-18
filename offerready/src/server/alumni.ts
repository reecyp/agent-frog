import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { aiConfigured } from "./ai/claude";
import { aiAlumniSearch, type AlumniSearchTerms } from "./ai/tasks";

/**
 * Private TCU alumni directory. Loaded from disk on the server only; never bundled, never logged,
 * never sent to an AI model (only a student's own search words are). Sensitive columns (international, veteran, transfer, first-gen status)
 * are not read at all. Email addresses are returned only by `alumniEmail`, for a mailto link the
 * student opens themselves.
 */
export interface Alum {
  key: string;
  name: string;
  firstName: string;
  classYear: string;
  employer: string;
  industry: string;
  jobFunction: string;
  title: string;
  location: string;
  majors: string;
}

interface Directory {
  people: Alum[];
  emails: Map<string, string>;
  /** Keys from the old recipe that pointed at formula cells, mapped to the person's real key. */
  legacy: Map<string, string>;
  loadedAt: Date;
}

const g = globalThis as unknown as { __alumni?: Promise<Directory | null> };

export function alumniPath(): string {
  return process.env.ALUMNI_DATA_PATH ?? path.resolve(process.cwd(), "..", "Alumni_Networking_List_-_Fall_26_Update copy.xlsx");
}

const NEEDED = ["Class Year", "Name", "First", "Last", "Permanent Email", "Employer Name", "Industry", "Job Function (role)", "Job Title", "Location", "Major(s)"] as const;

async function load(): Promise<Directory | null> {
  const file = alumniPath();
  if (!fs.existsSync(file)) return null;
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  if (!ws) return null;
  const header = (ws.getRow(1).values as unknown[]).map((v) => String(v ?? "").trim());
  const col = Object.fromEntries(NEEDED.map((h) => [h, header.indexOf(h)])) as Record<(typeof NEEDED)[number], number>;
  const people: Alum[] = [];
  const emails = new Map<string, string>();
  const legacy = new Map<string, string>();
  const seen = new Set<string>();
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const cell = (h: (typeof NEEDED)[number]) => {
      if (col[h] < 1) return "";
      let v = row.getCell(col[h]).value as unknown;
      // Formula cells carry their cached result (null when the workbook was saved without one).
      if (v && typeof v === "object" && "result" in (v as object)) v = (v as { result: unknown }).result;
      // Some CONCAT name formulas cache an invalid date; treat that as empty so the Last/First fallback runs.
      if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : String(v.getUTCFullYear());
      if (v && typeof v === "object" && "text" in (v as object)) return String((v as { text: unknown }).text).trim();
      if (v && typeof v === "object") return "";
      return String(v ?? "").trim();
    };
    // Some rows build Name with CONCAT(Last, ", ", First) and have no cached result.
    const name = cell("Name") || [cell("Last"), cell("First")].filter(Boolean).join(", ");
    const employer = cell("Employer Name");
    if (!name || !employer) return;
    const classYear = cell("Class Year");
    // Keys keep the original raw-string recipe so notes saved against them stay attached.
    const raw = (h: (typeof NEEDED)[number]) => {
      const v = col[h] < 1 ? "" : (row.getCell(col[h]).value as unknown);
      return v && typeof v === "object" && "text" in (v as object) ? String((v as { text: unknown }).text).trim() : String(v ?? "").trim();
    };
    const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
    const oldKey = hash(`${raw("Name")}|${employer}|${raw("Class Year")}`);
    // Formula cells stringify as "[object Object]", which gave everyone at an employer the same old
    // key. Those rows get a key from their real name; the old key still resolves (to the first
    // person who had it) so links and notes saved under it keep working.
    const formula = /\[object /.test(`${raw("Name")}|${raw("Class Year")}`);
    const key = formula ? hash(`${name}|${employer}|${classYear}`) : oldKey;
    if (formula && !legacy.has(oldKey)) legacy.set(oldKey, key);
    // The same person listed twice: keep the first row.
    if (seen.has(key)) return;
    seen.add(key);
    people.push({
      key, name, firstName: cell("First") || name.split(/\s+/)[0], classYear, employer,
      industry: cell("Industry"), jobFunction: cell("Job Function (role)"), title: cell("Job Title"), location: cell("Location"), majors: cell("Major(s)"),
    });
    const email = cell("Permanent Email");
    if (email) emails.set(key, email);
  });
  return { people, emails, legacy, loadedAt: new Date() };
}

function directory(): Promise<Directory | null> {
  g.__alumni ??= load().catch(() => null);
  return g.__alumni;
}

export async function alumniStatus(): Promise<{ available: boolean; count: number }> {
  const d = await directory();
  return { available: !!d, count: d?.people.length ?? 0 };
}

const SUFFIXES = /\b(inc|incorporated|llc|llp|lp|ltd|corp|corporation|co|company|companies|group|holdings|the|plc|na|n\.a)\b/g;
const ALIASES: Record<string, string> = {
  aa: "american airlines", "american airlines group": "american airlines",
  "jp morgan": "jpmorgan chase", "jpmorgan": "jpmorgan chase", "j p morgan": "jpmorgan chase", "chase": "jpmorgan chase",
  "pwc": "pricewaterhousecoopers", "pricewaterhouse coopers": "pricewaterhousecoopers",
  "ey": "ernst young", "ernst and young": "ernst young",
  "bofa": "bank of america", "bank of america merrill lynch": "bank of america",
  "meta platforms": "meta", "facebook": "meta", "alphabet": "google",
  "lockheed martin aeronautics": "lockheed martin",
};

export function normalizeCompany(s: string): string {
  let n = s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(SUFFIXES, " ").replace(/\s+/g, " ").trim();
  n = n.replace(/ and /g, " ").trim();
  return ALIASES[n] ?? n;
}

export function sameCompany(a: string, b: string): boolean {
  const x = normalizeCompany(a);
  const y = normalizeCompany(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && (long.startsWith(`${short} `) || long === short);
}

/** Alumni whose employer matches a company. Never includes email addresses. */
export async function alumniAtCompany(company: string, limit = 12): Promise<Alum[]> {
  const d = await directory();
  if (!d) return [];
  return d.people.filter((p) => sameCompany(p.employer, company)).slice(0, limit);
}

export async function countAlumniAt(companies: string[]): Promise<Record<string, number>> {
  const d = await directory();
  const out: Record<string, number> = {};
  for (const c of companies) out[c] = d ? d.people.filter((p) => sameCompany(p.employer, c)).length : 0;
  return out;
}

export interface AlumniSearch {
  /** What the student typed. */
  query: string;
  /** The terms actually matched, after Claude read and widened the search (or the typed words without AI). */
  terms: { roles: string[]; employers: string[]; industries: string[] };
  widenedBy: "claude" | "none";
  note: string;
  aiError?: string;
  total: number;
  page: number;
  pages: number;
  people: Alum[];
}

export const ALUMNI_PAGE_SIZE = 10;

const g2 = globalThis as unknown as { __alumniTerms?: Map<string, Promise<AlumniSearchTerms>> };

/** Claude's reading of one search, kept so paging through results doesn't ask again. */
function widen(query: string): Promise<AlumniSearchTerms> {
  const cache = (g2.__alumniTerms ??= new Map());
  const key = query.toLowerCase().replace(/\s+/g, " ");
  let hit = cache.get(key);
  if (!hit) {
    hit = aiAlumniSearch(query);
    hit.catch(() => cache.delete(key));
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(key, hit);
  }
  return hit;
}

const lower = (s: string) => s.toLowerCase().trim();
const uniq = (xs: string[]) => [...new Map(xs.map((x) => x.trim()).filter(Boolean).map((x) => [x.toLowerCase(), x])).values()];

/**
 * Alumni matching one plain-language search, best matches first, one page at a time. Only the
 * student's own words go to Claude (to split them into title stems, employers and industries);
 * the directory is matched here and never leaves the server.
 */
export async function findAlumni(query: string, page = 1): Promise<AlumniSearch> {
  query = query.trim().replace(/\s+/g, " ");
  // Without Claude the whole search is matched as typed, against every field.
  let terms = { roles: [query], employers: [query], industries: [query] };
  let widenedBy: AlumniSearch["widenedBy"] = "none";
  let note = "";
  let aiError: string | undefined;
  if (aiConfigured() && query) {
    try {
      const t = await widen(query);
      terms = { roles: uniq(t.roleTerms), employers: uniq(t.employers), industries: uniq(t.industries) };
      widenedBy = "claude";
      note = t.note;
    } catch (e) {
      aiError = (e as Error).message;
    }
  }

  const d = await directory();
  const roleTerms = terms.roles.map(lower).filter((t) => t.length >= 2);
  const industryTerms = terms.industries.map(lower).filter((t) => t.length >= 3);
  const employerTerms = terms.employers.filter((t) => t.trim().length >= 2);
  // Claude's terms are specific, so an industry alone isn't enough; typed words match any field.
  const enough = widenedBy === "claude" ? 3 : 1;
  const scored = (d?.people ?? [])
    .map((p) => {
      const title = `${p.title} ${p.jobFunction}`.toLowerCase();
      const employer = p.employer.toLowerCase();
      const atEmployer = employerTerms.some((t) => sameCompany(p.employer, t) || (t.length >= 4 && employer.includes(lower(t))));
      const inRole = roleTerms.some((t) => title.includes(t));
      const inIndustry = industryTerms.some((t) => p.industry.toLowerCase().includes(t));
      // Both a target employer and a target role ranks first; either alone next; industry only breaks ties.
      return { p, score: (atEmployer ? 4 : 0) + (inRole ? 3 : 0) + (inIndustry ? 1 : 0) };
    })
    .filter((x) => x.score >= enough)
    .sort((a, b) => b.score - a.score || yearNum(b.p.classYear) - yearNum(a.p.classYear) || a.p.name.localeCompare(b.p.name));

  const pages = Math.max(1, Math.ceil(scored.length / ALUMNI_PAGE_SIZE));
  page = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const people = scored.slice((page - 1) * ALUMNI_PAGE_SIZE, page * ALUMNI_PAGE_SIZE).map((x) => x.p);
  return { query, terms, widenedBy, note, aiError, total: scored.length, page, pages, people };
}

/** Class year as a number for sorting (recent graduates first); the directory sometimes stores a full date. */
function yearNum(v: string) {
  return Number(String(v).match(/\b(19|20)\d{2}\b/)?.[0] ?? 0);
}

export async function alumByKey(key: string): Promise<Alum | null> {
  const d = await directory();
  if (!d) return null;
  const k = d.legacy.get(key) ?? key;
  return d.people.find((p) => p.key === k) ?? null;
}

/** Only for building a mailto link the student opens in their own email app. */
export async function alumniEmail(key: string): Promise<string | null> {
  const d = await directory();
  return d?.emails.get(d.legacy.get(key) ?? key) ?? null;
}
