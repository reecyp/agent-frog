"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { Check, Loader2, Search, Sparkles, X } from "lucide-react";
import type { Arrangement, JobLevel, SearchFilters } from "@/domain/types";
import { fadeRise } from "../motion";
import { streamSearch } from "./streamSearch";
import { useToast } from "../ui/Toast";

type Interpreted = { filters: SearchFilters; interpretedBy: "claude" | "rules"; clarification: string; aiError?: string };
type LogLine = { id: number; text: string; state: "active" | "done" | "error" };

const EXAMPLE = "Finance internships at technology companies in Dallas or remote for next summer. I'm interested in valuation and FP&A.";

function ChipList({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <fieldset className="min-w-0">
      <legend className="t-label mb-2">{label}</legend>
      <ul className="flex flex-wrap gap-1.5">
        <AnimatePresence initial={false}>
          {values.map((v) => (
            <motion.li key={v} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }} className="chip">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
                <X className="size-3.5" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        <li className="flex items-center">
          <label className="sr-only" htmlFor={`add-${label}`}>Add to {label}</label>
          <input
            id={`add-${label}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder={placeholder}
            className="h-8 w-40 rounded-full bg-transparent px-3 text-[0.8125rem] outline-none border border-dashed border-[var(--line-strong)] placeholder:text-[var(--ink-3)] focus:border-solid focus:border-[var(--accent)]"
          />
        </li>
      </ul>
    </fieldset>
  );
}

function Toggles<T extends string>({ label, options, values, onChange }: { label: string; options: { value: T; label: string }[]; values: T[]; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className="t-label mb-2">{label}</legend>
      <div className="segmented flex-wrap" role="group" aria-label={label}>
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}>
              {on && <motion.span layoutId={`thumb-${label}-${o.value}`} className="thumb" transition={{ duration: 0.15 }} />}
              <span className="relative inline-flex items-center gap-1">
                {on && <Check className="size-3" aria-hidden />}
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SearchPanel({ boardCount }: { boardCount: number }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [interp, setInterp] = useState<Interpreted | null>(null);
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);

  const interpret = async () => {
    setError(null);
    if (query.trim().length < 3) {
      setError("Describe the kind of role you want, for example a function, a place, and internship or full-time.");
      return;
    }
    setInterpreting(true);
    try {
      const res = await fetch("/api/search/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't read that request.");
      setInterp(body);
      setFilters(body.filters);
      if (body.aiError) toast(`Claude couldn't interpret this (${body.aiError}). Used keyword rules instead.`, "info");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInterpreting(false);
    }
  };

  const push = (text: string, state: LogLine["state"] = "active") =>
    setLog((l) => [...l.map((x) => (x.state === "active" ? { ...x, state: "done" as const } : x)), { id: ++counter.current, text, state }]);

  const search = async () => {
    if (!filters || !interp) return;
    setError(null);
    setRunning(true);
    setLog([]);
    try {
      const { searchId, stats } = await streamSearch({ query, filters, interpretedBy: interp.interpretedBy }, (e) => {
        if (e.type === "stage") push(e.message);
        if (e.type === "source") {
          const s = e.stat;
          push(`${s.source}: ${s.boardsQueried} ${s.boardsQueried === 1 ? "query" : "boards"}, ${s.postingsScanned.toLocaleString()} postings${s.errors.length ? `, ${s.errors.length} failed` : ""}`, "done");
        }
      });
      push(`${stats.returned} ${stats.returned === 1 ? "match" : "matches"} ready`, "done");
      router.push(`/discover?search=${searchId}`, { scroll: false });
      router.refresh();
    } catch (e) {
      push((e as Error).message, "error");
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) => setFilters((f) => (f ? { ...f, [k]: v } : f));

  return (
    <section aria-label="Search">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          interpret();
        }}
        className="searchbar items-end"
      >
        <Search className="ml-3 mt-[0.8rem] size-[1.125rem] shrink-0 self-start text-[var(--ink-3)] max-[30rem]:hidden" aria-hidden />
        <label htmlFor="q" className="sr-only">What are you looking for?</label>
        <textarea
          id="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter reads the request, like any search box; Shift+Enter adds a line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              interpret();
            }
          }}
          placeholder="Describe the role you want: what, where, internship or full-time…"
          rows={1}
          className="searchbar-field max-h-40 min-h-[2.75rem] flex-1 py-[0.6rem] pl-2 [field-sizing:content] max-[30rem]:pl-3"
          aria-describedby="q-help"
          aria-invalid={!!error && !interp}
        />
        <button type="submit" disabled={interpreting || running} className={`btn shrink-0 ${interp ? "btn-secondary" : "btn-primary"}`}>
          {interpreting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {interpreting ? "Reading" : interp ? "Update filters" : "Set filters"}
        </button>
      </form>
      <p id="q-help" className="t-meta mt-3 px-1">
        Plain language works. You&apos;ll see the filters before anything is searched.{" "}
        <button type="button" className="font-semibold text-[var(--ink-2)] underline decoration-white/15 underline-offset-[3px] hover:text-[var(--accent)] hover:decoration-[var(--accent)]" onClick={() => setQuery(EXAMPLE)}>
          Use an example
        </button>
      </p>

      <AnimatePresence>
        {filters && interp && (
          <motion.div {...fadeRise} className="panel mt-5 rounded-[1rem] p-5 @xl:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[0.9375rem] font-semibold">Filters</h2>
              <p className="t-meta">{interp.interpretedBy === "claude" ? "Interpreted by Claude. Edit anything." : "Interpreted with keyword rules (no AI key). Edit anything."}</p>
            </div>
            {interp.clarification && <p className="mb-4 rounded-[var(--r-control)] bg-[var(--caution-soft)] px-3 py-2 text-[0.875rem] text-[var(--caution)]">{interp.clarification}</p>}
            <div className="grid gap-5 @3xl:grid-cols-2">
              <ChipList label="Job titles" values={filters.titles} onChange={(v) => set("titles", v)} placeholder="Add a title" />
              <ChipList label="Keywords" values={filters.keywords} onChange={(v) => set("keywords", v)} placeholder="Add a keyword" />
              <ChipList label="Locations" values={filters.locations} onChange={(v) => set("locations", v)} placeholder="City, state, or Remote" />
              <div className="flex min-w-0 flex-wrap gap-5">
                <Toggles<JobLevel> label="Job type" options={[{ value: "internship", label: "Internship" }, { value: "full_time", label: "Full-time" }]} values={filters.jobTypes} onChange={(v) => set("jobTypes", v)} />
                <Toggles<Arrangement> label="Work arrangement" options={[{ value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }, { value: "onsite", label: "On-site" }]} values={filters.arrangements} onChange={(v) => set("arrangements", v)} />
              </div>
              <div className="field max-w-xs">
                <label htmlFor="posted" className="t-label">Posted within</label>
                <select id="posted" className="input" value={filters.postedWithinDays ?? ""} onChange={(e) => set("postedWithinDays", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Any time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <button type="button" onClick={search} disabled={running} className="btn btn-primary">
                {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
                {running ? "Searching" : `Search ${boardCount} job boards`}
              </button>
              <p className="t-meta">Takes about 10–30 seconds. Every result links to the employer&apos;s own posting.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && !running && (
        <p role="alert" className="mt-4 text-[0.875rem] font-medium text-[var(--danger)]">{error}</p>
      )}

      <AnimatePresence>
        {log.length > 0 && (
          <motion.ol {...fadeRise} aria-live="polite" className="subtle mt-4 flex flex-col gap-1.5 rounded-[1rem] px-4 py-3 text-[0.8125rem]">
            {log.map((l) => (
              <li key={l.id} className="flex items-start gap-2.5">
                {l.state === "active" ? (
                  <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-[var(--accent)]" aria-hidden />
                ) : l.state === "error" ? (
                  <X className="mt-0.5 size-3.5 shrink-0 text-[var(--danger)]" aria-hidden />
                ) : (
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--ok)]" aria-hidden />
                )}
                <span className={`min-w-0 break-words ${l.state === "error" ? "text-[var(--danger)]" : l.state === "active" ? "font-medium text-[var(--ink)]" : "text-[var(--ink-2)]"}`}>{l.text}</span>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </section>
  );
}
