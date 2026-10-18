import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { ProfileSnapshot } from "@/domain/profile";

export const STUDENT_COOKIE = "or_student";

/** The student this browser belongs to (one profile per browser, by cookie), or null before a resume is uploaded. */
export async function currentStudent() {
  // Read the cookie first: it marks the caller as request-time so the DB is never hit during prerender.
  await connection();
  const id = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!id) return null;
  const db = await getDb();
  const [s] = await db.select().from(schema.students).where(eq(schema.students.id, id));
  return s ?? null;
}

/**
 * The active student. Everything outside /start is gated: no resume sends the browser to the
 * upload page, unanswered onboarding questions send it back to them, and an unchecked profile
 * sends it to the profile check that ends onboarding.
 */
export async function activeStudentId(): Promise<string> {
  const s = await currentStudent();
  if (!s) redirect("/start");
  if (s.onboardingStep === "questions") redirect("/start/questions");
  if (s.onboardingStep !== "done") redirect("/start/confirm");
  return s.id;
}

/** Like activeStudentId, but also during the profile check (step "review"), where the profile editors run. */
export async function profileStudentId(): Promise<string> {
  const s = await currentStudent();
  if (!s) redirect("/start");
  if (s.onboardingStep === "questions") redirect("/start/questions");
  return s.id;
}

export async function getStudent(studentId: string) {
  const db = await getDb();
  const [s] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!s) throw new Error(`Student ${studentId} not found`);
  return s;
}

export async function loadProfile(studentId: string): Promise<ProfileSnapshot> {
  const db = await getDb();
  const s = await getStudent(studentId);
  const [edu, exps, bl, sk, ans] = await Promise.all([
    db.select().from(schema.education).where(eq(schema.education.studentId, studentId)).orderBy(asc(schema.education.sortOrder)),
    db.select().from(schema.experiences).where(eq(schema.experiences.studentId, studentId)).orderBy(asc(schema.experiences.sortOrder)),
    db.select().from(schema.bullets).where(eq(schema.bullets.studentId, studentId)).orderBy(asc(schema.bullets.sortOrder)),
    db.select().from(schema.skills).where(eq(schema.skills.studentId, studentId)).orderBy(asc(schema.skills.sortOrder)),
    db.select().from(schema.profileAnswers).where(eq(schema.profileAnswers.studentId, studentId)).orderBy(asc(schema.profileAnswers.createdAt)),
  ]);
  return {
    student: { id: s.id, fullName: s.fullName, email: s.email, phone: s.phone, linkedin: s.linkedin },
    education: edu.map((e) => ({ ...e })),
    experiences: exps.map((x) => ({
      id: x.id, section: x.section, organization: x.organization, city: x.city, title: x.title,
      startDate: x.startDate, endDate: x.endDate, status: x.status, provenance: x.provenance, sortOrder: x.sortOrder,
      bullets: bl.filter((b) => b.experienceId === x.id).map((b) => ({ id: b.id, text: b.text, originalText: b.originalText, status: b.status, provenance: b.provenance, sortOrder: b.sortOrder })),
    })),
    skills: sk.map((k) => ({ id: k.id, category: k.category, name: k.name, proficiency: k.proficiency, status: k.status, provenance: k.provenance })),
    answers: ans.map((a) => ({ id: a.id, kind: a.kind, question: a.question, answer: a.answer, state: a.state, experienceId: a.experienceId, requirementText: a.requirementText })),
  };
}
