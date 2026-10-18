import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "./db";
import { newId } from "./ids";
import { getStudent, loadProfile } from "./profile";
import { aiConfigured } from "./ai/claude";
import { aiCoverLetter, aiTailorResume } from "./ai/tasks";
import { extractPdfText, renderCoverLetterPdf, renderResumePdf } from "./documents/pdf";
import { assessCoverage } from "@/domain/matching";
import { declinedRequirements, evidenceFrom } from "@/domain/profile";
import { topKeywords } from "@/domain/requirements";
import {
  assembleCoverLetter,
  assembleResume,
  ruleCoverLetterPlan,
  rulePlan,
  type JobContext,
} from "@/domain/tailor";
import { allLines, buildValidationContext, mapLines, revalidate, reviewState } from "@/domain/validate";
import { checkAts } from "@/domain/ats";
import type { ApplicationStatus, DocLine, DocumentContent } from "@/domain/types";
import { APPLICATION_STATUSES } from "@/domain/types";

export class WorkflowError extends Error {}

async function logEvent(applicationId: string, type: string, detail: string) {
  const db = await getDb();
  await db.insert(schema.applicationEvents).values({ id: newId("evt"), applicationId, type, detail });
}

export async function logAi(studentId: string, applicationId: string | null, kind: string, summary: string, detail: Record<string, unknown>) {
  const db = await getDb();
  await db.insert(schema.aiEvents).values({ id: newId("ai"), studentId, applicationId, kind, summary, detail });
}

async function ownedApplication(studentId: string, applicationId: string) {
  const db = await getDb();
  const [app] = await db.select().from(schema.applications).where(and(eq(schema.applications.id, applicationId), eq(schema.applications.studentId, studentId)));
  if (!app) throw new WorkflowError("Application not found.");
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, app.jobId));
  return { app, job };
}

export function jobContext(job: typeof schema.jobs.$inferSelect): JobContext {
  return {
    company: job.company,
    title: job.title,
    sourceLabel: job.sourceLabel,
    requirements: job.requirements,
    keywords: topKeywords(job.description, job.requirements),
  };
}

export async function createApplication(studentId: string, jobId: string): Promise<string> {
  const db = await getDb();
  const [existing] = await db.select({ id: schema.applications.id }).from(schema.applications).where(and(eq(schema.applications.studentId, studentId), eq(schema.applications.jobId, jobId)));
  if (existing) return existing.id;
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));
  if (!job) throw new WorkflowError("That job no longer exists.");
  const id = newId("app");
  await db.insert(schema.applications).values({ id, studentId, jobId, status: "preparing", deadline: job.deadline });
  await db.update(schema.jobMatches).set({ state: "saved" }).where(and(eq(schema.jobMatches.studentId, studentId), eq(schema.jobMatches.jobId, jobId)));
  await logEvent(id, "created", `Started an application for ${job.title} at ${job.company}.`);
  return id;
}

export async function trackJob(studentId: string, jobId: string, status: ApplicationStatus = "saved") {
  const id = await createApplication(studentId, jobId);
  const db = await getDb();
  await db.update(schema.applications).set({ status, updatedAt: new Date() }).where(eq(schema.applications.id, id));
  return id;
}

/** Requirement-by-requirement gap analysis against the student's current evidence. */
export async function gapAnalysis(studentId: string, applicationId: string) {
  const { job } = await ownedApplication(studentId, applicationId);
  const profile = await loadProfile(studentId);
  const evidence = evidenceFrom(profile);
  const declined = declinedRequirements(profile);
  const coverage = job.requirements.map((r) => ({ requirement: r, ...assessCoverage(r, evidence, declined) }));
  return { coverage, evidence };
}

export async function answerQuestion(studentId: string, answerId: string, answer: string | null) {
  const db = await getDb();
  const declined = answer === null || !answer.trim();
  await db.update(schema.profileAnswers)
    .set({ answer: declined ? "" : answer!.trim(), state: declined ? "declined" : "answered", answeredAt: new Date() })
    .where(and(eq(schema.profileAnswers.id, answerId), eq(schema.profileAnswers.studentId, studentId)));
}

export interface GenerationResult {
  generator: "claude" | "rules";
  resumeId: string;
  coverLetterId: string;
  aiError?: string;
  notes: string[];
}

