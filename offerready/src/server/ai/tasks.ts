import "server-only";
import { z } from "zod";
import { structured, untrusted } from "./claude";
import type { EvidenceItem, JobRequirement, SearchFilters, StudentPreferences } from "@/domain/types";
import type { ProfileSnapshot } from "@/domain/profile";
import type { ParsedResume } from "@/domain/resumeParse";
import type { CoverLetterPlan, TailorPlan } from "@/domain/tailor";
import { focusCounts, type QuestionFocus } from "@/domain/interview";

const transformation = z.enum(["unchanged", "reworded", "shortened", "from_answer", "generated"]);

function evidenceBlock(evidence: EvidenceItem[]) {
  return evidence
    .filter((e) => e.status !== "unverified")
    .map((e) => `- id=${e.id} | status=${e.status} | ${e.context} | ${e.text}`)
    .join("\n");
}

function requirementsBlock(reqs: JobRequirement[]) {
  return reqs.map((r) => `- id=${r.id}${r.preferred ? " (preferred)" : ""}: "${r.quote}"`).join("\n");
}

// ---------- Resume parsing ----------

const ParsedResumeSchema = z.object({
  contact: z.object({ fullName: z.string(), email: z.string(), phone: z.string(), linkedin: z.string() }),
  education: z.array(z.object({ school: z.string(), college: z.string(), city: z.string(), degree: z.string(), graduation: z.string(), majors: z.string(), minors: z.string(), gpa: z.string(), honors: z.string(), coursework: z.string() })),
  experiences: z.array(z.object({ section: z.enum(["experience", "leadership", "project"]), organization: z.string(), city: z.string(), title: z.string(), startDate: z.string(), endDate: z.string(), bullets: z.array(z.string()) })),
  skills: z.array(z.object({ category: z.enum(["technical", "certification", "language", "interest"]), name: z.string(), proficiency: z.string() })),
  uncertain: z.array(z.string()),
});

export async function aiParseResume(text: string): Promise<ParsedResume> {
  return structured({ prompt: "parse-resume", input: untrusted("uploaded resume", text), schema: ParsedResumeSchema, effort: "low" });
}

// ---------- Search interpretation ----------

const FiltersSchema = z.object({
  titles: z.array(z.string()),
  keywords: z.array(z.string()),
  jobTypes: z.array(z.enum(["internship", "full_time"])),
  locations: z.array(z.string()),
  arrangements: z.array(z.enum(["remote", "hybrid", "onsite"])),
  companies: z.array(z.string()),
  postedWithinDays: z.number().nullable(),
  clarification: z.string(),
});

export async function aiInterpretSearch(query: string, prefs: StudentPreferences): Promise<SearchFilters & { clarification: string }> {
  const input = `Student's saved preferences: ${JSON.stringify({ targetRoles: prefs.targetRoles, locations: prefs.locations, jobTypes: prefs.jobTypes, arrangements: prefs.arrangements, timeframe: prefs.timeframe })}\n\nRequest:\n${untrusted("student request", query)}`;
  return structured({ prompt: "interpret-search", input, schema: FiltersSchema, effort: "low", maxTokens: 4000 });
}

// ---------- Alumni search ----------

const AlumniSearchSchema = z.object({ roleTerms: z.array(z.string()), employers: z.array(z.string()), industries: z.array(z.string()), note: z.string() });
export type AlumniSearchTerms = z.infer<typeof AlumniSearchSchema>;

/** Receives only what the student typed. The alumni directory is matched locally and never sent. */
export async function aiAlumniSearch(query: string): Promise<AlumniSearchTerms> {
  const input = `Search:\n${untrusted("student search", query)}`;
  return structured({ prompt: "alumni-search", input, schema: AlumniSearchSchema, effort: "low", maxTokens: 3000 });
}

// ---------- Deep-dive questions ----------

const DeepDiveSchema = z.object({ questions: z.array(z.object({ experienceId: z.string(), question: z.string(), why: z.string() })) });

export async function aiDeepDive(profile: ProfileSnapshot, evidence: EvidenceItem[]) {
  const asked = profile.answers.map((a) => `- ${a.question}`).join("\n") || "(none)";
  const exps = profile.experiences.map((x) => `- experienceId=${x.id}: ${x.title}, ${x.organization}`).join("\n");
  const input = `Experiences:\n${exps}\n\nEvidence:\n${evidenceBlock(evidence)}\n\nAlready asked:\n${asked}`;
  const out = await structured({ prompt: "deep-dive", input, schema: DeepDiveSchema, effort: "low", maxTokens: 4000 });
  const valid = new Set(profile.experiences.map((x) => x.id));
  return out.questions.filter((q) => valid.has(q.experienceId)).slice(0, 5);
}

// ---------- Onboarding questions ----------

const OnboardingQuestionsSchema = z.object({
  questions: z.array(z.object({ experienceId: z.string().nullable(), kind: z.enum(["resume", "behavioral"]), question: z.string(), why: z.string() })),
});

