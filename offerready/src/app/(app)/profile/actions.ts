"use server";

import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { newId } from "@/server/ids";
import { profileStudentId, getStudent, loadProfile } from "@/server/profile";
import { aiConfigured } from "@/server/ai/claude";
import { aiDeepDive } from "@/server/ai/tasks";
import { evidenceFrom } from "@/domain/profile";
import { ruleDeepDive } from "@/domain/deepDive";
import type { StudentPreferences } from "@/domain/types";
import type { ActionResult } from "@/app/actions";

// The onboarding profile check renders the same editors, so it is refreshed with the profile.
function done(paths = ["/profile", "/start/confirm"]) {
  for (const p of paths) revalidatePath(p);
}

async function owned<T extends { studentId: string }>(rows: T[]): Promise<T> {
  const studentId = await profileStudentId();
  const row = rows[0];
  if (!row || row.studentId !== studentId) throw new Error("Not found.");
  return row;
}

/** The student confirms an extracted fact; only then does it count as confirmed evidence. */
export async function confirmItem(kind: "bullet" | "experience" | "skill" | "education", id: string): Promise<ActionResult> {
  const db = await getDb();
  const studentId = await profileStudentId();
  const table = { bullet: schema.bullets, experience: schema.experiences, skill: schema.skills, education: schema.education }[kind];
  await db.update(table).set({ status: "confirmed" }).where(and(eq(table.id, id), eq(table.studentId, studentId)));
  done();
  return { ok: true };
}

export async function confirmAllExtracted(): Promise<ActionResult> {
  const db = await getDb();
  const studentId = await profileStudentId();
  for (const t of [schema.bullets, schema.experiences, schema.skills, schema.education]) {
    await db.update(t).set({ status: "confirmed" }).where(and(eq(t.studentId, studentId), eq(t.status, "extracted")));
  }
  done();
  return { ok: true };
}

export async function markUnverified(id: string): Promise<ActionResult> {
  const db = await getDb();
  const studentId = await profileStudentId();
  await db.update(schema.bullets).set({ status: "unverified" }).where(and(eq(schema.bullets.id, id), eq(schema.bullets.studentId, studentId)));
  done();
  return { ok: true };
}

/** Editing keeps the original source text; the new wording is the student's own, so it's confirmed. */
export async function editBullet(id: string, text: string): Promise<ActionResult> {
  if (text.trim().length < 8) return { ok: false, error: "That's too short to be an accomplishment statement." };
  const db = await getDb();
  await owned(await db.select().from(schema.bullets).where(eq(schema.bullets.id, id)));
  await db.update(schema.bullets).set({ text: text.trim(), status: "confirmed", provenance: "student" }).where(eq(schema.bullets.id, id));
  done();
  return { ok: true };
}

export async function deleteBullet(id: string): Promise<ActionResult> {
  const db = await getDb();
  await owned(await db.select().from(schema.bullets).where(eq(schema.bullets.id, id)));
  await db.delete(schema.bullets).where(eq(schema.bullets.id, id));
  done();
  return { ok: true };
}

export async function addBullet(experienceId: string, text: string): Promise<ActionResult> {
  if (text.trim().length < 8) return { ok: false, error: "Write a full accomplishment: what you did, how, and the result." };
  const db = await getDb();
  const exp = await owned(await db.select().from(schema.experiences).where(eq(schema.experiences.id, experienceId)));
  const [{ m }] = await db.select({ m: max(schema.bullets.sortOrder) }).from(schema.bullets).where(eq(schema.bullets.experienceId, experienceId));
  await db.insert(schema.bullets).values({ id: newId("b"), studentId: exp.studentId, experienceId, text: text.trim(), originalText: text.trim(), status: "confirmed", provenance: "student", sortOrder: (m ?? -1) + 1 });
  done();
  return { ok: true };
}

