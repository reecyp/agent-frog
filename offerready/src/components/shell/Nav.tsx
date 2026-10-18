"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Briefcase, Compass, House, Menu, MessagesSquare, ChevronLeft, ChevronRight, Settings, UserRound, Users, X, type LucideIcon } from "lucide-react";
import { indicatorSpring } from "../motion";
import { Wordmark } from "./Wordmark";
import { NAV_KEY } from "./navState";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other path prefixes that count as this section (sub-pages reached by SectionTabs). */
  also?: string[];
  /** Shorter label for the 72px rail, where the full one doesn't fit. */
  short?: string;
}

export const PRIMARY: NavItem[] = [
  { href: "/studio", label: "Home", icon: House },
  { href: "/discover", label: "Jobs", icon: Compass, also: ["/jobs"] },
  { href: "/applications", label: "Applications", short: "Apps", icon: Briefcase, also: ["/follow-ups"] },
  { href: "/interview", label: "Interview", icon: MessagesSquare },
  { href: "/network", label: "Network", icon: Users },
];

export const SECONDARY: NavItem[] = [
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/settings", label: "Settings", icon: Settings, also: ["/ai-log"] },
];

function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isActive(pathname: string, item: NavItem) {
  return [item.href, ...(item.also ?? [])].some((p) => under(pathname, p));
}

/**
 * `responsive`: the sidebar column — a 72px rail (icon over a small label) from md, a 240px
 * sidebar (icon beside label) from xl unless the student collapsed it to icons only.
 * `full`: the mobile drawer, always icon beside label.
 */
type Mode = "responsive" | "full";

function NavLink({ item, pathname, mode, secondary, onNavigate }: { item: NavItem; pathname: string | null; mode: Mode; secondary?: boolean; onNavigate?: () => void }) {
  const active = pathname !== null && isActive(pathname, item);
  const Icon = item.icon;
  const r = mode === "responsive";
  // Rail: primary items stack icon over label; secondary items are icon-only with a tooltip.
  const layout = r
    ? secondary
      ? "mx-auto size-11 justify-center xl:expanded:mx-0 xl:expanded:size-auto xl:expanded:min-h-10 xl:expanded:w-full xl:expanded:justify-start xl:expanded:gap-3 xl:expanded:px-3"
      : "min-h-14 flex-col justify-center gap-1 px-1 py-1.5 collapsed:mx-auto collapsed:size-11 collapsed:min-h-0 collapsed:p-0 xl:expanded:min-h-10 xl:expanded:flex-row xl:expanded:justify-start xl:expanded:gap-3 xl:expanded:px-3 xl:expanded:py-0"
    : "min-h-11 gap-3 px-3";
  const labelClass = r
    ? secondary
      ? "relative hidden text-[0.875rem] xl:expanded:inline"
      : "relative max-w-full text-center text-[0.6875rem] collapsed:hidden leading-tight tracking-[-0.01em] xl:expanded:text-left xl:expanded:text-[0.875rem] xl:expanded:leading-normal xl:expanded:tracking-normal"
    : "relative text-[0.9375rem]";
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={r ? item.label : undefined}
      className={`group relative flex items-center rounded-[var(--r-control)] font-medium transition-colors ${layout} ${
        active ? "text-[var(--ink)]" : "text-[var(--on-instrument-2)] hover:bg-white/[0.04] hover:text-[var(--ink)]"
      }`}
    >
      {active && (
        <motion.span
          layoutId={`nav-active-${mode}`}
          transition={indicatorSpring}
          className="absolute inset-0 rounded-[var(--r-control)] bg-[var(--frog-soft)] shadow-[inset_2px_0_0_var(--frog-text)]"
          aria-hidden
        />
      )}
      <Icon className={`relative size-5 shrink-0 ${active ? "text-[var(--frog-text)]" : ""}`} strokeWidth={active ? 2 : 1.5} aria-hidden />
      <span className={labelClass}>
        {r && item.short ? (
          <>
            <span className="xl:expanded:hidden">{item.short}</span>
            <span className="hidden xl:expanded:inline">{item.label}</span>
          </>
        ) : (
          item.label
        )}
      </span>
      {r && (
        <span aria-hidden className={secondary ? "xl:expanded:hidden" : "hidden collapsed:inline"}>
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-[var(--r-control)] bg-[var(--instrument-2)] px-2.5 py-1 text-[0.75rem] font-medium text-[var(--ink)] shadow-[var(--shadow-pop)] group-hover:block group-focus-visible:block">
            {item.label}
          </span>
        </span>
      )}
    </Link>
  );
}

