import type { Metadata } from "next";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { BellRing } from "lucide-react";
import { getDb, schema } from "@/server/db";
import { activeStudentId } from "@/server/profile";
import { listApplications } from "@/server/applications";
import { EmptyState, ListSkeleton, PageHeader, SectionTabs } from "@/components/ui";
import { TaskList, type TaskItem } from "@/components/tasks/TaskList";
import { AddTaskForm } from "@/components/tasks/AddTaskForm";

export const metadata: Metadata = { title: "Follow-ups" };

export default function FollowUpsPage() {
  return (
    <>
      <PageHeader
        title="Follow-ups"
        lede="Reminders for thank-you notes, check-ins, interviews and deadlines. They show here and on your studio home when they're due; AGENT FROG doesn't send email or push notifications."
        tabs={<SectionTabs group="applications" current="/follow-ups" />}
      />
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Tasks />
      </Suspense>
    </>
  );
}

function dateWindow() {
  const now = new Date();
  return { today: now.toISOString().slice(0, 10), week: new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10) };
}

function Group({ title, tasks, tone }: { title: string; tasks: TaskItem[]; tone?: "danger" }) {
  return (
    <section aria-label={title}>
      <h2 className={`mb-2 flex items-baseline gap-2 text-[0.9375rem] font-semibold ${tone === "danger" ? "text-[var(--danger)]" : ""}`}>
        {title}
        <span className="t-num text-[0.8125rem] font-normal text-[var(--ink-3)]">{tasks.length}</span>
      </h2>
      <div className="list px-4">
        <TaskList tasks={tasks} empty="" />
      </div>
    </section>
  );
}

async function Tasks() {
  const studentId = await activeStudentId();
  const db = await getDb();
  const [rows, apps] = await Promise.all([
    db.select().from(schema.tasks).where(eq(schema.tasks.studentId, studentId)).orderBy(asc(schema.tasks.dueDate)),
    listApplications(studentId),
  ]);
  const appLabel = new Map(apps.map((a) => [a.app.id, `${a.job.title}, ${a.job.company}`]));
  const { today, week } = dateWindow();
  const toItem = (t: (typeof rows)[number]): TaskItem => ({
    id: t.id, title: t.title, dueDate: t.dueDate, done: t.done, kind: t.kind,
    href: t.applicationId ? `/applications/${t.applicationId}` : t.alumniKey ? `/network/${t.alumniKey}` : null,
    linkLabel: t.applicationId ? appLabel.get(t.applicationId) : t.alumniKey ? "Open contact" : undefined,
  });
  const open = rows.filter((t) => !t.done);
  const done = rows.filter((t) => t.done);
  const groups = [
    { title: "Overdue", items: open.filter((t) => t.dueDate < today), tone: "danger" as const },
    { title: "This week", items: open.filter((t) => t.dueDate >= today && t.dueDate <= week) },
    { title: "Later", items: open.filter((t) => t.dueDate > week) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex max-w-[52rem] flex-col gap-8">
      <div className="flex flex-col gap-2">
        <AddTaskForm />
        <p className="t-meta">Marking an application as applied adds a follow-up for 7 days later automatically.</p>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={BellRing} title="Nothing to follow up on" body="You're all caught up. Add a reminder above, or from any application or contact." />
      ) : (
        groups.map((g) => <Group key={g.title} title={g.title} tasks={g.items.map(toItem)} tone={g.tone} />)
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[0.875rem] font-semibold text-[var(--ink-2)] hover:text-[var(--ink)]">
            Done <span className="t-num font-normal text-[var(--ink-3)]">{done.length}</span>
          </summary>
          <div className="list mt-3 px-4">
            <TaskList tasks={done.map(toItem)} empty="" />
          </div>
        </details>
      )}
    </div>
  );
}
