"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, BookmarkCheck, ExternalLink, EyeOff, GraduationCap, Undo2 } from "lucide-react";
import type { Arrangement, JobLevel, StrongestMatch } from "@/domain/types";
import { relativeDays } from "@/domain/jobs";
import { setJobState } from "@/app/actions";
import { formatDate } from "../ui";
import { useToast } from "../ui/Toast";
import { toggleCompare, useCompare } from "./compareStore";

export interface JobCardData {
  id: string;
  title: string;
  company: string;
  location: string;
  arrangement: Arrangement;
  level: JobLevel;
  url: string;
  sourceLabel: string;
  source: string;
  postedAt: string | null;
  deadline: string;
  compensation: string;
  keywords: string[];
  strongest: StrongestMatch | null;
  state: "new" | "saved" | "dismissed";
  alumni: number;
}

const ARRANGEMENT: Record<Arrangement, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", unknown: "Arrangement not stated" };
const LEVEL: Record<JobLevel, string> = { internship: "Internship", full_time: "Full-time", unknown: "Level not stated" };

/**
 * One job in the Discover results list. Rendered inside an `@container` list item: actions sit in a
 * right-hand column when the row is at least 48rem wide, and in a wrapping row below the content otherwise.
 */
export function JobCard({ job }: { job: JobCardData }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const compare = useCompare();
  const comparing = compare.includes(job.id);
  const dismissed = job.state === "dismissed";
  const postingLabel =
    job.source === "adzuna" ? "Read the full posting" : `Original posting on ${job.source === "manual" ? "its site" : job.sourceLabel.split(" via ")[1] ?? "its board"}`;

  const setState = (state: "saved" | "dismissed" | "new", message: string) =>
    start(async () => {
      const r = await setJobState(job.id, state);
      toast(r.ok ? message : r.error, r.ok ? "ok" : "error");
    });

  return (
    <motion.article
      layout="position"
      className={`flex flex-col gap-4 px-4 py-4 @xl:px-5 @3xl:flex-row @3xl:gap-8 @3xl:py-5 ${dismissed ? "opacity-60" : ""}`}
      aria-labelledby={`job-${job.id}`}
    >
      <div className="min-w-0 flex-1">
        <h3 id={`job-${job.id}`} className="t-card text-pretty break-words">
          <Link href={`/jobs/${job.id}`} className="decoration-[var(--line-strong)] underline-offset-4 hover:text-[var(--accent)] hover:underline">
            {job.title}
          </Link>
        </h3>
        <p className="mt-0.5 text-[0.875rem] break-words text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--ink)]">{job.company}</span>
          <span aria-hidden>, </span>
          {job.location || "location not stated"}
        </p>
        <dl className="t-meta mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          <div><dt className="sr-only">Arrangement</dt><dd>{ARRANGEMENT[job.arrangement]}</dd></div>
          <div><dt className="sr-only">Level</dt><dd>{LEVEL[job.level]}</dd></div>
          <div><dt className="sr-only">Posted</dt><dd>Posted {relativeDays(job.postedAt)}</dd></div>
          {job.deadline && <div><dt className="sr-only">Deadline</dt><dd>Apply by {formatDate(job.deadline)}</dd></div>}
          {job.compensation && <div><dt className="sr-only">Pay</dt><dd>{job.compensation}</dd></div>}
        </dl>

        {(job.alumni > 0 || job.keywords.length > 0) && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Top qualifications in the posting">
            {job.alumni > 0 && (
              <li>
                <Link href={`/jobs/${job.id}#alumni`} className="badge badge-accent hover:underline">
                  <GraduationCap className="size-3.5" aria-hidden /> {job.alumni} TCU {job.alumni === 1 ? "alum" : "alumni"} here
                </Link>
              </li>
            )}
            {job.keywords.map((k) => (
              <li key={k} className="rounded-[6px] bg-[var(--bg-muted)] px-2 py-0.5 text-[0.75rem] font-medium leading-[1.4] text-[var(--ink-2)]">{k}</li>
            ))}
          </ul>
        )}

        <div className="mt-3 text-[0.875rem]">
          {job.strongest ? (
            <div className="rounded-[var(--r-control)] bg-[var(--bg-subtle)] px-3 py-2.5">
              <p className="t-label">Strongest match{job.strongest.strength === "weak" ? " (weak)" : ""}</p>
              <p className="mt-1 break-words">
                <span className="text-[var(--ink-3)]">Posting asks: </span>
                <q className="italic">{job.strongest.requirementQuote}</q>
              </p>
              <p className="mt-0.5 break-words">
                <span className="text-[var(--ink-3)]">You have: </span>
                {job.strongest.evidenceText}
              </p>
              {job.strongest.strength === "weak" && <p className="t-meta mt-1">The overlap is thin. Read the posting before you invest time in it.</p>}
            </div>
          ) : (
            <p className="text-[var(--ink-3)]">
              <span className="font-semibold text-[var(--ink-2)]">Strongest match: </span>
              no clear connection to your profile yet.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 @3xl:w-52 @3xl:shrink-0 @3xl:content-start">
        <Link href={`/jobs/${job.id}`} className="btn btn-primary btn-sm @3xl:w-full">Open job</Link>
        {job.state === "saved" ? (
          <button type="button" className="btn btn-quiet btn-sm text-[var(--accent)]" disabled={pending} onClick={() => setState("new", "Removed from saved jobs")}>
            <BookmarkCheck className="size-4" aria-hidden /> Saved
          </button>
        ) : (
          <button type="button" className="btn btn-quiet btn-sm" disabled={pending || dismissed} onClick={() => setState("saved", `Saved ${job.title}`)}>
            <Bookmark className="size-4" aria-hidden /> Save
          </button>
        )}
        {dismissed ? (
          <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => setState("new", "Restored")}>
            <Undo2 className="size-4" aria-hidden /> Restore
          </button>
        ) : (
          <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => setState("dismissed", "Dismissed. It's hidden from these results.")}>
            <EyeOff className="size-4" aria-hidden /> Dismiss
          </button>
        )}
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--r-control)] px-2.5 text-[0.8125rem] font-semibold text-[var(--ink-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]">
          <input
            type="checkbox"
            checked={comparing}
            onChange={() => {
              if (!toggleCompare(job.id)) toast("You can compare up to three jobs at once.", "info");
            }}
            className="size-4 accent-[var(--accent)]"
          />
          Compare
        </label>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          title={postingLabel}
          aria-label={`${postingLabel} (opens in a new tab)`}
          className="btn btn-quiet btn-sm btn-icon ml-auto"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>
      <AnimatePresence>{pending && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sr-only" role="status">Updating</motion.span>}</AnimatePresence>
    </motion.article>
  );
}
