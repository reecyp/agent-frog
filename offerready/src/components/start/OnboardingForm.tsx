"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, FileText, Info, Loader2, Upload, X } from "lucide-react";
import { uploadResume, type UploadResult } from "@/app/(start)/start/actions";
import type { ActionResult } from "@/app/actions";
import { fadeRise } from "../motion";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = [".pdf", ".docx", ".txt"];

function FileDrop({ name, label, hint, onChange }: { name: string; label: string; hint: string; onChange: (has: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  function take(files: FileList | null) {
    const f = files?.[0] ?? null;
    if (f && !ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext))) return reject(`${f.name} isn't a PDF, DOCX or TXT file.`);
    if (f && f.size > MAX_BYTES) return reject(`${f.name} is over 5 MB.`);
    setError(null);
    setFile(f);
    onChange(!!f);
  }
  function reject(message: string) {
    if (input.current) input.current.value = "";
    setFile(null);
    setError(message);
    onChange(false);
  }
  function remove() {
    if (input.current) input.current.value = "";
    setFile(null);
    setError(null);
    onChange(false);
  }

  return (
    <div className="grid gap-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (input.current && e.dataTransfer.files.length) input.current.files = e.dataTransfer.files;
          take(e.dataTransfer.files);
        }}
        className={`flex min-h-36 cursor-pointer flex-col justify-center gap-2 rounded-[var(--r-panel)] border border-dashed p-5 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--frog-text)] ${
          over ? "border-[var(--frog-text)] bg-[var(--frog-soft)]" : file ? "border-[var(--paper-edge)] bg-[var(--paper)]" : "border-[#4a3d34] bg-black/20 hover:border-[#64544a] hover:bg-black/25"
        }`}
      >
        <span className="flex items-center gap-2 font-semibold">
          {file ? <FileText className="size-4 text-[var(--frog-text)]" strokeWidth={1.5} aria-hidden /> : <Upload className="size-4 text-[var(--ink-2)]" strokeWidth={1.5} aria-hidden />}
          {label}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={file?.name ?? "empty"} {...fadeRise} className={`text-[0.875rem] ${file ? "text-[var(--ink)]" : "text-[var(--ink-3)]"}`}>
            {file ? `${file.name}, ${(file.size / 1024).toFixed(0)} KB` : over ? "Drop to add it" : hint}
          </motion.span>
        </AnimatePresence>
        {file && <span className="text-[0.8125rem] text-[var(--ink-3)]">Choose again to replace it.</span>}
        <input ref={input} name={name} type="file" accept=".pdf,.docx,.txt,application/pdf" className="sr-only" onChange={(e) => take(e.target.files)} />
      </label>
      {file && (
        <button type="button" onClick={remove} className="btn btn-quiet btn-sm justify-self-start">
          <X className="size-3.5" aria-hidden /> Remove {label.toLowerCase().replace(" (optional)", "")}
        </button>
      )}
      {error && <p role="alert" className="text-[0.8125rem] font-medium text-[var(--danger)]">{error}</p>}
    </div>
  );
}

