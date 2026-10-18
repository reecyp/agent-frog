"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { fadeRise } from "../motion";

type Tone = "ok" | "error" | "info";
interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message: string, tone: Tone = "ok") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, tone, message }]);
      // Errors stay until dismissed; confirmations clear themselves.
      if (tone !== "error") setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = t.tone === "ok" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info;
            return (
              <motion.div
                key={t.id}
                layout
                {...fadeRise}
                role={t.tone === "error" ? "alert" : "status"}
                className="floating pointer-events-auto flex w-full max-w-sm items-start gap-3 px-4 py-3 text-[0.875rem] text-[var(--ink)]"
              >
                <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${t.tone === "error" ? "text-[var(--danger)]" : t.tone === "ok" ? "text-[var(--ok)]" : "text-[var(--accent)]"}`} />
                <p className="flex-1 leading-snug">{t.message}</p>
                <button type="button" onClick={() => dismiss(t.id)} className="-m-1.5 grid size-7 place-items-center rounded-[6px] text-[var(--ink-3)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]" aria-label="Dismiss">
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
