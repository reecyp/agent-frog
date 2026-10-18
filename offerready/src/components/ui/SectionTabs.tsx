import Link from "next/link";

export interface SectionTab {
  href: string;
  label: string;
}

/** The route-tab groups for sections with sub-pages. */
export const SECTION_TABS = {
  applications: [
    { href: "/applications", label: "Applications" },
    { href: "/follow-ups", label: "Follow-ups" },
  ],
  profile: [
    { href: "/profile", label: "Career profile" },
    { href: "/profile/questions", label: "Detail questions" },
  ],
  settings: [
    { href: "/settings", label: "Settings" },
    { href: "/ai-log", label: "AI log" },
  ],
} satisfies Record<string, SectionTab[]>;

export type SectionTabGroup = keyof typeof SECTION_TABS;

/**
 * Route tabs under a page title: plain <Link>s, the current one marked aria-current="page" with
 * an accent underline. Scrolls horizontally when the container is narrow.
 *
 * Server-safe (no client hooks): the page says which tab it is via `current`.
 *   <PageHeader title="Follow-ups" tabs={<SectionTabs group="applications" current="/follow-ups" />} />
 * Pass `items` instead of `group` for a one-off set.
 */
export function SectionTabs({
  group,
  items,
  current,
  label,
  className = "",
}: {
  group?: SectionTabGroup;
  items?: SectionTab[];
  /** href of the tab for the page being rendered */
  current: string;
  /** accessible name of the tab nav; defaults to "Section" */
  label?: string;
  className?: string;
}) {
  const tabs = items ?? (group ? SECTION_TABS[group] : []);
  return (
    <nav aria-label={label ?? "Section"} className={`scroll-x shadow-[inset_0_-1px_0_var(--line)] ${className}`}>
      <ul className="flex min-w-max gap-6">
        {tabs.map((t) => {
          const active = t.href === current;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-10 items-center whitespace-nowrap border-b-2 pt-0.5 text-[0.875rem] font-medium transition-colors ${
                  active ? "border-[var(--accent)] text-[var(--ink)]" : "border-transparent text-[var(--ink-2)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
