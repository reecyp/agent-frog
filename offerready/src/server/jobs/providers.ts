import "server-only";
import { BOARDS, PROVIDER_LABEL, type Board } from "./companies";
import { htmlToText } from "@/domain/requirements";

/** A posting as listed by a source, before details are fetched. */
export interface Listing {
  source: "greenhouse" | "lever" | "ashby" | "adzuna";
  sourceJobId: string;
  board: string;
  company: string;
  title: string;
  location: string;
  url: string;
  postedAt: Date | null;
  /** Present when the list endpoint already returns the full description (Lever, Ashby). */
  descriptionText: string | null;
  workplaceHint: string;
  compensation: string;
}

const UA = { "User-Agent": "OfferReady/0.1 (student job search assistant; contact via TCU Neeley)" };
const TIMEOUT_MS = 12_000;
const LIST_TTL_MS = 30 * 60_000;

type Cached = { at: number; listings: Listing[] };
const g = globalThis as unknown as { __boardCache?: Map<string, Cached> };
const cache = (g.__boardCache ??= new Map());

async function getJson(url: string): Promise<unknown> {
  // One retry for transient failures; never more, so a slow board can't stall a search.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (res.status === 404) throw new HttpError(404);
      if (!res.ok) throw new HttpError(res.status);
      return await res.json();
    } catch (e) {
      if (e instanceof HttpError && e.status < 500) throw e;
      if (attempt === 1) throw e;
    }
  }
  throw new Error("unreachable");
}

export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

function date(v: unknown): Date | null {
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function listGreenhouse(b: Board): Promise<Listing[]> {
  const body = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs`)) as {
    jobs?: { id: number; title: string; location?: { name?: string }; absolute_url: string; updated_at?: string; first_published?: string }[];
  };
  return (body.jobs ?? []).map((j) => ({
    source: "greenhouse", sourceJobId: `${b.token}:${j.id}`, board: b.token, company: b.company, title: j.title.trim(),
    location: j.location?.name ?? "", url: j.absolute_url, postedAt: date(j.first_published ?? j.updated_at),
    descriptionText: null, workplaceHint: "", compensation: "",
  }));
}

async function listLever(b: Board): Promise<Listing[]> {
  const body = (await getJson(`https://api.lever.co/v0/postings/${b.token}?mode=json`)) as {
    id: string; text: string; hostedUrl: string; createdAt?: number; workplaceType?: string;
    categories?: { location?: string; commitment?: string }; descriptionPlain?: string; additionalPlain?: string;
    lists?: { text: string; content: string }[]; salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
  }[];
  return (Array.isArray(body) ? body : []).map((j) => {
    const lists = (j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n\n");
    const comp = j.salaryRange?.min ? `${j.salaryRange.currency ?? "USD"} ${j.salaryRange.min.toLocaleString()}–${(j.salaryRange.max ?? j.salaryRange.min).toLocaleString()} ${j.salaryRange.interval ?? ""}`.trim() : "";
    return {
      source: "lever", sourceJobId: `${b.token}:${j.id}`, board: b.token, company: b.company, title: j.text.trim(),
      location: j.categories?.location ?? "", url: j.hostedUrl, postedAt: date(j.createdAt),
      descriptionText: [j.descriptionPlain ?? "", lists, j.additionalPlain ?? ""].join("\n\n").trim(),
      workplaceHint: `${j.workplaceType ?? ""} ${j.categories?.commitment ?? ""}`, compensation: comp,
    } satisfies Listing;
  });
}

async function listAshby(b: Board): Promise<Listing[]> {
  const body = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${b.token}?includeCompensation=true`)) as {
    jobs?: { id: string; title: string; location?: string; secondaryLocations?: { location?: string }[]; isRemote?: boolean; workplaceType?: string;
      employmentType?: string; descriptionHtml?: string; descriptionPlain?: string; publishedAt?: string; jobUrl: string;
      compensation?: { compensationTierSummary?: string } }[];
  };
  return (body.jobs ?? []).map((j) => ({
    source: "ashby", sourceJobId: `${b.token}:${j.id}`, board: b.token, company: b.company, title: j.title.trim(),
    location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join("; "),
    url: j.jobUrl, postedAt: date(j.publishedAt),
    descriptionText: j.descriptionHtml ? htmlToText(j.descriptionHtml) : (j.descriptionPlain ?? ""),
    workplaceHint: `${j.workplaceType ?? ""} ${j.isRemote ? "remote" : ""} ${j.employmentType ?? ""}`,
    compensation: j.compensation?.compensationTierSummary ?? "",
  }));
}

export async function listBoard(b: Board): Promise<Listing[]> {
  const key = `${b.provider}:${b.token}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.listings;
  const listings = b.provider === "greenhouse" ? await listGreenhouse(b) : b.provider === "lever" ? await listLever(b) : await listAshby(b);
  cache.set(key, { at: Date.now(), listings });
  return listings;
}

/** Fetches the full posting from the employer's board. Success means the posting is live right now. */
export async function fetchDetail(l: Listing): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  try {
    if (l.source === "greenhouse") {
      const id = l.sourceJobId.split(":")[1];
      const body = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${l.board}/jobs/${id}`)) as { content?: string };
      return { ok: true, text: htmlToText(body.content ?? "") };
    }
    if (l.source === "lever") {
      const id = l.sourceJobId.split(":")[1];
      await getJson(`https://api.lever.co/v0/postings/${l.board}/${id}?mode=json`);
      return { ok: true, text: l.descriptionText ?? "" };
    }
    if (l.source === "ashby") {
      // The board listing itself is the live source of truth for Ashby; it was just fetched.
      return { ok: true, text: l.descriptionText ?? "" };
    }
    return { ok: false, reason: "Aggregator listing: full posting not read" };
  } catch (e) {
    return { ok: false, reason: e instanceof HttpError && e.status === 404 ? "Posting no longer exists (404)" : `Check failed: ${(e as Error).message}` };
  }
}

