"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="measure py-10" role="alert">
      <h1 className="t-title">This page couldn&apos;t load</h1>
      <p className="mt-3 text-[var(--ink-2)]">
        {error.message.includes("fetch") || error.message.includes("ECONN")
          ? "A connection failed. Check that the database is reachable, then try again."
          : "Something failed while loading this page. Your saved work isn't affected."}
      </p>
      {error.digest && <p className="t-meta mt-2">Reference: {error.digest}</p>}
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>Try again</button>
    </div>
  );
}
