"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { newId } from "@/server/ids";
import { activeStudentId } from "@/server/profile";
import { addManualPosting } from "@/server/jobs/search";
import {
  WorkflowError,
  answerQuestion,
  approveDocument,
  createApplication,
  generateDocuments,
  latestDocuments,
  resolveAllForDemo,
  reviewLine,
  setStatus,
  trackJob,
  updateApplication,
  type LineAction,
} from "@/server/applications";
import type { ApplicationStatus } from "@/domain/types";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>, paths: string[] = []): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    // A route pattern like "/jobs/[id]" revalidates every page of that route.
    for (const p of paths) revalidatePath(p, p.includes("[") ? "page" : undefined);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof WorkflowError) return { ok: false, error: e.message };
    console.error("[action]", (e as Error).message);
    return { ok: false, error: (e as Error).message || "Something went wrong. Try again." };
  }
}

// ---------- Jobs ----------

export async function setJobState(jobId: string, state: "saved" | "dismissed" | "new") {
  return run(async () => {
    const studentId = await activeStudentId();
    const db = await getDb();
    await db.update(schema.jobMatches).set({ state }).where(and(eq(schema.jobMatches.studentId, studentId), eq(schema.jobMatches.jobId, jobId)));
  }, ["/discover", "/studio"]);
}

/** Tailoring is what turns a job into an application: it creates one (once) and drafts both documents. */
export async function tailorJobAction(jobId: string) {
  return run(async () => {
    const studentId = await activeStudentId();
    return generateDocuments(studentId, await createApplication(studentId, jobId));
  }, ["/jobs/[id]", "/applications", "/ai-log", "/studio"]);
}

export async function trackJobAction(jobId: string) {
  return run(async () => trackJob(await activeStudentId(), jobId, "saved"), ["/applications", "/studio"]);
}

export async function pastePosting(_: unknown, form: FormData): Promise<ActionResult> {
  const company = String(form.get("company") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const text = String(form.get("text") ?? "").trim();
  const url = String(form.get("url") ?? "").trim();
  const location = String(form.get("location") ?? "").trim();
  if (!company || !title) return { ok: false, error: "Add the company and the job title." };
  if (text.length < 200) return { ok: false, error: "Paste the full posting text (at least a few paragraphs) so requirements can be quoted from it." };
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: "The link should start with http:// or https://." };
  const studentId = await activeStudentId();
  const { id } = await addManualPosting(studentId, { company, title, location, url, text });
  revalidatePath("/discover");
  redirect(`/jobs/${id}`);
}

// ---------- Applications ----------

export async function generateAction(applicationId: string) {
  return run(async () => generateDocuments(await activeStudentId(), applicationId), ["/jobs/[id]", "/ai-log"]);
}

export async function reviewLineAction(applicationId: string, documentId: string, lineId: string, action: LineAction) {
  return run(async () => reviewLine(await activeStudentId(), documentId, lineId, action), ["/jobs/[id]"]);
}

export async function approveAction(applicationId: string, documentId: string) {
  return run(async () => approveDocument(await activeStudentId(), documentId), ["/jobs/[id]", "/applications", "/studio"]);
}

/** Demo shortcut: resolves every open line of both drafts, then approves them (each approval still runs the export checks). */
export async function resolveAllDemoAction(applicationId: string) {
  return run(async () => {
    const studentId = await activeStudentId();
    const latest = await latestDocuments(applicationId);
    const notes: string[] = [];
    for (const doc of [latest.resume, latest.cover_letter]) {
      if (!doc || doc.status === "approved") continue;
      await resolveAllForDemo(studentId, doc.id);
      try {
        await approveDocument(studentId, doc.id);
      } catch (e) {
        notes.push(`${doc.kind === "resume" ? "Resume" : "Cover letter"}: ${(e as Error).message}`);
      }
    }
    // Returned rather than thrown, so the page still refreshes to show what did resolve.
    return { approved: notes.length === 0, notes };
  }, ["/jobs/[id]", "/applications", "/studio", "/ai-log"]);
}

export async function setStatusAction(applicationId: string, status: ApplicationStatus) {
  return run(async () => setStatus(await activeStudentId(), applicationId, status), ["/jobs/[id]", "/applications", "/studio"]);
}

export async function updateApplicationAction(applicationId: string, patch: { notes?: string; deadline?: string }) {
  return run(async () => updateApplication(await activeStudentId(), applicationId, patch), ["/jobs/[id]", "/applications", "/studio"]);
}

export async function answerAction(answerId: string, answer: string | null, path?: string) {
  return run(async () => answerQuestion(await activeStudentId(), answerId, answer), [path ?? "/profile/questions", "/profile"]);
}

// ---------- Tasks ----------

export async function addTask(input: { title: string; dueDate: string; kind: "follow_up" | "interview" | "deadline" | "outreach" | "other"; applicationId?: string | null; alumniKey?: string | null }) {
  return run(async () => {
    if (!input.title.trim()) throw new WorkflowError("Give the reminder a short title.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) throw new WorkflowError("Pick a due date.");
    const db = await getDb();
    await db.insert(schema.tasks).values({ id: newId("task"), studentId: await activeStudentId(), title: input.title.trim(), dueDate: input.dueDate, kind: input.kind, applicationId: input.applicationId ?? null, alumniKey: input.alumniKey ?? null });
  }, ["/follow-ups", "/studio", "/network"]);
}

export async function toggleTask(taskId: string, done: boolean) {
  return run(async () => {
    const db = await getDb();
    await db.update(schema.tasks).set({ done }).where(and(eq(schema.tasks.id, taskId), eq(schema.tasks.studentId, await activeStudentId())));
  }, ["/follow-ups", "/studio"]);
}

