"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { PRIMARY, SECONDARY, type NavItem } from "./Nav";
import { Wordmark } from "./Wordmark";

function isActive(pathname: string, item: NavItem) {
  return [item.href, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * The studio's chrome: a quiet top bar over the room, and a drawer (native <dialog>: focus trap,
 * Escape and an inert page for free) listing the same destinations as the workspace sidebar.
 * The studio boxes are the page's main navigation; this is the way to everything else.
 */
export function StudioChrome({ status }: { status: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes (adjusting state during render, per React docs).
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 bg-[rgb(21_16_13/0.72)] px-3 backdrop-blur-md sm:px-5">
        <button
          ref={trigger}
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-11 place-items-center rounded-sm text-[var(--ink-2)] transition-colors hover:bg-white/5 hover:text-[var(--ink)]"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="nav-drawer"
        >
          <Menu className="size-5" strokeWidth={1.5} aria-hidden />
        </button>
        <Wordmark />
      </header>

      <dialog
        id="nav-drawer"
        ref={ref}
        className="drawer"
        aria-label="Navigation"
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        // A click on the backdrop lands on the <dialog> itself; clicks inside land on its children.
        onClick={(e) => e.target === ref.current && setOpen(false)}
      >
        <div className="stitched flex h-full flex-col gap-8 overflow-y-auto px-5 pb-6 pt-4">
          <div className="flex items-center justify-between">
            <Wordmark />
            <button type="button" autoFocus onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-sm text-[var(--ink-2)] hover:bg-white/5 hover:text-[var(--ink)]" aria-label="Close navigation">
              <X className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <nav aria-label="Main" className="flex flex-col gap-7">
            <ul className="flex flex-col">
              {PRIMARY.map((item) => (
                <DrawerLink key={item.href} item={item} active={isActive(pathname, item)} onNavigate={() => setOpen(false)} big />
              ))}
            </ul>
            <div>
              <p className="engraved px-3 pb-1">Also in the studio</p>
              <ul className="flex flex-col">
                {SECONDARY.map((item) => (
                  <DrawerLink key={item.href} item={item} active={isActive(pathname, item)} onNavigate={() => setOpen(false)} />
                ))}
              </ul>
            </div>
          </nav>
          <div className="mt-auto">{status}</div>
        </div>
      </dialog>
    </>
  );
}

function DrawerLink({ item, active, onNavigate, big = false }: { item: NavItem; active: boolean; onNavigate: () => void; big?: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-11 items-center rounded-sm px-3 transition-colors ${
          big ? "font-[family-name:var(--font-display)] text-[1.2rem]" : "text-[0.875rem]"
        } ${active ? "bg-[var(--frog-soft)] text-[var(--ink)] shadow-[inset_2px_0_0_var(--frog-text)]" : "text-[var(--on-instrument-2)] hover:bg-white/[0.04] hover:text-[var(--ink)]"}`}
      >
        {item.label}
      </Link>
    </li>
  );
}
