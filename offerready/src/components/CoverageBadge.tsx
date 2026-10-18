import { CheckCircle2, CircleHelp, CircleMinus, CircleDot } from "lucide-react";
import type { Coverage } from "@/domain/types";

const MAP: Record<Coverage, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  supported: { label: "Backed by your evidence", cls: "badge-ok", Icon: CheckCircle2 },
  partial: { label: "Partly backed", cls: "badge-caution", Icon: CircleDot },
  needs_clarification: { label: "Not clear from your profile", cls: "badge-neutral", Icon: CircleHelp },
  not_supported: { label: "Not in your profile", cls: "badge-neutral", Icon: CircleMinus },
};

export function CoverageBadge({ coverage }: { coverage: Coverage }) {
  const { label, cls, Icon } = MAP[coverage];
  return (
    <span className={`badge ${cls}`}>
      <Icon className="size-3.5" aria-hidden /> {label}
    </span>
  );
}
