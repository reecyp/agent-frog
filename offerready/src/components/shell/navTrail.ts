"use client";

/**
 * The trail of pages the student has walked through, so a detail page's Back button returns to
 * where they actually came from (with its search, sort and page) rather than a fixed parent.
 * One entry per page (a change of query, like a review step, updates the entry instead of adding
 * one). Going to the page just before this one counts as going back and drops this one, so Back
 * goes up the way the student came down; any other move adds a step. Kept in sessionStorage so it
 * survives a reload.
 */
export interface TrailEntry {
  path: string;
  url: string;
}

const KEY = "af:trail";
const MAX = 20;
const EMPTY: TrailEntry[] = [];
let trail: TrailEntry[] | null = null;
const listeners = new Set<() => void>();

function load(): TrailEntry[] {
  if (trail) return trail;
  try {
    const raw = sessionStorage.getItem(KEY);
    trail = raw ? (JSON.parse(raw) as TrailEntry[]) : [];
  } catch {
    trail = [];
  }
  return trail;
}

export function visit(path: string, url: string) {
  const t = load();
  const entry = { path, url };
  const next =
    t.at(-1)?.path === path ? [...t.slice(0, -1), entry] // same page, new query
    : t.at(-2)?.path === path ? [...t.slice(0, -2), entry] // went back one page
    : [...t, entry].slice(-MAX);
  trail = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // The trail is a convenience; without storage it still works for this tab's session.
  }
  listeners.forEach((l) => l());
}

export function subscribeTrail(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export const trailSnapshot = () => load();
export const serverTrailSnapshot = () => EMPTY;

/** What a page is called after "Back to". */
export function pageLabel(url: string): string {
  const u = new URL(url, "http://x");
  const p = u.pathname;
  if (p === "/discover") return u.searchParams.has("search") ? "search results" : "jobs";
  if (p === "/jobs/compare") return "the comparison";
  if (p.startsWith("/jobs/")) return "the job";
  if (p === "/applications") return "applications";
  if (p === "/follow-ups") return "follow-ups";
  if (p === "/interview") return "interview practice";
  if (p.startsWith("/interview/")) return "practice";
  if (p === "/network") return u.searchParams.has("q") ? "alumni search" : "network";
  if (p.startsWith("/network/")) return "the alum";
  if (p === "/studio") return "home";
  if (p.startsWith("/profile")) return "your profile";
  if (p === "/ai-log") return "the AI log";
  if (p === "/settings") return "settings";
  return "the previous page";
}