/** Generates new versions of both documents from the student's current evidence. */
export async function generateDocuments(studentId: string, applicationId: string): Promise<GenerationResult> {
  const db = await getDb();
  const { app, job } = await ownedApplication(studentId, applicationId);
  const profile = await loadProfile(studentId);
  const evidence = evidenceFrom(profile);
  const ctx = jobContext(job);
  let generator: "claude" | "rules" = "rules";
  let aiError: string | undefined;
  let notes: string[] = [];

  let resume = assembleResume(profile, ctx, rulePlan(profile, ctx), evidence);
  let letter = assembleCoverLetter(profile, ctx, ruleCoverLetterPlan(profile, ctx), evidence);
  if (aiConfigured()) {
    try {
      const jobInput = { company: job.company, title: job.title, description: job.description, requirements: job.requirements };
      const [tailored, letterPlan] = await Promise.all([aiTailorResume(profile, evidence, jobInput), aiCoverLetter(evidence, jobInput)]);
      resume = assembleResume(profile, ctx, tailored.plan, evidence);
      letter = assembleCoverLetter(profile, ctx, letterPlan, evidence);
      notes = tailored.notes;
      generator = "claude";
    } catch (e) {
      aiError = (e as Error).message;
      await logAi(studentId, applicationId, "ai_error", "Claude drafting failed; used the rule-based draft instead.", { error: aiError });
    }
  }

  const version = async (kind: "resume" | "cover_letter") => {
    const prior = await db.select({ v: schema.documents.version }).from(schema.documents).where(and(eq(schema.documents.applicationId, app.id), eq(schema.documents.kind, kind))).orderBy(desc(schema.documents.version)).limit(1);
    return (prior[0]?.v ?? 0) + 1;
  };
  const resumeId = newId("doc");
  const coverLetterId = newId("doc");
  const resumeAts = checkAts({ doc: resume.content, keywords: ctx.keywords, evidence });
  const letterAts = checkAts({ doc: letter.content, keywords: ctx.keywords, evidence });
  await db.insert(schema.documents).values([
    { id: resumeId, applicationId: app.id, kind: "resume", version: await version("resume"), generator, content: resume.content, changeSummary: resume.changeSummary, ats: resumeAts, status: "draft" },
    { id: coverLetterId, applicationId: app.id, kind: "cover_letter", version: await version("cover_letter"), generator, content: letter.content, changeSummary: letter.changeSummary, ats: letterAts, status: "draft" },
  ]);

  // The AI log records every claim the validator caught before the student ever saw it.
  for (const [kind, doc] of [["resume", resume.content], ["cover letter", letter.content]] as const) {
    for (const l of allLines(doc)) {
      const real = l.issues.filter((i) => i.code !== "placeholder_unresolved" && i.code !== "personal_pronoun");
      if (real.length) {
        await logAi(studentId, applicationId, "flagged_claim", `${generator === "claude" ? "Claude" : "Rule-based"} ${kind} line flagged: ${real.map((i) => i.message).join(" ")}`, { text: l.text, source: l.originalText, issues: real, generator });
      }
    }
  }
  await db.update(schema.applications).set({ status: app.status === "interested" || app.status === "saved" ? "preparing" : app.status, updatedAt: new Date() }).where(eq(schema.applications.id, app.id));
  await logEvent(app.id, "generated", `Drafted resume and cover letter (${generator === "claude" ? "Claude" : "rule-based"}).`);
  return { generator, resumeId, coverLetterId, aiError, notes };
}

async function ownedDocument(studentId: string, documentId: string) {
  const db = await getDb();
  const [row] = await db.select({ doc: schema.documents, app: schema.applications }).from(schema.documents)
    .innerJoin(schema.applications, eq(schema.applications.id, schema.documents.applicationId))
    .where(and(eq(schema.documents.id, documentId), eq(schema.applications.studentId, studentId)));
  if (!row) throw new WorkflowError("Document not found.");
  return row;
}

export type LineAction = { type: "accept" } | { type: "remove" } | { type: "restore" } | { type: "edit"; text: string };

