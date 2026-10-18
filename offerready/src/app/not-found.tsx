import Link from "next/link";

export default function NotFound() {
  return (
    <div className="measure mx-auto px-6 py-16">
      <h1 className="t-title">That page doesn&apos;t exist</h1>
      <p className="mt-3 text-[var(--ink-2)]">It may belong to a profile that was reset, or the link may be out of date.</p>
      <Link href="/studio" className="btn btn-primary mt-6">Go to your studio</Link>
    </div>
  );
}
