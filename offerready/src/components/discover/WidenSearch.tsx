"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import type { SearchFilters } from "@/domain/types";
import { streamSearch } from "./streamSearch";
import { useToast } from "../ui/Toast";

/** Re-runs the same search without location limits, at the student's request. */
export function WidenSearch({ query, filters, interpretedBy, count }: { query: string; filters: SearchFilters; interpretedBy: "claude" | "rules"; count: number }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn btn-secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { searchId } = await streamSearch({ query: `${query} (any location)`, filters: { ...filters, locations: [], arrangements: [] }, interpretedBy }, (e) => {
              if (e.type === "stage") setStatus(e.message);
            });
            router.push(`/discover?search=${searchId}`, { scroll: false });
            router.refresh();
          } catch (e) {
            toast((e as Error).message, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <MapPin className="size-4" aria-hidden />}
        Show the {count} outside your locations
      </button>
      {busy && <span className="t-meta" role="status">{status}</span>}
    </div>
  );
}
