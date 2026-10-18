"use client";

import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import { Applications } from "../sections/Applications";
import { Export } from "../sections/Export";
import { Letter } from "../sections/Letter";
import { Materials } from "../sections/Materials";
import { Prep } from "../sections/Prep";
import { Profile } from "../sections/Profile";
import { Review } from "../sections/Review";
import { Sources } from "../sections/Sources";
import { Tailor } from "../sections/Tailor";

/** The walkthrough's sections in story order. `side` is where the explanation sits. */
const SECTIONS = [
  { id: "materials", name: "Your materials", side: "left", Component: Materials },
  { id: "profile", name: "Your profile", side: "right", Component: Profile },
  { id: "tailor", name: "Tailoring", side: "left", Component: Tailor },
  { id: "review", name: "Review", side: "right", Component: Review },
  { id: "letter", name: "Cover letter", side: "left", Component: Letter },
  { id: "export", name: "Export", side: "right", Component: Export },
  { id: "prep", name: "Prep", side: "left", Component: Prep },
  { id: "applications", name: "My Applications", side: "right", Component: Applications },
  { id: "sources", name: "My Profile", side: "left", Component: Sources },
] as const;

export function Walkthrough() {
  const root = useRef<HTMLDivElement>(null);
  return (
    <div ref={root} className="af-walk">
      <Thread root={root} />
      <TapeMeasure root={root} />
      {SECTIONS.map(({ id, Component }) => (
        <Component key={id} />
      ))}
      <footer className="af-end">
        <p className="af-end-line">Every name, employer and number on this page is fictional.</p>
        <a className="af-btn af-btn-quiet" href="#top">
          Back to the top
        </a>
      </footer>
      <Progress />
    </div>
  );
}

/**
 * A running stitch that continues the chalk line from the cut: it leaves the centre, settles in the
 * gutter beside each section's explanation and crosses over in the gap between sections. The stitch
 * is drawn once; a needle rides along it with the scroll (and back again), moved by transform only.
 * Redrawing the stitch itself on every frame meant repainting a page-tall layer, which halved the
 * frame rate.
 */
function Thread({ root }: { root: React.RefObject<HTMLDivElement | null> }) {
  const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null);
  const path = useRef<SVGPathElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: root, offset: ["start 70%", "end end"] });
  const drawn = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(90);

  const place = (v: number) => {
    const el = path.current;
    if (!el) return;
    const len = el.getTotalLength();
    const at = Math.min(len, Math.max(0, v) * len);
    const p = el.getPointAtLength(at);
    const q = el.getPointAtLength(Math.min(len, at + 2));
    x.set(p.x);
    y.set(p.y);
    if (q.x !== p.x || q.y !== p.y) rotate.set((Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI);
  };
  useMotionValueEvent(drawn, "change", place);

  // useEffect, not useLayoutEffect: the parent's ref isn't attached yet when a child's layout effect runs.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const build = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const narrow = w < 900;
      const gutter = narrow ? 10 : Math.min(56, w * 0.03);
      const xFor = (side: string) => (narrow || side === "left" ? gutter : w - gutter);
      const sections = [...el.querySelectorAll<HTMLElement>(":scope > section")];
      let d = `M ${w / 2} 0`;
      let x = w / 2;
      let y = 0;
      sections.forEach((s, i) => {
        const nx = xFor(SECTIONS[i]?.side ?? "left");
        const top = s.offsetTop + (i === 0 && !narrow ? s.offsetHeight * 0.18 : 0);
        // Cross over only in the empty gap above the section, then run straight down its length.
        const mid = (y + top) / 2;
        d += ` C ${x} ${mid}, ${nx} ${mid}, ${nx} ${top}`;
        x = nx;
        y = s.offsetTop + s.offsetHeight + 24;
        d += ` L ${x} ${y}`;
      });
      setGeo({ w, h, d });
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(el);
    return () => ro.disconnect();
  }, [root]);

  // Put the needle where the scroll already is once the path exists (or changes shape).
  useEffect(() => {
    if (geo) place(drawn.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  if (!geo) return null;
  return (
    <>
      <svg className="af-thread" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden focusable="false">
        <path ref={path} d={geo.d} className="af-thread-stitch" />
      </svg>
      {!reduce && (
        <motion.div className="af-needle" style={{ x, y, rotate }} aria-hidden>
          <svg viewBox="0 0 40 8" width="40" height="8" focusable="false">
            <path d="M0 4 L28 2.6 Q36 3 39.5 4 Q36 5 28 5.4 Z" className="af-needle-steel" />
            <ellipse cx="6" cy="4" rx="3.2" ry="0.9" className="af-needle-eye" />
          </svg>
        </motion.div>
      )}
    </>
  );
}

/**
 * The one ambient object: a cloth tape measure lying along the outer edge, mostly out of frame,
 * sliding a little against the scroll. Low contrast, never over content, hidden on narrow screens.
 */
function TapeMeasure({ root }: { root: React.RefObject<HTMLDivElement | null> }) {
  const { scrollYProgress } = useScroll({ target: root, offset: ["start end", "end start"] });
  const reduce = usePrefersReducedMotion();
  const drift = useTransform(scrollYProgress, [0, 1], ["-6%", "10%"]);
  const y = reduce ? 0 : drift;
  const inches = Array.from({ length: 36 }, (_, i) => i + 1);
  return (
    <motion.div className="af-tape" style={{ y }} aria-hidden>
      <svg viewBox="0 0 34 1440" preserveAspectRatio="xMidYMin meet" focusable="false">
        <rect x="0" y="0" width="34" height="1440" rx="2" className="af-tape-body" />
        {inches.map((n) => (
          <g key={n}>
            <line x1="34" x2="20" y1={n * 40} y2={n * 40} className="af-tape-tick" />
            <line x1="34" x2="27" y1={n * 40 - 20} y2={n * 40 - 20} className="af-tape-tick" />
            <line x1="34" x2="30" y1={n * 40 - 10} y2={n * 40 - 10} className="af-tape-tick" />
            <line x1="34" x2="30" y1={n * 40 - 30} y2={n * 40 - 30} className="af-tape-tick" />
            <text x="15" y={n * 40 + 4} className="af-tape-num">
              {n}
            </text>
          </g>
        ))}
      </svg>
    </motion.div>
  );
}

/** Where the reader is: the current section's name and how far along the story it is. */
function Progress() {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target, e.isIntersecting));
        const i = els.findIndex((el) => seen.get(el));
        setActive(i === -1 ? null : i);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <motion.nav
      className="af-progress"
      aria-label="Walkthrough"
      initial={false}
      animate={{ opacity: active === null ? 0 : 1, y: active === null ? 8 : 0 }}
      transition={{ duration: 0.3 }}
      style={{ pointerEvents: active === null ? "none" : "auto" }}
    >
      <ol>
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={i === active ? "step" : undefined} tabIndex={active === null ? -1 : undefined}>
              {s.name}
            </a>
          </li>
        ))}
      </ol>
      <p className="af-progress-count">
        {active === null ? "" : `${active + 1} of ${SECTIONS.length}`}
      </p>
    </motion.nav>
  );
}
