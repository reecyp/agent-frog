import type { Arrangement, JobLevel, SearchFilters } from "./types";
import { contentTokens, normalize } from "./text";

export function classifyLevel(title: string, description = ""): JobLevel {
  const t = `${title}`;
  // \bintern\b avoids matching "International" / "Internal".
  if (/\b(intern|interns|internship|co-?op|summer analyst|summer associate)\b/i.test(t)) return "internship";
  if (/\b(senior|sr\.?|staff|principal|lead|manager|director|head of|vp|vice president|architect)\b/i.test(t)) return "full_time";
  if (/\binternship\b/i.test(description.slice(0, 600))) return "internship";
  return "full_time";
}

export function isEarlyCareer(title: string): boolean {
  if (/\b(senior|sr\.?|staff|principal|lead|manager|director|head of|vp|vice president|architect|ii|iii|iv)\b/i.test(title)) return false;
  return true;
}

export function classifyArrangement(location: string, description = ""): Arrangement {
  const l = `${location}`.toLowerCase();
  if (/\bhybrid\b/.test(l)) return "hybrid";
  if (/\bremote\b/.test(l)) return "remote";
  const d = description.slice(0, 4000).toLowerCase();
  if (/\bhybrid\b/.test(d)) return "hybrid";
  if (/\b(fully remote|100% remote|remote-first|work from anywhere)\b/.test(d)) return "remote";
  if (l.trim()) return "onsite";
  return "unknown";
}