/** One question per step, after the materials. The resume-specific follow-up questions come next, on /start/questions. */
const QUESTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  { id: "roles", title: "Which roles are you looking for?", body: <input id="q-roles" name="roles" className="input" placeholder="Marketing intern, brand analyst" aria-labelledby="h-roles" /> },
  { id: "loc", title: "Where would you like to work?", body: <input id="q-loc" name="locations" className="input" placeholder="Dallas, TX, Remote" aria-labelledby="h-loc" /> },
  {
    id: "type",
    title: "What type of job?",
    body: (
      <fieldset aria-labelledby="h-type" className="grid gap-2">
        {[["internship", "Internship"], ["full_time", "Full-time"]].map(([v, l]) => (
          <label key={v} className="flex min-h-11 items-center gap-3 rounded-[var(--r-control)] px-3 hover:bg-white/[0.04]"><input type="checkbox" name="jobTypes" value={v} className="size-4 accent-[var(--frog)]" /> {l}</label>
        ))}
      </fieldset>
    ),
  },
  {
    id: "arr",
    title: "What work arrangement suits you?",
    body: (
      <fieldset aria-labelledby="h-arr" className="grid gap-2">
        {[["remote", "Remote"], ["hybrid", "Hybrid"], ["onsite", "On-site"]].map(([v, l]) => (
          <label key={v} className="flex min-h-11 items-center gap-3 rounded-[var(--r-control)] px-3 hover:bg-white/[0.04]"><input type="checkbox" name="arrangements" value={v} className="size-4 accent-[var(--frog)]" /> {l}</label>
        ))}
      </fieldset>
    ),
  },
  { id: "tf", title: "When do you want to start?", body: <input id="q-tf" name="timeframe" className="input" placeholder="Summer 2027" aria-labelledby="h-tf" /> },
  {
    id: "ws",
    title: "How would a teammate describe you?",
    body: (
      <select id="q-ws" name="workStyle" className="input" defaultValue="" aria-labelledby="h-ws">
        <option value="">Skip this one</option>
        <option>A leader: I organize people and keep things moving</option>
        <option>A builder: I like making things that work</option>
        <option>An analyst: I turn messy information into a clear answer</option>
        <option>A connector: I bring people and ideas together</option>
      </select>
    ),
  },
  {
    id: "extra",
    title: "Anything not on your resume you'd want considered?",
    body: (
      <div className="grid gap-2">
        <textarea id="q-extra" name="extra" rows={4} className="input" placeholder="Clubs, projects, part-time jobs, volunteering" aria-labelledby="h-extra" />
        <p className="t-meta">Optional. Saved as your own note; add it as an experience on your profile when you&apos;re ready.</p>
      </div>
    ),
  },
];

const TOTAL = QUESTIONS.length + 1;

/** The fitting room's first stage: materials, then a few quick questions about what the student wants. */
export function OnboardingForm({ replacing }: { replacing: boolean }) {
  const [state, action, pending] = useActionState<ActionResult<UploadResult> | null, FormData>(uploadResume, null);
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState({ resume: false, linkedin: false });
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const moved = useRef(false);

  // Move focus to the new step's heading so keyboard and screen-reader users land on the question.
  useEffect(() => {
    if (moved.current) headings.current[step]?.focus();
  }, [step]);
  // A server error almost always concerns the files, so return to them.
  const [errorFor, setErrorFor] = useState(state);
  if (errorFor !== state) {
    setErrorFor(state);
    if (state && !state.ok) setStep(0);
  }

  const go = (n: number) => {
    moved.current = true;
    setStep(n);
  };

  if (state?.ok && state.data) return <Result data={state.data} />;

  const hasFile = files.resume;
  const last = step === TOTAL - 1;

  return (
    <form
      action={action}
      className="mx-auto grid max-w-xl gap-8"
      onKeyDown={(e) => {
        // Enter in a field moves to the next question rather than posting a half-finished form.
        if (e.key === "Enter" && !last && e.target instanceof HTMLInputElement && e.target.type !== "file") {
          e.preventDefault();
          if (step > 0 || hasFile) go(step + 1);
        }
      }}
    >
      <Progress step={step} />

      {/* Step 0: materials */}
      <Step index={0} current={step}>
        <h1 ref={(el) => { headings.current[0] = el; }} tabIndex={-1} className="t-title outline-none">Bring your materials</h1>
        <p className="mt-3 text-[0.95rem] text-[var(--ink-2)]">Your resume, and if you like, your LinkedIn profile saved as a PDF. AGENT FROG builds your profile from them, then asks a few short questions so your applications can tell real stories. You&apos;ll check everything that was read before it&apos;s used.</p>
        <div className="mt-8 grid gap-4">
          <FileDrop name="resume" label="Resume" hint="Drag it here or browse. PDF, DOCX or TXT, up to 5 MB." onChange={(has) => setFiles((f) => ({ ...f, resume: has }))} />
          <FileDrop name="linkedin" label="LinkedIn profile (optional)" hint="The PDF from LinkedIn's Save to PDF." onChange={(has) => setFiles((f) => ({ ...f, linkedin: has }))} />
        </div>
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer font-semibold text-[var(--ink-2)]">How to get your LinkedIn PDF</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[var(--ink-2)]">
            <li>Open your own profile on LinkedIn.</li>
            <li>Select <span className="font-semibold">Resources</span> (or <span className="font-semibold">More</span>), then <span className="font-semibold">Save to PDF</span>.</li>
            <li>Upload the downloaded file here.</li>
          </ol>
          <p className="mt-2 text-[var(--ink-2)]">LinkedIn pages require a login and LinkedIn&apos;s terms prohibit automated reading, so profile links aren&apos;t fetched.</p>
        </details>
        {replacing && (
          <p className="mt-5 flex gap-2 text-[0.875rem] text-[var(--ink-2)]">
            <Info className="mt-0.5 size-4 shrink-0 text-[var(--ink-3)]" aria-hidden />
            Uploading replaces your current profile, including its applications and answers.
          </p>
        )}
        <AnimatePresence>{state && !state.ok && <motion.p {...fadeRise} role="alert" className="mt-4 text-sm font-medium text-[var(--danger)]">{state.error}</motion.p>}</AnimatePresence>
      </Step>

      {QUESTIONS.map((q, i) => (
        <Step key={q.id} index={i + 1} current={step}>
          <h1 id={`h-${q.id}`} ref={(el) => { headings.current[i + 1] = el; }} tabIndex={-1} className="t-title outline-none">{q.title}</h1>
          <div className="mt-8">{q.body}</div>
        </Step>
      ))}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--desk-line)] pt-6">
        {step > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => go(step - 1)} disabled={pending}>Back</button>
        ) : (
          <p className="t-meta">The original files are kept unchanged.</p>
        )}
        {/* Submit stays in the DOM (hidden until the last question) so the form has one submit button. */}
        <button type="submit" className={`btn btn-primary min-w-36 ${last ? "" : "hidden"}`} disabled={pending || !hasFile}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} {pending ? "Reading your documents…" : "Build my profile"}
        </button>
        {!last && (
          <button type="button" className="btn btn-primary min-w-36" onClick={() => go(step + 1)} disabled={step === 0 && !hasFile} aria-describedby={step === 0 && !hasFile ? "need-file" : undefined}>
            Next
          </button>
        )}
      </div>
      {step === 0 && !hasFile && <p id="need-file" className="t-meta -mt-5 text-right">Add your resume to continue.</p>}
    </form>
  );
}

