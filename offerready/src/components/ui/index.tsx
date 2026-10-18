import Link from "next/link";
import { AlertTriangle, type LucideIcon } from "lucide-react";

export { SectionTabs, SECTION_TABS, type SectionTab, type SectionTabGroup } from "./SectionTabs";

/**
 * Page title block. Title + lede on the left, actions on the right (they wrap below the title
 * when the content container is narrow). `tabs` renders beneath, e.g.
 *   tabs={<SectionTabs group="applications" current="/applications" />}
 */
export function PageHeader({ title, lede, actions, tabs }: { title: string; lede?: React.ReactNode; actions?: React.ReactNode; tabs?: React.ReactNode }) {
  return (
    <header className={tabs ? "mb-6" : "mb-8"}>
      <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="min-w-0">
          <h1 className="t-title text-balance break-words">{title}</h1>
          {lede && <p className="measure mt-2 text-pretty text-[0.9375rem] text-[var(--ink-2)]">{lede}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-5">{tabs}</div>}
    </header>
  );
}

export function Section({ title, description, aside, children, className = "" }: { title: string; description?: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className} aria-label={title}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="t-section">{title}</h2>
          {description && <p className="measure mt-0.5 text-[0.875rem] text-[var(--ink-2)]">{description}</p>}
        </div>
        {aside && <div className="t-meta">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, body, action, icon: Icon }: { title: string; body: React.ReactNode; action?: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-[var(--r-panel)] border border-dashed border-[var(--line-strong)] px-5 py-8 sm:px-6">
      {Icon && (
        <span aria-hidden className="mb-3 grid size-9 place-items-center rounded-full bg-[var(--bg-muted)] text-[var(--ink-2)]">
          <Icon className="size-[1.125rem]" />
        </span>
      )}
      <p className="font-semibold">{title}</p>
      <div className="measure mt-1 text-[0.875rem] text-[var(--ink-2)]">{body}</div>
      {action && <div className="mt-4 flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function ErrorNote({ title, body, action }: { title: string; body: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-[var(--r-panel)] border border-[rgb(240_160_146/0.25)] bg-[var(--danger-soft)] px-4 py-3 text-[0.875rem]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-[var(--danger)]">{title}</p>
        <div className="text-[var(--ink-2)]">{body}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="list" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-4 sm:px-5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-[var(--accent)] underline decoration-[rgb(201_174_234/0.35)] underline-offset-[3px] hover:decoration-[var(--accent)]">
      {children}
    </Link>
  );
}

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00` : d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", opts);
}
