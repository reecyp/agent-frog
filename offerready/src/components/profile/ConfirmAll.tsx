"use client";

import { confirmAllExtracted } from "@/app/(app)/profile/actions";
import { ActionButton } from "../ui/ActionButton";

export function ConfirmAllButton({ count }: { count: number }) {
  return (
    <ActionButton action={confirmAllExtracted} className="btn btn-secondary btn-sm" success={`Confirmed ${count} items as accurate.`}>
      I&apos;ve checked them all, confirm
    </ActionButton>
  );
}