/** Steps stay mounted so answers persist; hidden ones rest just off to the side they'll enter from. */
function Step({ index, current, children }: { index: number; current: number; children: React.ReactNode }) {
  const active = index === current;
  return (
    <motion.section
      hidden={!active}
      aria-hidden={!active}
      initial={false}
      animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: index < current ? -18 : 18 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="grid gap-2">
      <p className="t-meta t-num" aria-live="polite">
        {step === 0 ? "Materials" : `Question ${step} of ${TOTAL - 1}`}
      </p>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--desk-line)]">
            <motion.span className="block h-full origin-left bg-[var(--frog-text)]" initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
          </span>
        ))}
      </div>
    </div>
  );
}

function Result({ data: r }: { data: UploadResult }) {
  const lines = [["Resume", r.resume] as const, r.linkedin && (["LinkedIn", r.linkedin] as const)].filter(Boolean) as (readonly [string, UploadResult["resume"]])[];
  return (
    <motion.div {...fadeRise} className="mx-auto grid max-w-xl gap-6">
      <div>
        <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-[var(--ok)]"><CheckCircle2 className="size-4" aria-hidden /> Imported.</p>
        <h1 className="t-title mt-3">Here&apos;s what was read.</h1>
      </div>
      <p className="text-sm text-[var(--ink-2)]">Next, a few questions about your own experience. After that you&apos;ll check every item before anything is used.</p>
      <ul className="paper grid gap-3 p-5 text-sm">
        {lines.map(([label, x]) => (
          <li key={label}>
            <span className="font-semibold">{label}:</span> {x.experiences} {x.experiences === 1 ? "experience" : "experiences"} and {x.bullets} bullets, read {x.parsedWith === "claude" ? "by Claude" : "with rules (no AI key)"}.
            {x.notVerbatim > 0 && <span className="text-[var(--caution)]"> {x.notVerbatim} {x.notVerbatim === 1 ? "bullet didn't" : "bullets didn't"} match your file word for word, so {x.notVerbatim === 1 ? "it's" : "they're"} marked not used until you check.</span>}
            {x.aiError && <span className="text-[var(--caution)]"> Claude couldn&apos;t read it ({x.aiError}), so rules were used.</span>}
            {x.uncertain.length > 0 && <ul className="t-meta mt-1 list-disc pl-5">{x.uncertain.map((u, i) => <li key={i}>{u}</li>)}</ul>}
          </li>
        ))}
      </ul>
      <div>
        <Link href="/start/questions" className="btn btn-primary">Continue to your questions</Link>
      </div>
    </motion.div>
  );
}