export async function aiOnboardingQuestions(profile: ProfileSnapshot, evidence: EvidenceItem[]) {
  const exps = profile.experiences.map((x) => `- experienceId=${x.id}: ${x.title}, ${x.organization}`).join("\n");
  const input = `Experiences:\n${exps}\n\nEvidence:\n${evidenceBlock(evidence)}`;
  const out = await structured({ prompt: "onboarding-questions", input, schema: OnboardingQuestionsSchema, effort: "low", maxTokens: 4000 });
  const valid = new Set(profile.experiences.map((x) => x.id));
  return out.questions
    .map((q) => ({ ...q, experienceId: q.experienceId && valid.has(q.experienceId) ? q.experienceId : null }))
    .slice(0, 6);
}

const SampleAnswersSchema = z.object({ answers: z.array(z.object({ id: z.string(), answer: z.string() })) });

/** Invented answers for the demo button. Never treated as fact until the student submits them. */
export async function aiSampleAnswers(resumeText: string, questions: { id: string; question: string }[]): Promise<Record<string, string>> {
  const input = `${untrusted("uploaded resume", resumeText)}\n\nQuestions:\n${questions.map((q) => `- id=${q.id}: ${q.question}`).join("\n")}`;
  const out = await structured({ prompt: "sample-answers", input, schema: SampleAnswersSchema, effort: "low", maxTokens: 6000, honesty: false });
  return Object.fromEntries(out.answers.map((a) => [a.id, a.answer]));
}

// ---------- Tailored resume ----------

const TailorSchema = z.object({
  entries: z.array(z.object({
    experienceId: z.string(),
    bullets: z.array(z.object({ text: z.string(), sourceEvidenceIds: z.array(z.string()), requirementId: z.string().nullable(), transformation })),
  })),
  notes: z.array(z.string()),
});

export async function aiTailorResume(profile: ProfileSnapshot, evidence: EvidenceItem[], job: { company: string; title: string; description: string; requirements: JobRequirement[] }): Promise<{ plan: TailorPlan; notes: string[] }> {
  const exps = profile.experiences
    .map((x) => `- experienceId=${x.id} (${x.section}, ${x.startDate} – ${x.endDate}): ${x.title}, ${x.organization}. Bullet evidence ids: ${x.bullets.filter((b) => b.status !== "unverified").map((b) => b.id).join(", ")}. Answer evidence ids: ${profile.answers.filter((a) => a.experienceId === x.id && a.state === "answered").map((a) => a.id).join(", ") || "none"}`)
    .join("\n");
  const input = [
    `Target: ${job.title} at ${job.company}`,
    `Requirements:\n${requirementsBlock(job.requirements)}`,
    `Experiences:\n${exps}`,
    `Evidence:\n${evidenceBlock(evidence)}`,
    `Full posting:\n${untrusted("job posting", job.description.slice(0, 12000))}`,
  ].join("\n\n");
  const out = await structured({ prompt: "tailor-resume", input, schema: TailorSchema, effort: "high" });

  // Keep only bullets for known experiences, citing evidence that belongs to that experience.
  const owner = new Map(evidence.filter((e) => e.experienceId).map((e) => [e.id, e.experienceId as string]));
  const reqIds = new Set(job.requirements.map((r) => r.id));
  const plan: TailorPlan = { entries: {} };
  for (const entry of out.entries) {
    if (!profile.experiences.some((x) => x.id === entry.experienceId)) continue;
    plan.entries[entry.experienceId] = entry.bullets.map((b) => ({
      text: b.text.replace(/^[•\-\s]+/, "").replace(/\.$/, ""),
      // Citations to another experience's evidence are dropped; the validator then flags the line.
      sourceEvidenceIds: b.sourceEvidenceIds.filter((id) => owner.get(id) === entry.experienceId),
      requirementId: b.requirementId && reqIds.has(b.requirementId) ? b.requirementId : null,
      transformation: b.transformation === "generated" ? "reworded" : b.transformation,
    }));
  }
  return { plan, notes: out.notes };
}

// ---------- Cover letter ----------

const LetterLine = z.object({ text: z.string(), sourceEvidenceIds: z.array(z.string()), requirementId: z.string().nullable(), transformation });
const LetterSchema = z.object({
  whyThem: z.array(LetterLine),
  whyYou: z.array(z.array(LetterLine)),
  closing: z.array(LetterLine),
});

