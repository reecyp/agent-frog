"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Modal built on <dialog>.showModal(): the browser handles focus trapping, Escape and the inert
 * background. The opening animation is CSS so it also respects reduced motion.
 */
export function Dialog({ open, onClose, title, description, children, wide = false }: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={`floating m-auto w-[calc(100%-2rem)] border-0 p-0 text-[var(--ink)] backdrop:bg-[rgb(8_5_4/0.6)] open:animate-[dialog-in_180ms_cubic-bezier(0.2,0.8,0.2,1)] ${wide ? "max-w-3xl" : "max-w-xl"}`}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
            <div className="min-w-0">
              <h2 id="dialog-title" className="t-section">{title}</h2>
              {description && <p className="mt-1 text-[0.875rem] text-[var(--ink-2)]">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="btn btn-quiet btn-icon -mr-2 -mt-1" aria-label="Close">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        </div>
      )}
      <style>{`@keyframes dialog-in{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}`}</style>
    </dialog>
  );
}
