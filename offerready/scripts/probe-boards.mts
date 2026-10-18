// One-off research script: checks which candidate company boards actually exist on
// Greenhouse / Lever / Ashby public posting APIs and how many internship / Texas roles each has.
// Output feeds src/server/jobs/companies.ts. Run: npx tsx scripts/probe-boards.ts

type Probe = { provider: "greenhouse" | "lever" | "ashby"; token: string };

const greenhouse = [
  "stripe", "airbnb", "robinhood", "databricks", "figma", "brex", "coinbase", "discord", "reddit",
  "pinterest", "lyft", "instacart", "gusto", "affirm", "chime", "sofi", "toast", "squarespace",
  "duolingo", "vercel", "cloudflare", "datadog", "mongodb", "elastic", "gitlab", "twilio", "okta",
  "roku", "dropbox", "asana", "anthropic", "addepar", "carta", "marqeta", "matchgroup", "alkami",
  "point72", "jumptrading", "imc", "drw", "janestreet", "toyotaconnected", "flexport", "samsara",
  "fanduel", "draftkings", "betterment", "wealthfront", "nerdwallet", "chewy", "wayfair", "doordash",
  "airtable", "tripadvisor", "spotify", "bloomberg", "blackstone", "ziprecruiter", "hubspot",
  "invitationhomes", "mrcooper", "sabre", "goldmansachs", "tylertechnologies", "vizient",
];
const lever = ["palantir", "spotify", "plaid", "kpmg", "outreach", "voleon", "zoox", "whoop", "veeva", "attentive"];
const ashby = ["ramp", "notion", "openai", "linear", "deel", "mercury", "vanta", "plaid", "replit", "watershed"];

const probes: Probe[] = [
  ...greenhouse.map((token) => ({ provider: "greenhouse" as const, token })),
  ...lever.map((token) => ({ provider: "lever" as const, token })),
  ...ashby.map((token) => ({ provider: "ashby" as const, token })),
];

function url(p: Probe) {
  if (p.provider === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${p.token}/jobs`;
  if (p.provider === "lever") return `https://api.lever.co/v0/postings/${p.token}?mode=json`;
  return `https://api.ashbyhq.com/posting-api/job-board/${p.token}`;
}

type Row = { title: string; location: string };

function rows(p: Probe, body: unknown): Row[] {
  if (p.provider === "greenhouse") {
    const jobs = (body as { jobs?: { title: string; location?: { name?: string } }[] }).jobs ?? [];
    return jobs.map((j) => ({ title: j.title, location: j.location?.name ?? "" }));
  }
  if (p.provider === "lever") {
    const jobs = Array.isArray(body) ? (body as { text: string; categories?: { location?: string } }[]) : [];
    return jobs.map((j) => ({ title: j.text, location: j.categories?.location ?? "" }));
  }
  const jobs = (body as { jobs?: { title: string; location?: string }[] }).jobs ?? [];
  return jobs.map((j) => ({ title: j.title, location: j.location ?? "" }));
}

async function run(p: Probe) {
  try {
    const res = await fetch(url(p), { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { ...p, ok: false, status: res.status };
    const r = rows(p, await res.json());
    const intern = r.filter((x) => /intern|co-?op|new grad|graduate|university|early career|analyst/i.test(x.title));
    const tx = r.filter((x) => /texas|\bTX\b|dallas|austin|houston|fort worth|plano|irving|remote/i.test(x.location));
    return { ...p, ok: true, total: r.length, earlyOrAnalyst: intern.length, txOrRemote: tx.length,
      sample: intern.slice(0, 3).map((x) => `${x.title} @ ${x.location}`) };
  } catch (e) {
    return { ...p, ok: false, error: String(e).slice(0, 80) };
  }
}

const results = [];
for (let i = 0; i < probes.length; i += 8) {
  results.push(...(await Promise.all(probes.slice(i, i + 8).map(run))));
}
for (const r of results) console.log(JSON.stringify(r));