/** Stable key for duplicate detection: same company + same normalized title + same primary location. */
export function fingerprint(company: string, title: string, location: string): string {
  const t = normalize(title)
    .replace(/\(.*?\)/g, "")
    .replace(/\b(20\d\d|summer|fall|spring|winter)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const loc = normalize(location).split(/[;|•,]/)[0].replace(/[^a-z]+/g, " ").trim();
  return `${normalize(company).replace(/[^a-z0-9]+/g, "")}|${t}|${loc}`;
}

const TX_PLACES = /\b(texas|tx|dallas|fort worth|austin|houston|san antonio|plano|irving|frisco|arlington|addison|richardson|westlake|southlake|dfw)\b/i;
/** Dallas–Fort Worth is one commuting region, so any DFW city satisfies a Dallas or Fort Worth search. */
const DFW_PLACES = /\b(dallas|fort worth|plano|irving|frisco|arlington|addison|richardson|westlake|southlake|grapevine|las colinas|carrollton|lewisville|denton|mckinney|allen|coppell|dfw)\b/i;

export function locationMatches(jobLocation: string, wanted: string[], arrangement: Arrangement, wantedArr: Arrangement[]): boolean {
  const remoteOk = wantedArr.length === 0 || wantedArr.includes("remote");
  if (arrangement === "remote" && remoteOk && /\b(us|usa|united states|u\.s\.|north america|americas|remote)\b/i.test(jobLocation)) {
    return true;
  }
  if (wanted.length === 0) return true;
  const loc = jobLocation.toLowerCase();
  return wanted.some((w) => {
    const ww = w.toLowerCase().trim();
    if (!ww) return false;
    if (/^(texas|tx|dfw|dallas[- ]fort worth|north texas)$/.test(ww)) return TX_PLACES.test(loc);
    if (ww === "remote") return arrangement === "remote";
    const city = ww.split(",")[0].trim();
    if (DFW_PLACES.test(city)) return DFW_PLACES.test(loc);
    return loc.includes(city);
  });
}

/** Title variants for common student targets, used to widen a search before filtering. */
const TITLE_FAMILIES: [RegExp, string[]][] = [
  [/financ|valuation|invest|capital|banking|equity|fp&a|treasury|accounting/i,
    ["finance intern", "financial analyst", "fp&a", "strategic finance", "investment analyst", "accounting intern", "treasury", "corporate finance", "finance analyst"]],
  [/business analyst|analytics|data|insight|bi\b/i,
    ["business analyst", "data analyst", "analytics intern", "business intelligence", "insights analyst", "business operations"]],
  [/strategy|operations|bizops|consult/i,
    ["strategy & operations", "business operations", "strategy intern", "operations analyst", "strategy analyst", "consulting"]],
  [/marketing|brand|growth|social|content/i,
    ["marketing intern", "marketing analyst", "brand", "growth", "content marketing", "social media", "product marketing"]],
  [/sales|account|business development|customer success/i,
    ["sales intern", "account development", "sales development", "business development", "customer success", "account executive"]],
  [/supply|logistic|procure|operations analyst/i,
    ["supply chain", "logistics", "procurement", "operations analyst", "planning analyst"]],
  [/product/i, ["product manager", "associate product manager", "product analyst", "product operations"]],
  [/risk|compliance|fraud|credit|audit/i, ["risk analyst", "compliance analyst", "fraud analyst", "credit analyst", "audit"]],
  [/people|hr|recruit|talent/i, ["people operations", "recruiting coordinator", "talent", "hr intern"]],
];

export function expandTitles(targets: string[]): string[] {
  const out = new Set<string>();
  for (const t of targets) {
    const clean = t.trim().toLowerCase();
    if (!clean) continue;
    out.add(clean.replace(/\b(internships?|roles?|jobs?|positions?)\b/g, "").trim() || clean);
    for (const [re, variants] of TITLE_FAMILIES) if (re.test(clean)) variants.forEach((v) => out.add(v));
  }
  return [...out].filter(Boolean).slice(0, 14);
}

/** True when a posting title plausibly matches one of the searched title variants. */
export function titleMatches(title: string, variants: string[]): boolean {
  if (variants.length === 0) return true;
  const tt = new Set(contentTokens(title));
  const tl = title.toLowerCase();
  return variants.some((v) => {
    const vl = v.toLowerCase();
    if (tl.includes(vl)) return true;
    const vt = contentTokens(v).filter((t) => !["intern", "analyst", "associate"].includes(t));
    return vt.length > 0 && vt.every((t) => tt.has(t));
  });
}

export function passesFilters(
  job: { title: string; location: string; level: JobLevel; arrangement: Arrangement; company: string; postedAt: Date | null },
  f: SearchFilters,
  now = new Date(),
): boolean {
  if (f.jobTypes.length && job.level !== "unknown" && !f.jobTypes.includes(job.level)) return false;
  if (f.jobTypes.length === 1 && f.jobTypes[0] === "internship" && job.level !== "internship") return false;
  if (f.jobTypes.includes("full_time") && !f.jobTypes.includes("internship") && !isEarlyCareer(job.title)) return false;
  if (f.jobTypes.length === 0 && !isEarlyCareer(job.title) && job.level !== "internship") return false;
  if (f.arrangements.length && job.arrangement !== "unknown" && !f.arrangements.includes(job.arrangement)) {
    // A remote-friendly student can still see on-site roles in their chosen locations.
    if (!(f.locations.length && job.arrangement === "onsite" && f.arrangements.includes("onsite"))) return false;
  }
  if (!locationMatches(job.location, f.locations, job.arrangement, f.arrangements)) return false;
  if (f.companies.length && !f.companies.some((c) => job.company.toLowerCase().includes(c.toLowerCase()))) return false;
  if (f.postedWithinDays && job.postedAt) {
    const ageDays = (now.getTime() - job.postedAt.getTime()) / 86_400_000;
    if (ageDays > f.postedWithinDays) return false;
  }
  // Keywords are topics ("valuation", "Summer 2027"), not roles: alone they would let any title through,
  // so they gate titles only when the search has no title variants.
  const variants = f.titles.length ? f.titles : f.keywords.filter((k) => k.split(" ").length <= 3);
  return titleMatches(job.title, variants);
}

export function relativeDays(date: Date | string | null, now = new Date()): string {
  if (!date) return "date unknown";
  const d = typeof date === "string" ? new Date(date) : date;
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
