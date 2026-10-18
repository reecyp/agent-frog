"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { toggleTask } from "@/app/actions";
import { useToast } from "../ui/Toast";

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  kind: string;
  href: string | null;
  /** What `href` points to, e.g. "Analyst Intern, Acme". Falls back to "Open". */
  linkLabel?: string;
}

function dueLabel(date: string) {
  const today = new Date(new Date().toDateString());
  const d = new Date(`${date}T00:00:00`);
  const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { text: `${-days} ${days === -1 ? "day" : "days"} overdue`, overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  if (days === 1) return { text: "Due tomorrow", overdue: false };
  return { text: `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, overdue: false };
}

/** In-app reminders. AGENT FROG doesn't send email or push notifications. */
export function TaskList({ tasks, empty }: { tasks: TaskItem[]; empty: string }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(tasks, (state, patch: { id: string; done: boolean }) => state.map((t) => (t.id === patch.id ? { ...t, done: patch.done } : t)));
  if (!optimistic.length) return empty ? <p className="py-2 text-[0.875rem] text-[var(--ink-2)]">{empty}</p> : null;
  return (
    <ul className="divide-y divide-[var(--line)]">
      {optimistic.map((t) => {
        const due = dueLabel(t.dueDate);
        const overdue = !t.done && due.overdue;
        return (
          <li key={t.id} className="flex items-start gap-1 py-2.5">
            {/* The 40px hit area wraps the 18px box. */}
            <span className="-my-2.5 -ml-2.5 grid size-10 shrink-0 place-items-center">
              <input
                type="checkbox"
                id={`task-${t.id}`}
                className="size-[1.125rem] cursor-pointer accent-[var(--accent)]"
                checked={t.done}
                onChange={(e) => {
                  const done = e.target.checked;
                  start(async () => {
                    setOptimistic({ id: t.id, done });
                    const r = await toggleTask(t.id, done);
                    if (!r.ok) toast(r.error, "error");
                  });
                }}
              />
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor={`task-${t.id}`} className={`block cursor-pointer break-words text-[0.9375rem] leading-snug ${t.done ? "text-[var(--ink-3)] line-through" : ""}`}>{t.title}</label>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.8125rem]">
                <span className={overdue ? "inline-flex items-center gap-1 font-semibold text-[var(--danger)]" : "t-num text-[var(--ink-3)]"}>
                  {overdue && <AlertCircle className="size-3.5" aria-hidden />}
                  {t.done ? "Done" : due.text}
                </span>
                {t.href && (
                  <Link href={t.href} className="min-w-0 break-words font-semibold text-[var(--accent)] hover:underline">{t.linkLabel ?? "Open"}</Link>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
