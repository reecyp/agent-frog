// Deterministic text utilities shared by matching, tailoring and validation.

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by can do for from has have in into is it its of on or our " +
    "such that the their them they this to was we were will with you your who what when where which " +
    "while within across over per via also more than other any all each both who whom etc using use " +
    "ability able strong work working team role position candidate candidates experience experiences " +
    "including include includes year years plus preferred required requirements qualification qualifications " +
    "must should would could may might well new help helps helping make makes making get gets one two"
  ).split(/\s+/),
);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Very small stemmer: enough to match "reconciling" with "reconciled" or "models" with "model". */
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 4) return w;
  for (const suf of ["ations", "ation", "ings", "ing", "ers", "er", "ies", "ied", "ed", "es", "s"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) {
      w = w.slice(0, -suf.length);
      if (suf === "ies" || suf === "ied") w += "y";
      break;
    }
  }
  if (/(.)\1$/.test(w) && !/ll$|ss$/.test(w)) w = w.slice(0, -1);
  return w;
}

export function contentTokens(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9$%+#./ -]/g, " ")
    .split(/[\s/]+/)
    .map((t) => t.replace(/^[^a-z0-9$]+|[^a-z0-9%+#]+$/g, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
    .map(stem);
}

// ---------- Skills lexicon ----------

/** Canonical skill name -> regex that matches it in free text. Order matters for display only. */
export const SKILL_LEXICON: { name: string; pattern: RegExp; tool: boolean }[] = [
  ["Excel", /\b(ms |microsoft )?excel\b/i, true],
  ["PowerPoint", /\bpower ?point\b/i, true],
  ["Word", /\b(microsoft|ms) word\b/i, true],
  ["SQL", /\bsql\b/i, true],
  ["Python", /\bpython\b/i, true],
  ["R", /\b(?:in|with|using) R\b|\bR programming\b|\bR,\s/, true],
  ["Tableau", /\btableau\b/i, true],
  ["Power BI", /\bpower ?bi\b/i, true],
  ["Alteryx", /\balteryx\b/i, true],
  ["QuickBooks", /\bquickbooks\b/i, true],
  ["Salesforce", /\bsalesforce\b/i, true],
  ["HubSpot", /\bhubspot\b/i, true],
  ["SAP", /\bsap\b/i, true],
  ["NetSuite", /\bnetsuite\b/i, true],
  ["Google Analytics", /\bgoogle analytics\b/i, true],
  ["Looker", /\blooker\b/i, true],
  ["Bloomberg Terminal", /\bbloomberg( terminal)?\b/i, true],
  ["FactSet", /\bfactset\b/i, true],
  ["Capital IQ", /\bcapital ?iq\b/i, true],
  ["Figma", /\bfigma\b/i, true],
  ["Canva", /\bcanva\b/i, true],
  ["Adobe Creative Suite", /\badobe\b|\bphotoshop\b|\billustrator\b|\bindesign\b/i, true],
  ["JavaScript", /\bjavascript\b|\btypescript\b/i, true],
  ["Java", /\bjava\b(?!script)/i, true],
  ["Git", /\bgit(hub)?\b/i, true],
  ["Jira", /\bjira\b/i, true],
  ["Financial modeling", /\bfinancial model(l)?ing\b|\bfinancial models?\b|\b3[- ]statement model/i, false],
  ["Valuation", /\bvaluation(s)?\b|\bvaluation multiples\b/i, false],
  ["DCF", /\bdcf\b|\bdiscounted cash flow/i, false],
  ["Accounting", /\baccounting\b|\bgaap\b/i, false],
  ["Reconciliation", /\breconcil(e|ed|ing|iation|iations)\b/i, false],
  ["Forecasting", /\bforecast(s|ing)?\b/i, false],
  ["Budgeting", /\bbudget(s|ing)?\b/i, false],
  ["Financial statements", /\bfinancial statements?\b|\bbalance sheet\b|\bincome statement\b/i, false],
  ["Data analysis", /\bdata analy(sis|tics|ze|zed|zing)\b|\banaly(ze|zed|zing) data\b/i, false],
  ["Dashboards", /\bdashboards?\b/i, false],
  ["Reporting", /\breport(s|ing)\b/i, false],
  ["Research", /\bresearch(ed|ing)?\b/i, false],
  ["Due diligence", /\bdue diligence\b/i, false],
  ["Credit analysis", /\bcredit (analysis|risk|underwriting)\b|\bunderwrit(e|ing)\b/i, false],
  ["Risk management", /\brisk (management|assessment|mitigation)\b/i, false],
  ["Compliance", /\bcompliance\b|\bregulatory\b/i, false],
  ["Audit", /\baudit(s|ing)?\b/i, false],
  ["Investment analysis", /\binvest(ment|ing)\b|\bportfolio(s)?\b/i, false],
  ["Statistics", /\bstatistic(s|al)\b/i, false],
  ["Machine learning", /\bmachine learning\b/i, false],
  ["Project management", /\bproject management\b|\bmanag(e|ed|ing) projects?\b/i, false],
  ["Operations", /\boperations?\b/i, false],
  ["Supply chain", /\bsupply chain\b|\blogistics\b|\bprocurement\b/i, false],
  ["Sales", /\bsales\b|\bquota\b|\bpipeline\b/i, false],
  ["Marketing", /\bmarketing\b|\bcampaigns?\b/i, false],
  ["Social media", /\bsocial media\b|\binstagram\b|\btiktok\b/i, false],
  ["Customer service", /\bcustomer (service|support|success)\b|\bpatrons?\b|\bclients?\b/i, false],
  ["Presentations", /\bpresent(ation|ations|ed|ing)\b/i, false],
  ["Written communication", /\bwrit(ing|ten)\b|\bdocumentation\b|\bmemos?\b/i, false],
  ["Communication", /\bcommunicat(e|ion|ions|ing)\b/i, false],
  ["Leadership", /\blead(ership|ing)?\b|\bled\b|\bsupervis(e|ed|ing)\b|\bmentor(ed|ing)?\b/i, false],
  ["Teamwork", /\bteam(s|work)?\b|\bcollaborat(e|ed|ion|ive)\b|\bcross[- ]functional\b/i, false],
  ["Stakeholder management", /\bstakeholders?\b/i, false],
  ["Event planning", /\bevents?\b|\bworkshops?\b|\bconferences?\b/i, false],
  ["Training", /\btrain(ed|ing)\b|\bteach(ing)?\b|\btaught\b|\bworkshop\b/i, false],
  ["Problem solving", /\bproblem[- ]solving\b|\bresolv(e|ed|ing)\b/i, false],
  ["Attention to detail", /\battention to detail\b|\bdetail[- ]oriented\b|\baccura(te|cy)\b/i, false],
  ["Spanish", /\bspanish\b|\bbilingual\b/i, false],
].map(([name, pattern, tool]) => ({ name: name as string, pattern: pattern as RegExp, tool: tool as boolean }));

export function skillsIn(text: string): string[] {
  return SKILL_LEXICON.filter((s) => s.pattern.test(text)).map((s) => s.name);
}

export function toolSkillsIn(text: string): string[] {
  return SKILL_LEXICON.filter((s) => s.tool && s.pattern.test(text)).map((s) => s.name);
}

// ---------- Numbers ----------

const WORD_NUMBERS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", eleven: "11", twelve: "12", fifteen: "15", twenty: "20", thirty: "30", forty: "40",
  fifty: "50", hundred: "100", thousand: "1000",
};

/** Numeric facts in a text, normalized (e.g. "$6,200" -> "6200", "45%" -> "45%", "three" -> "3"). */
export function numbersIn(text: string): string[] {
  const out = new Set<string>();
  const t = normalize(text);
  // Units need a word boundary so "120 monthly" stays 120, not "120m".
  for (const m of t.matchAll(/\$?\d[\d,]*(?:\.\d+)?(?:\s*(?:%|(?:k|m|mm|million|billion)\b))?\+?/g)) {
    let n = m[0].replace(/[$,+\s]/g, "");
    if (/^(19|20)\d\d$/.test(n)) continue; // years are checked as dates, not metrics
    n = n.replace(/million$/, "m").replace(/billion$/, "b").replace(/mm$/, "m");
    out.add(n);
  }
  for (const w of t.split(/[^a-z]+/)) if (WORD_NUMBERS[w]) out.add(WORD_NUMBERS[w]);
  return [...out];
}

// ---------- Verbs ----------

export const WEAK_LEAD_VERBS = /^(assisted|helped|aided|supported|participated|contributed|worked on|worked with|shadowed|was responsible for|responsible for|tasked with)\b/i;
export const OWNERSHIP_VERBS = /\b(led|lead|managed|owned|directed|spearheaded|headed|oversaw|supervised|founded|launched|drove|built|designed|created|developed|negotiated|reconciled)\b/i;
export const FUTURE_MARKERS = /\b(will|plan(ned|s)? to|proposed|propose|expected to|aim(ed|s)? to|goal (is|was) to|intend(ed|s)? to|in progress|pending)\b/i;

/** Common gerund -> past tense pairs used when strengthening "Assisted with ___ing" bullets. */
const GERUND_TO_PAST: Record<string, string> = {
  reconciling: "Reconciled", preparing: "Prepared", tracking: "Tracked", organizing: "Organized",
  planning: "Planned", analyzing: "Analyzed", building: "Built", creating: "Created",
  developing: "Developed", researching: "Researched", managing: "Managed", coordinating: "Coordinated",
  updating: "Updated", maintaining: "Maintained", compiling: "Compiled", drafting: "Drafted",
  reviewing: "Reviewed", processing: "Processed", scheduling: "Scheduled", designing: "Designed",
  writing: "Wrote", training: "Trained", auditing: "Audited", forecasting: "Forecasted",
  conducting: "Conducted", producing: "Produced", launching: "Launched", recruiting: "Recruited",
};

/**
 * Proposes a stronger opening verb for a bullet that starts with a weak verb
 * ("Assisted with reconciling ..." -> "Reconciled ..."). Returns null when no safe rewrite exists.
 * The rewrite can overstate ownership, so callers must send it through claim validation.
 */
export function strengthenOpeningVerb(bullet: string): string | null {
  const m = bullet.match(/^(assisted|helped|aided|supported)\s+(with\s+|in\s+)?(\w+ing)\b(.*)$/i);
  if (!m) return null;
  const past = GERUND_TO_PAST[m[3].toLowerCase()];
  if (!past) return null;
  return `${past}${m[4]}`;
}

export function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z-]/g, "") ?? "";
}

export function overlap(a: string, b: string): string[] {
  const tb = new Set(contentTokens(b));
  return [...new Set(contentTokens(a).filter((t) => tb.has(t)))];
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}
