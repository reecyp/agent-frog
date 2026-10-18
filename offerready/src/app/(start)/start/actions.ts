"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { newId } from "@/server/ids";
import { STUDENT_COOKIE, currentStudent, loadProfile } from "@/server/profile";
import { importDocument, type ImportResult } from "@/server/importer";
import { aiConfigured } from "@/server/ai/claude";
import { aiOnboardingQuestions, aiSampleAnswers } from "@/server/ai/tasks";
import { ruleOnboardingQuestions } from "@/domain/deepDive";
import { evidenceFrom } from "@/domain/profile";
import { normalize } from "@/domain/text";
import type { Arrangement, JobLevel } from "@/domain/types";
import type { ActionResult } from "@/app/actions";

export interface UploadResult {
  resume: ImportResult;
  linkedin?: ImportResult;
  replaced: boolean;
}

const list = (v: FormDataEntryValue | null) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/**
 * Creates this browser's profile from an uploaded resume (plus an optional LinkedIn PDF) and the
 * fitting-room answers, then writes the onboarding questions. Returns what was read so the student
 * sees it before answering. Uploading again replaces the previous profile.
 */
export async function uploadResume(_: unknown, form: FormData): Promise<ActionResult<UploadResult>> {
  const resume = form.get("resume");
  const linkedin = form.get("linkedin");
  if (!(resume instanceof File) || resume.size === 0) return { ok: false, error: "Choose your resume file first." };
  const hasLinkedin = linkedin instanceof File && linkedin.size > 0;

  const db = await getDb();
  const previous = await currentStudent();
  const studentId = newId("stu");
  await db.insert(schema.students).values({
    id: studentId, kind: "personal", fullName: "New student", onboardingStep: "questions",
    preferences: {
      targetRoles: list(form.get("roles")),
      industries: [],
      jobTypes: form.getAll("jobTypes") as JobLevel[],
      locations: list(form.get("locations")),
      arrangements: form.getAll("arrangements") as Arrangement[],
      timeframe: String(form.get("timeframe") ?? "").trim(),
      graduation: "",
      workStyle: String(form.get("workStyle") ?? "").trim(),
    },
  });

  let imported: ImportResult;
  let fromLinkedin: ImportResult | undefined;
  try {
    imported = await importDocument(studentId, resume, "resume", new Set());
    if (hasLinkedin) {
      const p = await loadProfile(studentId);
      fromLinkedin = await importDocument(studentId, linkedin as File, "linkedin", new Set(p.experiences.map((x) => normalize(x.organization))));
    }
  } catch (e) {
    await db.delete(schema.students).where(eq(schema.students.id, studentId));
    return { ok: false, error: (e as Error).message };
  }
  const c = imported.contact;
  await db.update(schema.students).set({
    fullName: c.fullName.trim() || "New student", email: c.email, phone: c.phone, linkedin: c.linkedin,
  }).where(eq(schema.students.id, studentId));

  const profile = await loadProfile(studentId);
  let questions: { experienceId: string | null; question: string }[] = ruleOnboardingQuestions(profile);
  if (aiConfigured()) {
    try {
      questions = await aiOnboardingQuestions(profile, evidenceFrom(profile));
    } catch {
      // The standard questions are a fine fallback; the student can ask for more later.
    }
  }
  // Staggered timestamps keep the questions in the order they were written.
  const now = Date.now();
  await db.insert(schema.profileAnswers).values(questions.map((q, i) => ({
    id: newId("ans"), studentId, kind: "quiz" as const, question: q.question, state: "pending" as const, experienceId: q.experienceId, createdAt: new Date(now + i),
  })));
  // Experiences mentioned in the fitting room are kept as the student's own note, not as facts.
  const extra = String(form.get("extra") ?? "").trim();
  if (extra) {
    await db.insert(schema.profileAnswers).values({
      id: newId("ans"), studentId, kind: "deep_dive", question: "Anything not on your resume you'd want considered?", answer: extra, state: "answered", answeredAt: new Date(),
    });
  }

  if (previous) await db.delete(schema.students).where(eq(schema.students.id, previous.id));
  (await cookies()).set(STUDENT_COOKIE, studentId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
  return { ok: true, data: { resume: imported, linkedin: fromLinkedin, replaced: Boolean(previous) } };
}

async function onboardingStudent() {
  const s = await currentStudent();
  if (!s) redirect("/start");
  return s;
}

/** Claude-written sample answers for the demo button. Returned to the form only; nothing is saved. */
export async function sampleAnswers(): Promise<ActionResult<Record<string, string>>> {
  const s = await onboardingStudent();
  if (!aiConfigured()) return { ok: false, error: "Pre-populate needs Claude. Add ANTHROPIC_API_KEY to .env.local." };
  const db = await getDb();
  const [doc] = await db.select({ text: schema.sourceDocuments.originalText }).from(schema.sourceDocuments).where(eq(schema.sourceDocuments.studentId, s.id));
  const qs = await db.select({ id: schema.profileAnswers.id, question: schema.profileAnswers.question }).from(schema.profileAnswers)
    .where(and(eq(schema.profileAnswers.studentId, s.id), eq(schema.profileAnswers.kind, "quiz")));
  try {
    return { ok: true, data: await aiSampleAnswers(doc?.text ?? "", qs) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Saves every answer at once. All questions must be answered before the profile check opens. */
export async function submitAnswers(answers: Record<string, string>): Promise<ActionResult> {
  const s = await onboardingStudent();
  const db = await getDb();
  const qs = await db.select({ id: schema.profileAnswers.id }).from(schema.profileAnswers)
    .where(and(eq(schema.profileAnswers.studentId, s.id), eq(schema.profileAnswers.kind, "quiz")));
  const missing = qs.filter((q) => (answers[q.id] ?? "").trim().length < 3).length;
  if (missing) return { ok: false, error: `Answer every question first (${missing} left).` };
  for (const q of qs) {
    await db.update(schema.profileAnswers).set({ answer: answers[q.id].trim(), state: "answered", answeredAt: new Date() }).where(eq(schema.profileAnswers.id, q.id));
  }
  await db.update(schema.students).set({ onboardingStep: "review" }).where(eq(schema.students.id, s.id));
  revalidatePath("/", "layout");
  redirect("/start/confirm");
}

/** Ends onboarding once nothing read from the upload is still waiting to be checked. */
export async function finishOnboarding(): Promise<ActionResult> {
  const s = await onboardingStudent();
  const profile = await loadProfile(s.id);
  const unchecked =
    profile.experiences.filter((x) => x.status === "extracted").length +
    profile.experiences.reduce((n, x) => n + x.bullets.filter((b) => b.status === "extracted").length, 0) +
    profile.skills.filter((k) => k.status === "extracted").length;
  if (unchecked) return { ok: false, error: `Confirm the ${unchecked} ${unchecked === 1 ? "item" : "items"} marked for checking first.` };
  const db = await getDb();
  await db.update(schema.students).set({ onboardingStep: "done" }).where(eq(schema.students.id, s.id));
  revalidatePath("/", "layout");
  redirect("/studio");
}
