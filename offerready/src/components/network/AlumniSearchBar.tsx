"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { alumniHref } from "./alumniHref";

const EXAMPLES = ["Audit or consulting at Big 4", "Marketing", "Financial analysts at American Airlines"];

/** One plain-language search: roles, employers or both. Claude sorts out which is which on the server. */
export function AlumniSearchBar({ query: initial }: { query: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (q: string) => {
    if (q.trim().length < 2) {
      setError("Type a role, an employer, or both.");
      return;
    }
    setError(null);
    start(() => router.push(alumniHref(q.trim()), { scroll: false }));
  };

  return (
    <div>
      <form
        role="search"
        aria-label="Find alumni"
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="searchbar searchbar-dotted"
      >
        <Search className="ml-3 size-[1.125rem] shrink-0 text-[var(--ink-3)]" aria-hidden />
        <label htmlFor="alq" className="sr-only">Search alumni by role or employer</label>
        <input
          id="alq"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by role, employer, or both"
          autoComplete="off"
          aria-invalid={!!error}
          className="searchbar-field h-11 min-w-0 flex-1 px-1 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--ink-3)] hover:bg-white/[0.06] hover:text-[var(--ink)]">
            <X className="size-4" aria-hidden />
          </button>
        )}
        <button type="submit" className="btn btn-primary shrink-0 px-5" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {pending ? "Searching" : "Search"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 text-[0.8125rem] text-[var(--ink-3)]">
        {error ? (
          <p role="alert" className="font-medium text-[var(--danger)]">{error}</p>
        ) : (
          <>
            <span>Try:</span>
            {EXAMPLES.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => {
                  setQuery(x);
                  run(x);
                }}
                className="rounded-sm text-[var(--ink-2)] underline decoration-white/15 underline-offset-[3px] hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
              >
                {x}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
