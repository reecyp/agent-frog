import { CircleCheck, CircleDashed, FileSearch } from "lucide-react";
import type { EvidenceStatus } from "@/domain/types";

/** Confirmed is the normal state, so it's only announced to screen readers unless `showConfirmed` is set. */
export function EvidenceBadge({ status, showConfirmed = false }: { status: EvidenceStatus; showConfirmed?: boolean }) {
  if (status === "confirmed") return showConfirmed ? <span className="badge badge-ok"><CircleCheck className="size-3.5" aria-hidden /> Confirmed</span> : <span className="sr-only">Confirmed</span>;
  if (status === "extracted") return <span className="badge badge-caution"><FileSearch className="size-3.5" aria-hidden /> From upload, confirm it</span>;
  return <span className="badge badge-neutral"><CircleDashed className="size-3.5" aria-hidden /> Not used</span>;
}
