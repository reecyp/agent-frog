// FICTIONAL sample data for Sections C–I, built only from Jordan Reyes's sample profile (see sample.ts).
// The companies and postings are invented. Labels and checks mirror the real app's own wording.

/* ---------- C. Tailoring: two fictional postings, matched against the profile ---------- */

/** Coverage words are the app's own (CoverageBadge). */
export type Coverage = "supported" | "partial" | "not_supported";
export const COVERAGE_LABEL: Record<Coverage, string> = {
  supported: "Backed by your evidence",
  partial: "Partly backed",
  not_supported: "Not in your profile",
};

export interface Requirement {
  id: string;
  quote: string;
  coverage: Coverage;
  /** The resume line this requirement pulled up, if any. */
  lineId: string | null;
  /** Said plainly when the match is partial or missing. */
  gap?: string;
}

export type Change = "Copied exactly from your profile" | "Moved up because it’s relevant to this posting" | "Reworded";

export interface TailoredLine {
  id: string;
  org: string;
  text: string;
  original: string;
  change: Change;
}

export interface Job {
  id: string;
  company: string;
  title: string;
  place: string;
  summary: string;
  requirements: Requirement[];
  /** Resume lines in the order this job puts them. */
  lines: TailoredLine[];
}

const ORIGINAL = {
  models: { org: "Brazos Ridge Wealth Advisors", original: "Built Excel models tracking quarterly performance of 40 client portfolios against benchmarks, cutting report preparation from 3 days to 1" },
  research: { org: "Brazos Ridge Wealth Advisors", original: "Researched 12 small-cap companies and summarized valuation multiples for weekly investment committee meetings" },
  budget: { org: "Horned Frog Investment Association", original: "Manage a $6,200 annual budget for a 45-member organization, publishing monthly expense reports in Excel" },
  staff: { org: "TCU Campus Recreation", original: "Supervise 14 student staff across evening shifts, scheduling coverage for 60+ weekly operating hours" },
} as const;

export const JOBS: Job[] = [
  {
    id: "lonestar",
    company: "Lone Star Payments",
    title: "Financial Analyst Intern",
    place: "Dallas, TX, hybrid, summer 2027",
    summary: "Support the FP&A team with monthly reporting, variance analysis and research for leadership reviews.",
    requirements: [
      { id: "r1", quote: "Build and maintain Excel models for monthly performance reporting", coverage: "supported", lineId: "models" },
      { id: "r2", quote: "Summarize research and valuation work for leadership", coverage: "supported", lineId: "research" },
      { id: "r3", quote: "Track spending against budget and explain variances", coverage: "partial", lineId: "budget", gap: "You track a budget and report on it. Your profile doesn’t mention explaining variances, so the line doesn’t either." },
      { id: "r4", quote: "Experience with SQL or Power BI", coverage: "partial", lineId: null, gap: "SQL is in your skills at beginner level. Power BI isn’t, so it isn’t claimed." },
    ],
    lines: [
      { id: "models", ...ORIGINAL.models, text: ORIGINAL.models.original, change: "Copied exactly from your profile" },
      { id: "research", ...ORIGINAL.research, text: "Summarized EV/EBITDA and P/E multiples for 12 researched small-cap companies, drawn from 10-K filings, for weekly investment committee meetings", change: "Reworded" },
      { id: "budget", ...ORIGINAL.budget, text: ORIGINAL.budget.original, change: "Moved up because it’s relevant to this posting" },
      { id: "staff", ...ORIGINAL.staff, text: ORIGINAL.staff.original, change: "Copied exactly from your profile" },
    ],
  },
  {
    id: "trinity",
    company: "Trinity Ledger Software",
    title: "Business Analyst Intern",
    place: "Fort Worth, TX, on site, summer 2027",
    summary: "Work with product and operations to turn customer and usage data into clear recommendations.",
    requirements: [
      { id: "r1", quote: "Coordinate schedules and work across a team", coverage: "supported", lineId: "staff" },
      { id: "r2", quote: "Turn spreadsheets into clear recommendations", coverage: "supported", lineId: "models" },
      { id: "r3", quote: "Comfortable presenting to stakeholders", coverage: "partial", lineId: "research", gap: "Your research went to weekly committee meetings, but your profile doesn’t say you presented it. The line keeps your wording." },
      { id: "r4", quote: "Experience with Jira or product analytics tools", coverage: "not_supported", lineId: null, gap: "Nothing in your profile mentions these, so the resume doesn’t either." },
    ],
    lines: [
      { id: "staff", ...ORIGINAL.staff, text: "Scheduled 14 student staff across evening shifts, covering 60+ weekly operating hours", change: "Reworded" },
      { id: "models", ...ORIGINAL.models, text: ORIGINAL.models.original, change: "Moved up because it’s relevant to this posting" },
      { id: "research", ...ORIGINAL.research, text: ORIGINAL.research.original, change: "Copied exactly from your profile" },
      { id: "budget", ...ORIGINAL.budget, text: ORIGINAL.budget.original, change: "Copied exactly from your profile" },
    ],
  },
];

/* ---------- D. Review: the app's verification words and its ownership check ---------- */