// ---------- Adzuna (optional aggregator) ----------

export function adzunaConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

export async function searchAdzuna(what: string, where: string): Promise<Listing[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID ?? "",
    app_key: process.env.ADZUNA_APP_KEY ?? "",
    results_per_page: "20",
    what,
    "content-type": "application/json",
  });
  if (where) params.set("where", where);
  const body = (await getJson(`https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`)) as {
    results?: { id: string; title: string; company?: { display_name?: string }; location?: { display_name?: string }; redirect_url: string; created?: string; description?: string }[];
  };
  return (body.results ?? []).map((r) => ({
    source: "adzuna", sourceJobId: String(r.id), board: "adzuna", company: r.company?.display_name ?? "Unknown employer",
    title: htmlToText(r.title), location: r.location?.display_name ?? "", url: r.redirect_url, postedAt: date(r.created),
    descriptionText: r.description ? htmlToText(r.description) : null, workplaceHint: "", compensation: "",
  }));
}

// Adzuna's API returns only a ~500-character preview. Its job page (the API's redirect_url, which must
// keep its tracking parameters or the CDN blocks it) embeds the full posting as schema.org JSON-LD.
const BROWSER_UA = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
  Accept: "text/html",
  "Accept-Language": "en-US",
};
const g2 = globalThis as unknown as { __adzunaText?: Map<string, string> };
const adzunaText = (g2.__adzunaText ??= new Map());

/** The full posting text from Adzuna's job page, or null if the page is blocked or has no JobPosting data. */
export async function fetchAdzunaFullText(url: string): Promise<string | null> {
  if (adzunaText.has(url)) return adzunaText.get(url)!;
  try {
    const res = await fetch(url, { headers: BROWSER_UA, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return null;
    const html = await res.text();
    for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
      let data: unknown;
      try {
        data = JSON.parse(m[1]);
      } catch {
        continue;
      }
      const posting = data as { "@type"?: string; description?: string };
      if (posting["@type"] === "JobPosting" && posting.description) {
        const text = htmlToText(posting.description);
        adzunaText.set(url, text);
        return text;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export { BOARDS, PROVIDER_LABEL };
