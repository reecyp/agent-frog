"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { pageLabel, serverTrailSnapshot, subscribeTrail, trailSnapshot, visit } from "./navTrail";

/** Records every page visit on the trail. Rendered once, near the root. */
export function NavMemory() {
  return (
    <Suspense fallback={null}>
      <Recorder />
    </Suspense>
  );
}

function Recorder() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    visit(pathname, search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);
  return null;
}

/**
 * A detail page's way out: back to the page the student came from (search results keep their
 * search, sort and page), or to `fallback` when the page was opened directly.
 */
export function BackLink({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  const pathname = usePathname();
  const trail = useSyncExternalStore(subscribeTrail, trailSnapshot, serverTrailSnapshot);
  const here = trail.at(-1);
  const prev = here?.path === pathname ? trail.at(-2) : trail.findLast((e) => e.path !== pathname);
  const href = prev?.url ?? fallbackHref;
  const label = prev ? pageLabel(prev.url) : fallbackLabel;
  return (
    <nav aria-label="Back" className="mb-4">
      <Link href={href} className="btn btn-quiet btn-sm -ml-2.5 gap-1 text-[var(--ink-2)]">
        <ChevronLeft className="size-4" aria-hidden /> Back to {label}
      </Link>
    </nav>
  );
}
