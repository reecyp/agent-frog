import { Suspense } from "react";
import { StudioChrome } from "@/components/shell/StudioChrome";
import { StatusPanel } from "@/components/shell/StatusPanel";

/** Home: the studio room with a quiet top bar. The tabs it leads to use the workspace sidebar instead. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh">
      <div aria-hidden className="room room-studio" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-sm focus:bg-[var(--paper)] focus:px-3 focus:py-2">
        Skip to content
      </a>
      <StudioChrome
        status={
          <Suspense fallback={<div className="h-12" aria-hidden />}>
            <StatusPanel variant="full" />
          </Suspense>
        }
      />
      <main id="main" tabIndex={-1} className="min-w-0 px-4 pb-24 pt-4 outline-none sm:px-6 lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-[76rem]">{children}</div>
      </main>
    </div>
  );
}
