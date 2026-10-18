// Shared domain types. Pure data: no I/O, safe to import from client components.

/** How much we trust a piece of profile evidence. */
export type EvidenceStatus =
  | "extracted" // parsed from an uploaded document, not yet confirmed by the student
  | "confirmed" // the student confirmed it
  | "unverified"; // cannot be substantiated yet

/** Where a fact came from. */
export type Provenance = "resume" | "linkedin" | "student" | "answer" | "demo";

export type Verification =
  | "verified_live" // read successfully from the employer's own public job-board API
  | "unverified" // listed by an aggregator; we could not read the full posting
  | "unreachable" // a check failed: dead link or closed posting
  | "student_provided"; // pasted by the student

export type ApplicationStatus =
  | "interested"
  | "saved"
  | "preparing"
  | "ready"
  | "applied"
  | "interviewing"
  | "offer"
  | "accepted"
  | "rejected"
  | "withdrawn";

export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; active: boolean }[] = [
  { value: "interested", label: "Interested", active: true },
  { value: "saved", label: "Saved", active: true },
  { value: "preparing", label: "Preparing", active: true },
  { value: "ready", label: "Ready to apply", active: true },
  { value: "applied", label: "Applied", active: true },
  { value: "interviewing", label: "Interviewing", active: true },
  { value: "offer", label: "Offer received", active: true },
  { value: "accepted", label: "Accepted", active: false },
  { value: "rejected", label: "Rejected", active: false },
  { value: "withdrawn", label: "Withdrawn", active: false },
];

export type JobLevel = "internship" | "full_time" | "unknown";
export type Arrangement = "remote" | "hybrid" | "onsite" | "unknown";

export interface StudentPreferences {
  targetRoles: string[];
  industries: string[];
  jobTypes: JobLevel[];
  locations: string[];
  arrangements: Arrangement[];
  timeframe: string;
  graduation: string;
  workStyle: string;
  /** Weights the student set for offer comparison, keyed by dimension id. */
  offerWeights?: Record<string, number>;
}

/** A requirement quoted from a real posting. `quote` is copied verbatim from the posting text. */
export interface JobRequirement {
  id: string;
  quote: string;
  keywords: string[];
  kind: "skill" | "experience" | "education" | "trait" | "other";
  /** True when the posting marks it as preferred/nice-to-have rather than required. */
  preferred: boolean;
}

export type Coverage = "supported" | "partial" | "needs_clarification" | "not_supported";

export interface RequirementCoverage {
  requirementId: string;
  coverage: Coverage;
  evidenceIds: string[];
  matchedTerms: string[];
  note: string;
}

export interface FitFactor {
  label: string;
  detail: string;
  weight: number; // contribution in points, shown to the student
}

export interface StrongestMatch {
  requirementId: string;
  requirementQuote: string;
  evidenceId: string;
  evidenceText: string;
  matchedTerms: string[];
  /** "clear" when terms overlap directly; "weak" when the link is thin. */
  strength: "clear" | "weak";
}

export interface SearchFilters {
  titles: string[];
  keywords: string[];
  jobTypes: JobLevel[];
  locations: string[];
  arrangements: Arrangement[];
  companies: string[];
  postedWithinDays: number | null;
}

export interface SourceStat {
  source: string;
  boardsQueried: number;
  postingsScanned: number;
  matched: number;
  errors: string[];
  configured: boolean;
}

export interface SearchStats {
  sources: SourceStat[];
  scanned: number;
  afterFilter: number;
  /** Postings that matched everything except location/arrangement, so the student can widen honestly. */
  outsideLocation?: number;
  duplicatesRemoved: number;
  verified: number;
  returned: number;
  startedAt: string;
  finishedAt: string;
  interpretedBy: "claude" | "rules";
}

// ---------- Tailored documents ----------

export type Transformation =
  | "unchanged" // copied exactly from confirmed evidence
  | "reordered" // same text, moved for relevance
  | "reworded" // wording changed, facts unchanged
  | "shortened"
  | "from_answer" // built from a confirmed follow-up answer
  | "generated"; // new connective text (cover letters)

export type LineVerification = "supported" | "needs_review" | "unsupported";
export type LineDecision = "pending" | "accepted" | "edited" | "removed";

export interface ClaimIssue {
  code:
    | "number_not_in_evidence"
    | "skill_not_in_evidence"
    | "ownership_escalation"
    | "outcome_tense"
    | "date_mismatch"
    | "title_mismatch"
    | "employer_mismatch"
    | "no_source"
    | "placeholder_unresolved"
    | "personal_pronoun";
  severity: "critical" | "warning";
  message: string;
  /** A question the student can answer to resolve the issue. */
  question?: string;
}

export interface DocLine {
  id: string;
  text: string;
  /** The exact source text this line was derived from (empty for generated connective text). */
  originalText: string;
  sourceEvidenceIds: string[];
  requirementId: string | null;
  transformation: Transformation;
  verification: LineVerification;
  decision: LineDecision;
  issues: ClaimIssue[];
}

export interface ResumeEntry {
  experienceId: string;
  organization: string;
  city: string;
  title: string;
  startDate: string;
  endDate: string;
  /** True when this entry moved relative to the base resume. */
  moved: boolean;
  bullets: DocLine[];
}

export interface ResumeContent {
  kind: "resume";
  header: { name: string; phone: string; email: string; linkedin: string };
  education: {
    school: string;
    college: string;
    city: string;
    degree: string;
    graduation: string;
    majors: string;
    minors: string;
    gpa: string;
    honors: string;
    coursework: string;
  }[];
  experience: ResumeEntry[];
  leadership: ResumeEntry[];
  skills: { label: string; line: DocLine }[];
}

export interface CoverLetterContent {
  kind: "cover_letter";
  header: { name: string; phone: string; email: string; linkedin: string };
  date: string;
  recipient: string[];
  greeting: DocLine;
  paragraphs: { role: "why_them" | "why_you" | "closing"; lines: DocLine[] }[];
  signoff: string;
}

export type DocumentContent = ResumeContent | CoverLetterContent;

export interface ChangeSummaryItem {
  lineId: string | null;
  kind: "emphasized" | "moved" | "keyword" | "shortened" | "removed" | "added_from_answer" | "omitted";
  description: string;
  postingQuote: string | null;
  postingSource: string | null;
}

export interface AtsCheck {
  id: string;
  group: "format" | "keywords" | "accuracy";
  label: string;
  passed: boolean;
  detail: string;
}

export interface AtsReport {
  checks: AtsCheck[];
  keywordCoverage: { keyword: string; inDocument: boolean; inEvidence: boolean }[];
  /** Text extracted back out of the exported PDF, when a PDF has been rendered. */
  extractedTextMatches: boolean | null;
  checkedAt: string;
}

export interface OfferField {
  value: string;
  /** True when the number/term comes from the written offer; false for estimates or preferences. */
  verified: boolean;
}

// ---------- Evidence view used by matching and tailoring ----------

/** A flattened, citable fact from the student's profile. */
export interface EvidenceItem {
  id: string;
  kind: "bullet" | "skill" | "education" | "answer" | "title";
  text: string;
  status: EvidenceStatus;
  provenance: Provenance;
  experienceId?: string;
  context: string; // e.g. "Treasurer, Horned Frog Investment Association"
}
