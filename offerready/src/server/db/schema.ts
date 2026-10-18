import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  ApplicationStatus,
  AtsReport,
  ChangeSummaryItem,
  DocumentContent,
  EvidenceStatus,
  FitFactor,
  JobRequirement,
  OfferField,
  Provenance,
  SearchFilters,
  SearchStats,
  StrongestMatch,
  StudentPreferences,
  Verification,
} from "@/domain/types";

const id = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const students = pgTable("students", {
  id: id(),
  kind: text("kind").$type<"demo" | "practice" | "personal">().notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  preferences: jsonb("preferences").$type<StudentPreferences>().notNull(),
  onboardingStep: text("onboarding_step").notNull().default("done"),
  createdAt: createdAt(),
});

/** The original uploaded file and its extracted text. Never modified after upload. */
export const sourceDocuments = pgTable("source_documents", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"resume" | "linkedin">().notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileBase64: text("file_base64").notNull(),
  originalText: text("original_text").notNull(),
  uploadedAt: createdAt(),
});

export const education = pgTable("education", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  school: text("school").notNull(),
  college: text("college").notNull().default(""),
  city: text("city").notNull().default(""),
  degree: text("degree").notNull().default(""),
  graduation: text("graduation").notNull().default(""),
  majors: text("majors").notNull().default(""),
  minors: text("minors").notNull().default(""),
  gpa: text("gpa").notNull().default(""),
  honors: text("honors").notNull().default(""),
  coursework: text("coursework").notNull().default(""),
  status: text("status").$type<EvidenceStatus>().notNull(),
  provenance: text("provenance").$type<Provenance>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const experiences = pgTable("experiences", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  section: text("section").$type<"experience" | "leadership" | "project">().notNull(),
  organization: text("organization").notNull(),
  city: text("city").notNull().default(""),
  title: text("title").notNull(),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  status: text("status").$type<EvidenceStatus>().notNull(),
  provenance: text("provenance").$type<Provenance>().notNull(),
  sourceDocumentId: text("source_document_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** One accomplishment statement. `originalText` is the exact source line and never changes. */
export const bullets = pgTable("bullets", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  experienceId: text("experience_id").notNull().references(() => experiences.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  originalText: text("original_text").notNull(),
  status: text("status").$type<EvidenceStatus>().notNull(),
  provenance: text("provenance").$type<Provenance>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const skills = pgTable("skills", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  category: text("category").$type<"technical" | "certification" | "language" | "interest">().notNull(),
  name: text("name").notNull(),
  proficiency: text("proficiency").notNull().default(""),
  status: text("status").$type<EvidenceStatus>().notNull(),
  provenance: text("provenance").$type<Provenance>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Deep-dive, quiz, and gap follow-up questions with the student's own answers. */
export const profileAnswers = pgTable("profile_answers", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"deep_dive" | "gap" | "quiz">().notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull().default(""),
  state: text("state").$type<"pending" | "answered" | "declined">().notNull(),
  experienceId: text("experience_id"),
  requirementText: text("requirement_text"),
  jobId: text("job_id"),
  createdAt: createdAt(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
});

export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    source: text("source").$type<"greenhouse" | "lever" | "ashby" | "adzuna" | "manual">().notNull(),
    sourceJobId: text("source_job_id").notNull(),
    sourceLabel: text("source_label").notNull(),
    company: text("company").notNull(),
    title: text("title").notNull(),
    location: text("location").notNull().default(""),
    arrangement: text("arrangement").$type<"remote" | "hybrid" | "onsite" | "unknown">().notNull(),
    level: text("level").$type<"internship" | "full_time" | "unknown">().notNull(),
    url: text("url").notNull(),
    description: text("description").notNull().default(""),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    verification: text("verification").$type<Verification>().notNull(),
    verificationNote: text("verification_note").notNull().default(""),
    requirements: jsonb("requirements").$type<JobRequirement[]>().notNull(),
    compensation: text("compensation").notNull().default(""),
    deadline: text("deadline").notNull().default(""),
    fingerprint: text("fingerprint").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("jobs_source_unique").on(t.source, t.sourceJobId)],
);

/** Per-student state for a job: match explanation plus saved / dismissed. */
export const jobMatches = pgTable(
  "job_matches",
  {
    id: id(),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    fit: text("fit").$type<"strong" | "good" | "stretch">().notNull(),
    factors: jsonb("factors").$type<FitFactor[]>().notNull(),
    strongestMatch: jsonb("strongest_match").$type<StrongestMatch | null>(),
    gap: text("gap"),
    state: text("state").$type<"new" | "saved" | "dismissed">().notNull().default("new"),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    computedAt: createdAt(),
  },
  (t) => [uniqueIndex("job_matches_unique").on(t.studentId, t.jobId)],
);

export const searches = pgTable("searches", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  query: text("query").notNull(),
  filters: jsonb("filters").$type<SearchFilters>().notNull(),
  stats: jsonb("stats").$type<SearchStats>().notNull(),
  resultJobIds: jsonb("result_job_ids").$type<string[]>().notNull(),
  createdAt: createdAt(),
});

export const applications = pgTable("applications", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id),
  status: text("status").$type<ApplicationStatus>().notNull(),
  notes: text("notes").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applicationEvents = pgTable("application_events", {
  id: id(),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  detail: text("detail").notNull(),
  createdAt: createdAt(),
});

/** A versioned tailored resume or cover letter. Lines carry their own provenance. */
export const documents = pgTable("documents", {
  id: id(),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"resume" | "cover_letter">().notNull(),
  version: integer("version").notNull(),
  generator: text("generator").$type<"claude" | "rules">().notNull(),
  content: jsonb("content").$type<DocumentContent>().notNull(),
  changeSummary: jsonb("change_summary").$type<ChangeSummaryItem[]>().notNull(),
  ats: jsonb("ats").$type<AtsReport | null>(),
  status: text("status").$type<"draft" | "approved">().notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** The automatically written AI log: every catch, flag, removal, and failure. */
export const aiEvents = pgTable("ai_events", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  applicationId: text("application_id"),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
});

/** Notes a student keeps on an alum. Keyed by a hash, never by email. */
export const alumniNotes = pgTable("alumni_notes", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  alumniKey: text("alumni_key").notNull(),
  alumniName: text("alumni_name").notNull(),
  employer: text("employer").notNull(),
  jobTitle: text("job_title").notNull().default(""),
  contactDate: text("contact_date").notNull().default(""),
  method: text("method").notNull(),
  outreachStatus: text("outreach_status").notNull(),
  followUpDate: text("follow_up_date").notNull().default(""),
  linkedJobId: text("linked_job_id"),
  body: text("body").notNull().default(""),
  createdAt: createdAt(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  applicationId: text("application_id"),
  alumniKey: text("alumni_key"),
  kind: text("kind").$type<"follow_up" | "interview" | "deadline" | "outreach" | "other">().notNull(),
  title: text("title").notNull(),
  dueDate: text("due_date").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: createdAt(),
});

export const interviewSessions = pgTable("interview_sessions", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  generator: text("generator").$type<"claude" | "rules">().notNull(),
  questions: jsonb("questions").$type<{ id: string; kind: string; text: string; why: string }[]>().notNull(),
  createdAt: createdAt(),
});

export const interviewAnswers = pgTable("interview_answers", {
  id: id(),
  sessionId: text("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  answer: text("answer").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  feedback: jsonb("feedback").$type<Record<string, unknown>>().notNull(),
  rating: real("rating"),
  createdAt: createdAt(),
});

export const offers = pgTable("offers", {
  id: id(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  applicationId: text("application_id"),
  company: text("company").notNull(),
  role: text("role").notNull(),
  fields: jsonb("fields").$type<Record<string, OfferField>>().notNull(),
  createdAt: createdAt(),
});
