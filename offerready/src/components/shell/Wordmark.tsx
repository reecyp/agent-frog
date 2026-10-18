import Link from "next/link";

/** The rail's stand-in for the wordmark: a purple tab with the Caslon initials. */
function Mark() {
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[var(--r-control)] bg-[var(--frog)] bg-[linear-gradient(180deg,rgb(255_255_255/0.08),transparent_60%)] font-[family-name:var(--font-display)] text-[0.8125rem] tracking-[0.06em] text-[var(--on-frog)] shadow-[var(--shadow-raised)]">
      AF
    </span>
  );
}

/**
 * The AGENT FROG wordmark, set in spaced Caslon capitals. `collapse` swaps it for the initials
 * mark below the full-sidebar breakpoint (xl) so it fits the 72px rail; `href={null}` renders it
 * without a link (onboarding).
 */
export function Wordmark({ href = "/studio", collapse = false, size = "sm" }: { href?: string | null; collapse?: boolean; size?: "sm" | "md" }) {
  const name = <span className={`wordmark whitespace-nowrap text-[var(--ink)] ${size === "md" ? "text-[1.05rem]" : "text-[0.9rem]"}`}>AGENT FROG</span>;
  const body = collapse ? (
    <>
      <span className="xl:expanded:hidden"><Mark /></span>
      <span className="hidden xl:expanded:inline">{name}</span>
    </>
  ) : (
    name
  );
  if (href === null) return <span className="inline-flex min-h-11 items-center px-1">{body}</span>;
  return (
    <Link href={href} aria-label={collapse ? "AGENT FROG home" : undefined} className="inline-flex min-h-11 items-center rounded-sm px-1">
      {body}
    </Link>
  );
}
