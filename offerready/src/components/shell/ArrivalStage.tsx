"use client";

import { useLayoutEffect, useRef } from "react";

// Paper panels from the studio and the workspace's panels and lists, which share the material.
const PANEL = ".paper, .panel, .list";

/**
 * Gives every page's panels the same two behaviours without touching each page:
 * - Arrival: panels in view glide in from the side they sit on (left column from the left,
 *   right column from the right, full-width ones alternate slightly) and settle with a small
 *   turn. Panels that appear later, like a Suspense boundary resolving, arrive the same way.
 *   Panels below the fold just appear; there is no scroll reveal.
 * - Lamplight: a soft glow follows the mouse across whichever panel it is over (CSS reads --mx/--my).
 * Reduced motion skips the arrival entirely.
 */
export function ArrivalStage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const arrived = new WeakSet<Element>();

    function stage(candidates: Element[]) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const panels = candidates
        .filter((el): el is HTMLElement => el instanceof HTMLElement && el.matches(PANEL))
        // Outermost panels only, never dialogs or loading skeletons
        .filter((el) => !el.parentElement?.closest(PANEL) && !el.closest("dialog") && !el.querySelector(".skeleton") && !arrived.has(el))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.top < vh && r.bottom > 0)
        .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);

      panels.forEach(({ el, r }, i) => {
        const wide = r.width > vw * 0.55;
        const centre = (r.left + r.width / 2) / vw;
        const side = wide ? (i % 2 ? 1 : -1) : centre < 0.5 ? -1 : 1;
        // Web Animations leave the DOM's attributes alone, so this is safe before React hydrates.
        const x = side * (wide ? 10 : 28);
        const turn = side * (wide ? 0.35 : 0.9);
        el.animate([{ opacity: 0, translate: `${x}px 22px`, rotate: `${turn}deg`, scale: "0.985" }, {}], {
          duration: 1100,
          delay: 60 + Math.min(i, 8) * 75,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        });
        arrived.add(el);
      });
    }

    let observer: MutationObserver | undefined;
    if (!still) {
      stage(Array.from(root.querySelectorAll(PANEL)));
      // Mutation callbacks run before the next paint, so new panels never flash in place first.
      observer = new MutationObserver((records) => {
        const added: Element[] = [];
        for (const rec of records)
          for (const node of rec.addedNodes)
            if (node instanceof Element) added.push(node, ...node.querySelectorAll(PANEL));
        if (added.length) stage(added);
      });
      observer.observe(root, { childList: true, subtree: true });
    }

    let frame = 0;
    let last: { el: HTMLElement; x: number; y: number } | null = null;
    function follow(e: PointerEvent) {
      if (e.pointerType !== "mouse" || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(PANEL);
      if (!el) return;
      last = { el, x: e.clientX, y: e.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!last) return;
        const r = last.el.getBoundingClientRect();
        last.el.style.setProperty("--mx", `${last.x - r.left}px`);
        last.el.style.setProperty("--my", `${last.y - r.top}px`);
      });
    }
    root.addEventListener("pointermove", follow, { passive: true });

    return () => {
      observer?.disconnect();
      root.removeEventListener("pointermove", follow);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
