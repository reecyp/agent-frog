import { Suspense } from "react";
import { Nav, NavFrame } from "./Nav";
import { StatusPanel } from "./StatusPanel";

/**
 * Workspace shell for every tab, in the studio's materials. Three modes (viewport based):
 * - < 768px: top bar + slide-in drawer
 * - 768–1279px: 72px labeled icon rail
 * - ≥ 1280px: 240px sidebar, which the student can collapse to the icon rail
 * `main` is a container (@container), so page layouts should respond to its width with
 * container variants (@3xl:grid-cols-…), not viewport breakpoints.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const status = (
    <Suspense fallback={<div className="h-10" aria-hidden />}>
      <StatusPanel variant="responsive" />
    </Suspense>
  );
  const drawerStatus = (
    <Suspense fallback={<div className="h-12" aria-hidden />}>
      <StatusPanel variant="full" />
    </Suspense>
  );
  return (
    <div className="relative isolate min-h-dvh md:grid md:grid-cols-[var(--nav-rail)_minmax(0,1fr)] md:transition-[grid-template-columns] md:duration-200 xl:grid-cols-[var(--nav-full)_minmax(0,1fr)]">
      {/* The studio room: warm dark under two slowly drifting pools of lamplight. */}
      <div aria-hidden className="room room-studio" />
      {/* The navigation is static; only the active indicator depends on the URL. */}
      <Suspense fallback={<NavFrame pathname={null} status={null} drawerStatus={null} />}>
        <Nav status={status} drawerStatus={drawerStatus} />
      </Suspense>
      <main id="main" tabIndex={-1} className="@container min-w-0 px-[var(--page-gutter)] pb-24 pt-6 outline-none md:pt-8 xl:pt-10">
        <div className="mx-auto w-full max-w-[var(--page-max)]">{children}</div>
      </main>
    </div>
  );
}
