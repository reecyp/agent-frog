"use client";

import { Send } from "lucide-react";
import { addTask, setStatusAction } from "@/app/actions";
import { ActionButton } from "../ui/ActionButton";

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function MarkAppliedButton({ applicationId, company }: { applicationId: string; company: string }) {
  return (
    <ActionButton
      success="Marked applied. Follow-up reminder set for 7 days from now."
      action={async () => {
        const r = await setStatusAction(applicationId, "applied");
        if (!r.ok) return r;
        return addTask({ title: `Follow up on your ${company} application`, dueDate: inDays(7), kind: "follow_up", applicationId });
      }}
    >
      <Send className="size-4" aria-hidden /> I&apos;ve applied
    </ActionButton>
  );
}
