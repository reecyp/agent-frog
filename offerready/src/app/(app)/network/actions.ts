"use server";

import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/server/db";
import { newId } from "@/server/ids";
import { activeStudentId, getStudent, loadProfile } from "@/server/profile";
import { alumByKey } from "@/server/alumni";
import { aiConfigured } from "@/server/ai/claude";
import { aiOutreachDraft } from "@/server/ai/tasks";
import { evidenceFrom } from "@/domain/profile";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/app/actions";

export async function addAlumniNote(input: { alumniKey: string; contactDate: string; method: string; outreachStatus: string; followUpDate: string; linkedJobId: string | null; body: string }): Promise<ActionResult> {
  const alum = await alumByKey(input.alumniKey);
  if (!alum) return { ok: false, error: "That contact isn't in the alumni directory." };
  if (!input.body.trim() && !input.contactDate) return { ok: false, error: "Add a date or a note." };
  const studentId = await activeStudentId();
  const db = await getDb();
  // Only the fields the student needs for their own notes are stored. Never the email address.
  await db.insert(schema.alumniNotes).values({
    id: newId("note"), studentId, alumniKey: alum.key, alumniName: alum.name, employer: alum.employer, jobTitle: alum.title,
    contactDate: input.contactDate, method: input.method, outreachStatus: input.outreachStatus, followUpDate: input.followUpDate,
    linkedJobId: input.linkedJobId, body: input.body.trim(),
  });
  if (input.followUpDate) {
    await db.insert(schema.tasks).values({ id: newId("task"), studentId, alumniKey: alum.key, kind: "outreach", title: `Follow up with ${alum.name} (${alum.employer})`, dueDate: input.followUpDate });
  }
  revalidatePath(`/network/${alum.key}`);
  revalidatePath("/network");
  revalidatePath("/studio");
  return { ok: true };
}

const GOALS: Record<string, string> = {
  coffee: "a 15-minute informational conversation",
  role: "a question about the role and team",
  referral: "a referral (the student has already spoken with this alum)",
};

/**
 * Drafts an outreach email. Claude receives only the alum's first name, employer and title;
 * without an AI key, a template with visible blanks is returned instead.
 */
export async function draftOutreach(alumniKey: string, goal: string, jobId: string | null): Promise<ActionResult<{ subject: string; body: string; generator: "claude" | "rules"; note?: string }>> {
  const alum = await alumByKey(alumniKey);
  if (!alum) return { ok: false, error: "That contact isn't in the alumni directory." };
  const studentId = await activeStudentId();
  const student = await getStudent(studentId);
  const db = await getDb();
  const [job] = jobId ? await db.select({ title: schema.jobs.title, company: schema.jobs.company }).from(schema.jobs).where(eq(schema.jobs.id, jobId)) : [];
  const goalText = GOALS[goal] ?? GOALS.coffee;
  const template = () => {
    const ask = goal === "referral"
      ? `Since we spoke, I've applied [[PERSONALIZE: or plan to apply]] for the ${job?.title ?? "[[PERSONALIZE: role]]"} role. Would you be comfortable referring me, or pointing me to the right person?`
      : goal === "role"
        ? `I'm interested in the ${job?.title ?? "[[PERSONALIZE: role]]"} role and would value your perspective on [[PERSONALIZE: one specific question about the team or work]].`
        : `Would you be open to a 15-minute call in the next few weeks? I'd especially like to hear about [[PERSONALIZE: what you want to learn from them]].`;
    return {
      subject: job ? `TCU student interested in ${job.company}` : `TCU student reaching out`,
      body: `Hi ${alum.firstName},\n\nI'm a TCU student and found you through the TCU alumni network. [[PERSONALIZE: one sentence on your background, e.g. your major and a relevant experience]]\n\n${ask}\n\nThank you for your time.\n\nBest,\n${student.fullName}`,
    };
  };
  if (!aiConfigured()) return { ok: true, data: { ...template(), generator: "rules" } };
  try {
    const evidence = evidenceFrom(await loadProfile(studentId));
    const d = await aiOutreachDraft({ firstName: alum.firstName, employer: alum.employer, title: alum.title }, goalText, job ?? null, student.fullName, evidence);
    return { ok: true, data: { ...d, generator: "claude" } };
  } catch (e) {
    return { ok: true, data: { ...template(), generator: "rules", note: `Claude couldn't draft this (${(e as Error).message}). Here's a template instead.` } };
  }
}