export async function aiCoverLetter(evidence: EvidenceItem[], job: { company: string; title: string; description: string; requirements: JobRequirement[] }): Promise<CoverLetterPlan> {
  const input = [
    `Position: ${job.title} at ${job.company}`,
    `Requirements:\n${requirementsBlock(job.requirements)}`,
    `Evidence:\n${evidenceBlock(evidence)}`,
    `Full posting:\n${untrusted("job posting", job.description.slice(0, 12000))}`,
  ].join("\n\n");
  const out = await structured({ prompt: "cover-letter", input, schema: LetterSchema, effort: "high" });
  const known = new Set(evidence.map((e) => e.id));
  const reqIds = new Set(job.requirements.map((r) => r.id));
  const clean = (l: z.infer<typeof LetterLine>) => ({
    text: l.text.trim(),
    sourceEvidenceIds: l.sourceEvidenceIds.filter((id) => known.has(id)),
    requirementId: l.requirementId && reqIds.has(l.requirementId) ? l.requirementId : null,
    transformation: l.transformation,
  });
  return { whyThem: out.whyThem.map(clean), whyYou: out.whyYou.slice(0, 2).map((p) => p.map(clean)), closing: out.closing.map(clean) };
}

// ---------- Interview practice ----------

const QuestionsSchema = z.object({ questions: z.array(z.object({ kind: z.enum(["behavioral", "role", "motivation", "resume"]), text: z.string(), why: z.string() })) });

const FOCUS_LABEL: Record<QuestionFocus, string> = { behavioral: "behavioral (may include one \"why this company/role\")", role: "role", resume: "resume" };

export async function aiInterviewQuestions(evidence: EvidenceItem[], job: { company: string; title: string; requirements: JobRequirement[] }, focuses: QuestionFocus[]) {
  const mix = Object.entries(focusCounts(focuses)).map(([f, n]) => `${n} ${FOCUS_LABEL[f as QuestionFocus]}`).join(", ");
  const input = `Write questions.\nMix: ${mix}\nPosition: ${job.title} at ${job.company}\nRequirements:\n${requirementsBlock(job.requirements)}\n\nStudent evidence:\n${evidenceBlock(evidence)}`;
  const out = await structured({ prompt: "interview", input, schema: QuestionsSchema, effort: "low", maxTokens: 4000 });
  return out.questions.slice(0, 5);
}

const DemoAnswerSchema = z.object({ answer: z.string() });

/** A demo answer, shown everywhere as written by Claude. It then goes through the real evaluator. */
export async function aiDemoInterviewAnswer(evidence: EvidenceItem[], job: { company: string; title: string }, question: string, spoken: boolean): Promise<string> {
  const input = `Write a demo answer${spoken ? " (spoken)" : " (typed)"}.\nPosition: ${job.title} at ${job.company}\nQuestion: ${question}\n\nStudent evidence:\n${evidenceBlock(evidence)}`;
  const out = await structured({ prompt: "demo-interview-answer", input, schema: DemoAnswerSchema, effort: "low", maxTokens: 3000, honesty: false });
  return out.answer;
}

const Star = z.object({ coverage: z.enum(["strong", "thin", "missing"]), feedback: z.string() });
export const FeedbackSchema = z.object({
  rating: z.number(),
  star: z.object({ situation: Star, task: Star, action: Star, result: Star }),
  specificity: z.string(),
  structure: z.string(),
  relevance: z.string(),
  clarity: z.string(),
  talkingPoints: z.array(z.object({ text: z.string(), sourceEvidenceIds: z.array(z.string()) })),
});
export type InterviewFeedback = z.infer<typeof FeedbackSchema>;

export async function aiInterviewFeedback(evidence: EvidenceItem[], job: { company: string; title: string }, question: string, answer: string, spoken = false): Promise<InterviewFeedback> {
  const label = spoken ? "The student's spoken answer (verbatim transcript; filler words kept)" : "The student's typed answer";
  const input = `Give feedback.\nPosition: ${job.title} at ${job.company}\nQuestion: ${question}\n\nStudent evidence:\n${evidenceBlock(evidence)}\n\n${label}:\n${untrusted("student answer", answer)}`;
  const out = await structured({ prompt: "interview", input, schema: FeedbackSchema, effort: "medium", maxTokens: 6000 });
  const known = new Set(evidence.map((e) => e.id));
  return {
    ...out,
    rating: Math.min(5, Math.max(1, Math.round(out.rating * 4) / 4)),
    talkingPoints: out.talkingPoints.map((t) => ({ ...t, sourceEvidenceIds: t.sourceEvidenceIds.filter((id) => known.has(id)) })),
  };
}

// ---------- Alumni outreach ----------

const OutreachSchema = z.object({ subject: z.string(), body: z.string() });

/** Receives only first name, employer and title for the alum. Never an email address. */
export async function aiOutreachDraft(alum: { firstName: string; employer: string; title: string }, goal: string, job: { title: string; company: string } | null, studentName: string, evidence: EvidenceItem[]) {
  const input = `Goal: ${goal}\nAlum: ${alum.firstName}, ${alum.title} at ${alum.employer}\nPosting of interest: ${job ? `${job.title} at ${job.company}` : "none"}\nStudent name: ${studentName}\n\nStudent evidence:\n${evidenceBlock(evidence)}`;
  return structured({ prompt: "outreach", input, schema: OutreachSchema, effort: "low", maxTokens: 3000 });
}