/** Applies one review decision to one line and re-validates it. */
export async function reviewLine(studentId: string, documentId: string, lineId: string, action: LineAction) {
  const db = await getDb();
  const { doc, app } = await ownedDocument(studentId, documentId);
  if (doc.status === "approved") throw new WorkflowError("This version is approved. Generate a new version to make changes.");
  const profile = await loadProfile(studentId);
  const evidence = evidenceFrom(profile);
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, app.jobId));
  const ctx = buildValidationContext(evidence, doc.kind, [job.title, job.company]);
  let target: DocLine | null = null;
  const content = mapLines(doc.content, (l) => {
    if (l.id !== lineId) return l;
    let next: DocLine;
    if (action.type === "accept") next = { ...l, decision: "accepted" };
    else if (action.type === "remove") next = { ...l, decision: "removed" };
    else if (action.type === "restore") next = { ...l, decision: "pending" };
    else next = { ...l, text: action.text.trim().replace(/^[•\-\s]+/, ""), decision: "edited", transformation: l.transformation === "unchanged" ? "reworded" : l.transformation };
    target = revalidate(next, ctx);
    return target;
  });
  if (!target) throw new WorkflowError("Line not found.");
  const t = target as DocLine;
  if (action.type === "accept" && t.verification === "unsupported") {
    throw new WorkflowError("This line can't be accepted as written. Edit it so it matches your evidence, or remove it.");
  }
  await db.update(schema.documents).set({ content }).where(eq(schema.documents.id, documentId));
  const before = allLines(doc.content).find((l) => l.id === lineId)!;
  if (action.type === "remove" && before.transformation !== "unchanged") {
    await logAi(studentId, app.id, "student_removed", "Student removed an AI-changed line.", { text: before.text, issues: before.issues });
  } else if (action.type === "edit") {
    await logAi(studentId, app.id, "student_edited", "Student edited an AI-changed line.", { before: before.text, after: t.text, stillFlagged: t.issues });
  } else if (action.type === "accept" && before.verification === "needs_review") {
    await logAi(studentId, app.id, "student_confirmed", "Student confirmed a flagged line is accurate.", { text: before.text, issues: before.issues });
  }
  return { line: t, state: reviewState(content) };
}

/**
 * Approval gate. Renders the clean PDF from the approved content, reads its text back, and
 * refuses approval if anything critical is unresolved or the export isn't ATS-clean.
 */
export async function approveDocument(studentId: string, documentId: string) {
  const db = await getDb();
  const { doc, app } = await ownedDocument(studentId, documentId);
  const state = reviewState(doc.content);
  if (!state.canApprove) throw new WorkflowError(`Not ready to approve: ${state.reasons.join("; ")}.`);
  const profile = await loadProfile(studentId);
  const evidence = evidenceFrom(profile);
  const [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, app.jobId));
  // Pending lines that passed validation are approved by the student's overall confirmation.
  const content = mapLines(doc.content, (l) => (l.decision === "pending" ? { ...l, decision: "accepted" } : l));
  const rendered = content.kind === "resume" ? await renderResumePdf(content) : await renderCoverLetterPdf(content);
  const extracted = await extractPdfText(rendered.bytes);
  const ats = checkAts({ doc: content, keywords: jobContext(job).keywords, evidence, pdf: { pageCount: rendered.pageCount, extractedText: extracted.text } });
  const failing = ats.checks.filter((c) => !c.passed && (c.id === "one_page" || c.id === "text_extraction" || c.group === "accuracy"));
  if (failing.length) {
    await db.update(schema.documents).set({ ats }).where(eq(schema.documents.id, documentId));
    throw new WorkflowError(`The export didn't pass: ${failing.map((c) => c.detail).join(" ")}`);
  }
  await db.update(schema.documents).set({ content, ats, status: "approved", approvedAt: new Date() }).where(eq(schema.documents.id, documentId));
  await logEvent(app.id, "approved", `Approved ${doc.kind === "resume" ? "resume" : "cover letter"} v${doc.version}.`);

  const latest = await latestDocuments(app.id);
  if (latest.resume?.status === "approved" && latest.cover_letter?.status === "approved" && ["interested", "saved", "preparing"].includes(app.status)) {
    await db.update(schema.applications).set({ status: "ready", updatedAt: new Date() }).where(eq(schema.applications.id, app.id));
    await logEvent(app.id, "status", "Both documents approved. Marked Ready to apply.");
  }
  return { ats };
}