export type Verification = "verified" | "needs_review";
export interface ReviewLine {
  id: string;
  original: string;
  tailored: string;
  verification: Verification;
  change: Change;
  why: string;
  source: string;
  /** Only on flagged lines: what the checker found. */
  issue?: string;
}

export const REVIEW_LINES: ReviewLine[] = [
  {
    id: "v1",
    original: ORIGINAL.research.original,
    tailored: "Summarized EV/EBITDA and P/E multiples for 12 researched small-cap companies, drawn from 10-K filings, for weekly investment committee meetings",
    verification: "verified",
    change: "Reworded",
    why: "Summarize research and valuation work for leadership",
    source: "Brazos Ridge Wealth Advisors, and your answer naming the multiples and where the data came from",
  },
  {
    id: "v2",
    original: "Assisted with reconciling monthly client billing statements in QuickBooks",
    tailored: "Reconciled monthly client billing statements in QuickBooks",
    verification: "needs_review",
    change: "Reworded",
    why: "Track spending against budget and explain variances",
    source: "Brazos Ridge Wealth Advisors",
    issue: "“Reconciled” claims more ownership than your original wording.",
  },
];

/* ---------- E. Cover letter: the Neeley structure, personal reasons left as visible blanks ---------- */

export interface LetterPart {
  id: string;
  role: string;
  note: string;
  /** Text runs; `blank` runs are left for the student to write. */
  runs: { text: string; blank?: boolean }[];
}

export const LETTER: LetterPart[] = [
  {
    id: "them",
    role: "Why them",
    note: "Names the role, then leaves two blanks. Only you know why this company and who sent you, so nothing is guessed.",
    runs: [
      { text: "I am applying for the Financial Analyst Intern position at Lone Star Payments. " },
      { text: "Name a specific, genuine reason this company interests you.", blank: true },
      { text: " " },
      { text: "How you found the role, or who referred you.", blank: true },
    ],
  },
  {
    id: "you",
    role: "Why you",
    note: "One real experience matched to one requirement. The facts come from your confirmed profile; how it prepares you is yours to say.",
    runs: [
      { text: "As a former Financial Analyst Intern with Brazos Ridge Wealth Advisors, I built Excel models tracking quarterly performance of 40 client portfolios against benchmarks, cutting report preparation from 3 days to 1. " },
      { text: "Explain how this prepares you for monthly performance reporting.", blank: true },
    ],
  },
  {
    id: "close",
    role: "Close",
    note: "Short and plain. No “passionate”, no “uniquely qualified”: a closing line has no evidence to back claims like that.",
    runs: [{ text: "Thank you for your time and consideration. I look forward to discussing my qualifications for the Financial Analyst Intern role in greater detail." }],
  },
];

/* ---------- F. Export: what the app's checks look at before a PDF can be downloaded ---------- */

export const EXPORT_CHECKS = [
  { id: "claims", label: "Every claim traces to your profile", ok: true, detail: "Each line cites evidence you confirmed." },
  { id: "confirm", label: "Flagged lines confirmed by you", ok: true, detail: "Nothing waiting on you." },
  { id: "blanks", label: "Personalization blanks filled in", ok: false, detail: "3 blanks left to fill in, in the cover letter." },
];

/* ---------- G. Interview practice: sample questions and the typed-answer STAR check ---------- */

export const QUESTIONS = [
  { id: "q1", focus: "Behavioral", text: "Tell me about a time you made a process faster." },
  { id: "q2", focus: "From your resume", text: "Walk me through how you researched the 12 small-cap companies." },
  { id: "q3", focus: "For this role", text: "How would you explain a budget variance to someone outside finance?" },
] as const;

export const SAMPLE_ANSWER =
  "During my internship at Brazos Ridge, quarterly reports took three days because everything was copied by hand. I needed to get them out faster. I built Excel models that compared each portfolio with its benchmark, and as a result report preparation went from 3 days to 1.";

/* ---------- H. Applications: fictional entries, the app's real status list ---------- */

export const STATUSES = ["Interested", "Saved", "Preparing", "Ready to apply", "Applied", "Interviewing", "Offer received", "Accepted", "Rejected", "Withdrawn"] as const;
export type Status = (typeof STATUSES)[number];

export const APPLICATIONS: { id: string; company: string; title: string; status: Status; updated: string }[] = [
  { id: "a1", company: "Lone Star Payments", title: "Financial Analyst Intern", status: "Ready to apply", updated: "Oct 14" },
  { id: "a2", company: "Trinity Ledger Software", title: "Business Analyst Intern", status: "Preparing", updated: "Oct 12" },
  { id: "a3", company: "Cowtown Credit Union", title: "Finance Intern", status: "Applied", updated: "Oct 3" },
];

/* ---------- I. Profile questions: the app asks about gaps, and answers become evidence ---------- */

export const PROFILE_QUESTION = {
  context: "Horned Frog Investment Association, Treasurer",
  question: "As Treasurer, did your expense reports change any decision the officers made?",
  why: "A concrete outcome would make this bullet stronger. If there wasn’t one, say so and nothing is added.",
};
