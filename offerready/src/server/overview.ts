import "server-only";
import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { listApplications } from "./applications";
import { reviewState } from "@/domain/validate";
import { APPLICATION_STATUSES } from "@/domain/types";

export interface NextAction {
  title: string;
  detail: string;
  href: string;
  cta: string;
  urgency: number; // lower is more urgent
}

/** Everything on the Overview comes from stored records; nothing is estimated. */
export async function loadOverview(studentId: string) {
  const db = await getDb();
  const [apps, tasks, pendingQuestions, aiEvents, recentJobs, docs] = await Promise.all([
    listApplications(studentId),
    db.select().from(schema.tasks).where(and(eq(schema.tasks.studentId, studentId), eq(schema.tasks.done, false))).orderBy(schema.tasks.dueDate),
    db.select({ id: schema.profileAnswers.id, kind: schema.profileAnswers.kind, jobId: schema.profileAnswers.jobId }).from(schema.profileAnswers).where(and(eq(schema.profileAnswers.studentId, studentId), eq(schema.profileAnswers.state, "pending"))),
    db.select({ kind: schema.aiEvents.kind }).from(schema.aiEvents).where(eq(schema.aiEvents.studentId, studentId)),
    db.select({ job: schema.jobs, match: schema.jobMatches }).from(schema.jobMatches).innerJoin(schema.jobs, eq(schema.jobs.id, schema.jobMatches.jobId))
      .where(and(eq(schema.jobMatches.studentId, studentId), isNotNull(schema.jobMatches.lastViewedAt))).orderBy(desc(schema.jobMatches.lastViewedAt)).limit(4),
    db.select({ id: schema.documents.id, applicationId: schema.documents.applicationId, status: schema.documents.status, content: schema.documents.content, kind: schema.documents.kind, version: schema.documents.version })
      .from(schema.documents).innerJoin(schema.applications, eq(schema.applications.id, schema.documents.applicationId))
      .where(and(eq(schema.applications.studentId, studentId), gte(schema.documents.version, 1))),
  ]);

  const actions: NextAction[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const t of tasks.filter((t) => t.dueDate <= today)) {
    actions.push({ title: t.title, detail: t.dueDate < today ? "Overdue reminder" : "Due today", href: t.applicationId ? `/applications/${t.applicationId}` : "/follow-ups", cta: "Open", urgency: t.dueDate < today ? 0 : 1 });
  }
  for (const a of apps) {
    const latest = (kind: "resume" | "cover_letter") => docs.filter((d) => d.applicationId === a.app.id && d.kind === kind).sort((x, y) => y.version - x.version)[0];
    const r = latest("resume");
    const c = latest("cover_letter");
    if (a.app.status === "ready") {
      actions.push({ title: `Apply to ${a.job.company}`, detail: `Both documents are approved for ${a.job.title}.`, href: `/jobs/${a.job.id}?step=export`, cta: "Download and apply", urgency: 2 });
    } else if (r && c && (r.status !== "approved" || c.status !== "approved") && ["preparing", "saved", "interested"].includes(a.app.status)) {
      const open = [r, c].filter((d) => d.status !== "approved").reduce((n, d) => { const s = reviewState(d.content); return n + s.blockers + s.needsReview; }, 0);
      actions.push({ title: `Review your ${a.job.company} drafts`, detail: open ? `${open} ${open === 1 ? "line needs" : "lines need"} your decision before you can approve.` : "Nothing is blocking approval.", href: `/jobs/${a.job.id}?step=review`, cta: "Review", urgency: 3 });
    } else if (!r && ["preparing", "saved", "interested"].includes(a.app.status)) {
      actions.push({ title: `Tailor your ${a.job.company} application`, detail: "Tailor a resume and cover letter for this posting.", href: `/jobs/${a.job.id}`, cta: "Tailor", urgency: 4 });
    }
    if (a.job.deadline || a.app.deadline) {
      const dl = a.app.deadline || a.job.deadline;
      const days = Math.round((new Date(`${dl}T12:00:00`).getTime() - Date.now()) / 86_400_000);
      if (days >= 0 && days <= 7 && !["applied", "interviewing", "offer", "accepted", "rejected", "withdrawn"].includes(a.app.status)) {
        actions.push({ title: `${a.job.company} closes ${days === 0 ? "today" : `in ${days} ${days === 1 ? "day" : "days"}`}`, detail: a.job.title, href: `/jobs/${a.job.id}`, cta: "Open", urgency: 1 });
      }
    }
  }
  const deepDive = pendingQuestions.filter((q) => q.kind === "deep_dive").length;
  if (deepDive) actions.push({ title: `Answer ${deepDive} detail ${deepDive === 1 ? "question" : "questions"} about your experience`, detail: "Real numbers and outcomes make every future application stronger.", href: "/profile/questions", cta: "Answer", urgency: 6 });
  if (!apps.length) actions.push({ title: "Find your first openings", detail: "Describe the role you want; results come from employers' own job boards.", href: "/discover", cta: "Discover jobs", urgency: 5 });

  const stages = APPLICATION_STATUSES.map((s) => ({ ...s, count: apps.filter((a) => a.app.status === s.value).length }));
  const approvedDocs = docs.filter((d) => d.status === "approved").length;
  const caught = aiEvents.filter((e) => e.kind === "flagged_claim").length;
  const resolvedByStudent = aiEvents.filter((e) => ["student_removed", "student_edited", "student_confirmed"].includes(e.kind)).length;

  return {
    actions: actions.sort((a, b) => a.urgency - b.urgency).slice(0, 6),
    apps,
    stages,
    upcoming: tasks.filter((t) => t.dueDate > today).slice(0, 6),
    recentJobs,
    progress: {
      started: apps.length,
      applied: apps.filter((a) => ["applied", "interviewing", "offer", "accepted", "rejected"].includes(a.app.status)).length,
      approvedDocs,
      caught,
      resolvedByStudent,
    },
  };
}