/** Clean export, rendered fresh from approved content only. */
export async function exportPdf(studentId: string, documentId: string): Promise<{ bytes: Uint8Array; filename: string }> {
  const { doc } = await ownedDocument(studentId, documentId);
  if (doc.status !== "approved") throw new WorkflowError("Approve this document before downloading it.");
  const student = await getStudent(studentId);
  const rendered = doc.content.kind === "resume" ? await renderResumePdf(doc.content) : await renderCoverLetterPdf(doc.content);
  const db = await getDb();
  const [{ job }] = await db.select({ job: schema.jobs }).from(schema.applications).innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId)).where(eq(schema.applications.id, doc.applicationId));
  const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  const filename = `${slug(student.fullName)}_${doc.kind === "resume" ? "Resume" : "Cover_Letter"}_${slug(job.company)}_v${doc.version}.pdf`;
  return { bytes: rendered.bytes, filename };
}

export async function latestDocuments(applicationId: string) {
  const db = await getDb();
  const docs = await db.select().from(schema.documents).where(eq(schema.documents.applicationId, applicationId)).orderBy(desc(schema.documents.version));
  return {
    resume: docs.find((d) => d.kind === "resume") ?? null,
    cover_letter: docs.find((d) => d.kind === "cover_letter") ?? null,
  };
}

export async function setStatus(studentId: string, applicationId: string, status: ApplicationStatus) {
  const db = await getDb();
  const { app } = await ownedApplication(studentId, applicationId);
  if (status === "ready" || status === "applied") {
    const latest = await latestDocuments(app.id);
    if (status === "ready" && (latest.resume?.status !== "approved" || latest.cover_letter?.status !== "approved")) {
      throw new WorkflowError("Approve both the resume and the cover letter before marking this ready.");
    }
  }
  await db.update(schema.applications).set({ status, updatedAt: new Date(), appliedAt: status === "applied" ? new Date() : app.appliedAt }).where(eq(schema.applications.id, app.id));
  await logEvent(app.id, "status", `Status changed to ${APPLICATION_STATUSES.find((s) => s.value === status)?.label}.`);
}

export async function updateApplication(studentId: string, applicationId: string, patch: { notes?: string; deadline?: string }) {
  const db = await getDb();
  await ownedApplication(studentId, applicationId);
  await db.update(schema.applications).set({ ...patch, updatedAt: new Date() }).where(eq(schema.applications.id, applicationId));
  if (patch.deadline !== undefined) await logEvent(applicationId, "deadline", patch.deadline ? `Deadline set to ${patch.deadline}.` : "Deadline cleared.");
}

export async function listApplications(studentId: string) {
  const db = await getDb();
  const rows = await db.select({ app: schema.applications, job: schema.jobs, match: schema.jobMatches })
    .from(schema.applications)
    .innerJoin(schema.jobs, eq(schema.jobs.id, schema.applications.jobId))
    .leftJoin(schema.jobMatches, and(eq(schema.jobMatches.jobId, schema.jobs.id), eq(schema.jobMatches.studentId, studentId)))
    .where(eq(schema.applications.studentId, studentId))
    .orderBy(desc(schema.applications.updatedAt));
  const ids = rows.map((r) => r.app.id);
  const docs = ids.length ? await db.select({ id: schema.documents.id, applicationId: schema.documents.applicationId, kind: schema.documents.kind, status: schema.documents.status, version: schema.documents.version }).from(schema.documents).where(inArray(schema.documents.applicationId, ids)) : [];
  return rows.map((r) => {
    const mine = docs.filter((d) => d.applicationId === r.app.id).sort((a, b) => b.version - a.version);
    return { ...r, resume: mine.find((d) => d.kind === "resume") ?? null, coverLetter: mine.find((d) => d.kind === "cover_letter") ?? null };
  });
}

export async function applicationEvents(applicationId: string) {
  const db = await getDb();
  return db.select().from(schema.applicationEvents).where(eq(schema.applicationEvents.applicationId, applicationId)).orderBy(desc(schema.applicationEvents.createdAt));
}

export function documentReview(doc: DocumentContent) {
  return reviewState(doc);
}