function Links({ pathname, mode, onNavigate }: { pathname: string | null; mode: Mode; onNavigate?: () => void }) {
  const r = mode === "responsive";
  return (
    <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col">
      <ul className={`flex flex-col ${r ? "gap-1 xl:expanded:gap-0.5" : "gap-0.5"}`}>
        {PRIMARY.map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} mode={mode} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <ul className={`mt-auto flex flex-col border-t border-[var(--instrument-line)] pt-3 ${r ? "gap-1 xl:expanded:gap-0.5" : "gap-0.5"}`}>
        {SECONDARY.map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} mode={mode} secondary onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function subscribeNav(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nav"] });
  return () => observer.disconnect();
}

/** A small arrow tab on the sidebar's right edge, halfway down: collapses the full sidebar to icons and back (xl and up; narrower screens always use the rail). */
function CollapseToggle() {
  const collapsed = useSyncExternalStore(subscribeNav, () => document.documentElement.dataset.nav === "collapsed", () => false);
  const toggle = () => {
    const next = !collapsed;
    if (next) document.documentElement.dataset.nav = "collapsed";
    else delete document.documentElement.dataset.nav;
    try {
      localStorage.setItem(NAV_KEY, next ? "collapsed" : "expanded");
    } catch {
      // Remembering the choice is a convenience only.
    }
  };
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      className="absolute right-0 top-1/2 z-30 hidden size-6 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border border-[var(--instrument-line)] bg-[var(--instrument-2)] text-[var(--ink-3)] shadow-[var(--shadow-pop)] transition-colors hover:border-[var(--frog-text)] hover:text-[var(--frog-text)] xl:grid"
    >
      {collapsed ? <ChevronRight className="size-3.5" strokeWidth={2.4} aria-hidden /> : <ChevronLeft className="size-3.5" strokeWidth={2.4} aria-hidden />}
    </button>
  );
}

/** Reads the URL, so it renders inside <Suspense>; NavFrame with no pathname is the static fallback. */
export function Nav({ status, drawerStatus }: { status: React.ReactNode; drawerStatus: React.ReactNode }) {
  return <NavFrame pathname={usePathname()} status={status} drawerStatus={drawerStatus} />;
}

export function NavFrame({ pathname, status, drawerStatus }: { pathname: string | null; status: React.ReactNode; drawerStatus: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Close the drawer whenever the route changes (adjusting state during render, per React docs).
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-[var(--r-control)] focus:bg-[var(--paper)] focus:px-3 focus:py-2 focus:font-semibold focus:shadow-[var(--shadow-pop)]"
      >
        Skip to content
      </a>

      {/* Rail (md) / sidebar (xl) */}
      <div className="hidden border-r border-[var(--instrument-line)] bg-[var(--instrument)] bg-[image:var(--grain),radial-gradient(ellipse_140%_40%_at_0%_0%,rgb(var(--glow)/0.08),transparent_70%)] md:block">
        {/* The sticky wrapper (not the aside, which scrolls) holds the edge toggle so it isn't clipped.
            Sticky makes its own stacking layer; z-30 keeps tooltips and the toggle above page content (dialogs are z-50). */}
        <div className="sticky top-0 z-30 h-dvh">
          <aside className="flex h-full flex-col gap-5 px-1 py-4 xl:expanded:gap-6 xl:expanded:overflow-y-auto xl:expanded:px-3 xl:expanded:py-5">
            <div className="flex justify-center xl:expanded:justify-start xl:expanded:px-1">
              <Wordmark collapse />
            </div>
            <Links pathname={pathname} mode="responsive" />
            <div>{status}</div>
          </aside>
          <CollapseToggle />
        </div>
      </div>

      {/* Top bar (< md) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--instrument-line)] bg-[rgb(21_16_13/0.72)] px-3 backdrop-blur-md md:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-quiet btn-icon size-11"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-[rgb(8_5_4/0.6)] backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col gap-5 overflow-y-auto border-r border-[var(--instrument-line)] bg-[var(--instrument)] bg-[image:radial-gradient(ellipse_120%_50%_at_0%_0%,rgb(var(--glow)/0.09),transparent_70%),var(--grain)] px-3 py-3 shadow-[var(--shadow-float)] md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%", transition: { duration: 0.16 } }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="flex items-center justify-between pl-1">
                <Wordmark />
                <button type="button" autoFocus onClick={() => setOpen(false)} className="btn btn-quiet btn-icon size-11" aria-label="Close menu">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <Links pathname={pathname} mode="full" onNavigate={() => setOpen(false)} />
              <div className="border-t border-[var(--instrument-line)] pt-3">{drawerStatus}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