export async function saveExperience(input: { id?: string; section: "experience" | "leadership" | "project"; organization: string; city: string; title: string; startDate: string; endDate: string }): Promise<ActionResult> {
  if (!input.organization.trim() || !input.title.trim()) return { ok: false, error: "Add the organization and your title." };
  if (!/^[A-Z][a-z]{2,8} \d{4}$/.test(input.startDate.trim())) return { ok: false, error: "Use Month Year for the start date, like May 2026." };
  if (!/^([A-Z][a-z]{2,8} \d{4}|Present)$/.test(input.endDate.trim())) return { ok: false, error: "Use Month Year or Present for the end date." };
  const db = await getDb();
  const studentId = await profileStudentId();
  const values = { section: input.section, organization: input.organization.trim(), city: input.city.trim(), title: input.title.trim(), startDate: input.startDate.trim(), endDate: input.endDate.trim() };
  if (input.id) {
    await owned(await db.select().from(schema.experiences).where(eq(schema.experiences.id, input.id)));
    await db.update(schema.experiences).set({ ...values, status: "confirmed" }).where(eq(schema.experiences.id, input.id));
  } else {
    const [{ m }] = await db.select({ m: max(schema.experiences.sortOrder) }).from(schema.experiences).where(eq(schema.experiences.studentId, studentId));
    await db.insert(schema.experiences).values({ id: newId("exp"), studentId, ...values, status: "confirmed", provenance: "student", sortOrder: (m ?? -1) + 1 });
  }
  done();
  return { ok: true };
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  const db = await getDb();
  await owned(await db.select().from(schema.experiences).where(eq(schema.experiences.id, id)));
  await db.delete(schema.experiences).where(eq(schema.experiences.id, id));
  done();
  return { ok: true };
}

export async function addSkill(input: { category: "technical" | "certification" | "language" | "interest"; name: string; proficiency: string }): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: "Name the skill." };
  if (input.category === "language" && !input.proficiency.trim()) return { ok: false, error: "Add your level for languages: Fluent, Proficient or Conversational (Neeley guide)." };
  const db = await getDb();
  const studentId = await profileStudentId();
  await db.insert(schema.skills).values({ id: newId("sk"), studentId, category: input.category, name: input.name.trim(), proficiency: input.proficiency.trim(), status: "confirmed", provenance: "student" });
  done();
  return { ok: true };
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  const db = await getDb();
  await owned(await db.select().from(schema.skills).where(eq(schema.skills.id, id)));
  await db.delete(schema.skills).where(eq(schema.skills.id, id));
  done();
  return { ok: true };
}

export async function savePreferences(prefs: Partial<StudentPreferences>): Promise<ActionResult> {
  const db = await getDb();
  const studentId = await profileStudentId();
  const s = await getStudent(studentId);
  await db.update(schema.students).set({ preferences: { ...s.preferences, ...prefs } }).where(eq(schema.students.id, studentId));
  done(["/profile", "/start/confirm", "/discover"]);
  return { ok: true };
}

export async function saveContact(input: { fullName: string; email: string; phone: string; linkedin: string }): Promise<ActionResult> {
  if (!input.fullName.trim()) return { ok: false, error: "Add your name." };
  const db = await getDb();
  await db.update(schema.students).set({ fullName: input.fullName.trim(), email: input.email.trim(), phone: input.phone.trim(), linkedin: input.linkedin.trim() }).where(eq(schema.students.id, await profileStudentId()));
  done();
  return { ok: true };
}

/** Writes 4–5 new detail questions about experiences already in the profile. */
export async function generateDeepDive(): Promise<ActionResult<{ added: number; generator: "claude" | "rules"; note?: string }>> {
  const studentId = await profileStudentId();
  const profile = await loadProfile(studentId);
  let qs = ruleDeepDive(profile);
  let generator: "claude" | "rules" = "rules";
  let note: string | undefined;
  if (aiConfigured()) {
    try {
      qs = await aiDeepDive(profile, evidenceFrom(profile));
      generator = "claude";
    } catch (e) {
      note = `Claude couldn't write questions (${(e as Error).message}); used the standard ones.`;
    }
  }
  const db = await getDb();
  const asked = new Set(profile.answers.map((a) => a.question.toLowerCase()));
  const fresh = qs.filter((q) => !asked.has(q.question.toLowerCase()));
  if (fresh.length) {
    await db.insert(schema.profileAnswers).values(fresh.map((q) => ({ id: newId("ans"), studentId, kind: "deep_dive" as const, question: q.question, state: "pending" as const, experienceId: q.experienceId })));
  }
  done(["/profile/questions", "/studio"]);
  return { ok: true, data: { added: fresh.length, generator, note } };
}
