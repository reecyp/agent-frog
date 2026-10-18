import { connection } from "next/server";
import Link from "next/link";
import { aiConfigured, CLAUDE_MODEL } from "@/server/ai/claude";
import { dbInfo } from "@/server/db";
import { activeStudentId, getStudent } from "@/server/profile";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

function Dot({ ok }: { ok: boolean }) {
  return <span aria-hidden className={`inline-block size-1.5 shrink-0 rounded-full ${ok ? "bg-[var(--ok)]" : "bg-[#d8b45c]"}`} />;
}

/**
 * The account block at the bottom of the navigation: student name + what is actually connected.
 * Nothing here claims an integration that isn't configured.
 * - `variant="full"` (drawer): always the full block.
 * - `variant="responsive"` (sidebar): an initials avatar on the 72px rail, the full block at xl.
 */
export async function StatusPanel({ variant = "full" }: { variant?: "full" | "responsive" }) {
  await connection();
  const studentId = await activeStudentId();
  const student = await getStudent(studentId);
  const ai = aiConfigured();
  const db = dbInfo();
  const neon = db.driver === "neon";
  const aiText = ai ? `Drafting with ${CLAUDE_MODEL}` : "Rule-based drafting (no AI key)";
  const dbText = neon ? "Saved to Neon Postgres" : "Saved on this computer only";
  const allOk = ai && neon;

  const full = (
    <Link
      href="/settings"
      className={`flex items-center gap-2.5 rounded-[var(--r-control)] px-2 py-2 hover:bg-white/[0.04] ${variant === "responsive" ? "hidden xl:expanded:flex" : ""}`}
    >
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--frog-soft)] text-[0.75rem] font-semibold text-[var(--frog-text)]">
        {initials(student.fullName)}
      </span>
      <span className="min-w-0 flex-1 text-[0.75rem] leading-snug text-[var(--on-instrument-2)]">
        <span className="block truncate text-[0.8125rem] font-semibold text-[var(--ink)]">{student.fullName}</span>
        <span className="flex items-center gap-1.5"><Dot ok={ai} /><span className="truncate">{aiText}</span></span>
        <span className="flex items-center gap-1.5"><Dot ok={neon} /><span className="truncate">{dbText}</span></span>
      </span>
    </Link>
  );
  if (variant === "full") return full;

  const label = `${student.fullName}. ${aiText}. ${dbText}.`;
  return (
    <>
      <Link
        href="/settings"
        aria-label={label}
        className="group relative mx-auto grid size-10 place-items-center rounded-full bg-[var(--frog-soft)] text-[0.75rem] font-semibold text-[var(--frog-text)] xl:expanded:hidden"
      >
        <span aria-hidden>{initials(student.fullName)}</span>
        <span aria-hidden className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--instrument)] ${allOk ? "bg-[var(--ok)]" : "bg-[#d8b45c]"}`} />
        <span aria-hidden className="pointer-events-none absolute bottom-0 left-full z-50 ml-3 hidden w-max max-w-[16rem] rounded-[var(--r-control)] bg-[var(--instrument-2)] px-2.5 py-1.5 text-left text-[0.75rem] font-normal leading-snug text-[var(--ink)] shadow-[var(--shadow-pop)] group-hover:block group-focus-visible:block">
          <span className="block font-semibold">{student.fullName}</span>
          <span className="block">{aiText}</span>
          <span className="block">{dbText}</span>
        </span>
      </Link>
      {full}
    </>
  );
}
