import type { ApplicationView } from "@/server/applicationView";
import { formatDate } from "../ui";
import { NotesForm } from "./NotesForm";
import { TaskList } from "../tasks/TaskList";
import { AddTaskForm } from "../tasks/AddTaskForm";

/** Each block in the job page's side column. The column becomes 1–3 CSS columns depending on room, so blocks never split. */
export const ASIDE_BLOCK = "mb-10 break-inside-avoid";

/** Application-specific blocks for the job page's side column (rendered inside its `<aside>`). */
export function ApplicationSidebar({ view }: { view: ApplicationView }) {
  return (
    <>
      <section aria-labelledby="notes-h" className={ASIDE_BLOCK}>
        <h2 id="notes-h" className="t-card mb-2.5">Notes and deadline</h2>
        <NotesForm applicationId={view.app.id} notes={view.app.notes} deadline={view.app.deadline} />
      </section>
      <section aria-labelledby="reminders-h" className={ASIDE_BLOCK}>
        <h2 id="reminders-h" className="t-card mb-2.5">Reminders</h2>
        <TaskList tasks={view.tasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.dueDate, done: t.done, kind: t.kind, href: null }))} empty="No reminders for this application." />
        <div className="mt-2"><AddTaskForm applicationId={view.app.id} /></div>
      </section>
      <section aria-labelledby="timeline-h" className={ASIDE_BLOCK}>
        <h2 id="timeline-h" className="t-card mb-3">Timeline</h2>
        <ol className="relative grid gap-3 border-l border-line pl-4">
          {view.events.map((e) => (
            <li key={e.id} className="relative min-w-0 text-[0.875rem]">
              <span aria-hidden className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-line-strong ring-2 ring-bg" />
              <p className="break-words">{e.detail}</p>
              <p className="t-meta">{formatDate(e.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
