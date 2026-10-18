import { Wordmark } from "@/components/shell/Wordmark";

/** Onboarding, the fitting room: one solid warm black, no workspace navigation, just the mark and a readable column. */
export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh">
      <div aria-hidden className="room room-fitting" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-sm focus:bg-[var(--paper)] focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="flex h-16 items-center justify-center px-4">
        <Wordmark href="/" />
      </header>
      <main id="main" tabIndex={-1} className="@container min-w-0 px-4 pb-24 pt-4 outline-none sm:px-6 sm:pt-10 lg:px-10">
        <div className="mx-auto max-w-[76rem]">{children}</div>
      </main>
    </div>
  );
}
