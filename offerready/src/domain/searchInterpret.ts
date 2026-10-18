import type { Arrangement, JobLevel, SearchFilters, StudentPreferences } from "./types";
import { expandTitles } from "./jobs";

const CITIES = [
  "Dallas, TX", "Fort Worth, TX", "Austin, TX", "Houston, TX", "San Antonio, TX", "Plano, TX", "Irving, TX",
  "New York, NY", "San Francisco, CA", "Chicago, IL", "Seattle, WA", "Boston, MA", "Denver, CO", "Atlanta, GA",
  "Los Angeles, CA", "Washington, DC", "Miami, FL", "Nashville, TN", "Charlotte, NC", "Phoenix, AZ",
];

const ROLE_WORDS =
  /\b(finance|financial|accounting|investment|investing|valuation|banking|marketing|sales|operations|strategy|consulting|data|analytics|business analyst|supply chain|logistics|product|risk|compliance|hr|people|recruiting|fp&a|treasury|audit)\b/gi;

/** Plain-language request -> filters, without AI. Anything it can't place becomes a keyword chip. */
export function interpretSearchRules(query: string, prefs: StudentPreferences): SearchFilters {
  const q = query.toLowerCase();
  const jobTypes: JobLevel[] = [];
  if (/\bintern(ship)?s?\b|\bco-?op\b|\bsummer\b/.test(q)) jobTypes.push("internship");
  if (/\bfull[- ]time\b|\bnew grad\b|\bentry[- ]level\b|\bfirst job\b/.test(q)) jobTypes.push("full_time");

  // Only restrict the arrangement when the student states a preference ("prefer hybrid", "remote only").
  // "Dallas or remote" widens the locations instead.
  const arrangements: Arrangement[] = [];
  const pref = (w: string) => new RegExp(`\\b(prefer\\w*|want|only)\\s+(\\w+\\s+)?${w}|\\b${w}\\s+(only|roles|positions|jobs)\\b|\\b(fully|100%)\\s+${w}`).test(q);
  if (pref("remote")) arrangements.push("remote");
  if (pref("hybrid")) arrangements.push("hybrid");
  if (pref("(on[- ]?site|in[- ]person)")) arrangements.push("onsite");

  const locations = CITIES.filter((c) => q.includes(c.split(",")[0].toLowerCase()));
  if (/\bdfw\b|dallas[- ]fort worth|north texas/.test(q) && !locations.length) locations.push("Dallas, TX", "Fort Worth, TX");
  if (/\btexas\b/.test(q) && !locations.length) locations.push("Texas");
  if (/\bremote\b/.test(q)) locations.push("Remote");

  const roles = [...new Set((query.match(ROLE_WORDS) ?? []).map((r) => r.toLowerCase()))];
  const titles = expandTitles(roles.length ? roles.map((r) => `${r} ${jobTypes.includes("internship") ? "intern" : "analyst"}`) : prefs.targetRoles);

  // Topics after "interested in / focused on / at", split on "and" and commas, minus places and filler.
  const NOISE = /\b(remote|hybrid|on-?site|summer|fall|spring|next|year|internships?|jobs?|roles?|positions?|texas|dfw)\b/i;
  const TRIGGER = /\b(?:interested in|focus(?:ed)? on|passionate about|at)\s+/gi;
  const segments = query.split(TRIGGER).slice(1).map((s) => s.split(/[.;]|\bin\s+(?=[A-Z])|\bfor\b/)[0]);
  const keywords = segments
    .flatMap((s) => s.split(/,|\band\b|\bor\b/i))
    .map((k) => k.replace(/^(the|a|an)\s+/i, "").replace(/\b(companies|firms)\b/i, "").trim())
    .filter((k) => k.length >= 3 && k.split(/\s+/).length <= 4 && !NOISE.test(k) && !CITIES.some((c) => k.toLowerCase().includes(c.split(",")[0].toLowerCase())))
    .slice(0, 5);

  const within = q.match(/\b(?:last|past|this) (\d+ )?(day|week|month)s?\b/);
  const postedWithinDays = within ? (within[2] === "day" ? Number(within[1] ?? 1) : within[2] === "week" ? 7 * Number(within[1] ?? 1) : 30) : null;

  return {
    titles,
    keywords,
    jobTypes: jobTypes.length ? jobTypes : prefs.jobTypes,
    locations: locations.length ? locations : prefs.locations,
    arrangements: arrangements.length ? arrangements : [],
    companies: [],
    postedWithinDays,
  };
}
