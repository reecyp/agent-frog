"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from "motion/react";

export interface StudioBox {
  href: string;
  name: string;
  detail: string;
  primary?: boolean;
  /** A photograph under the box, and which part of it to keep in view when the box crops it. */
  photo?: string;
  photoPosition?: string;
}

const rail: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.11, delayChildren: 0.1 } } };

// Each box arrives from the side it sits on: the Workbench from the left, the rest from the right.
const arrive: Variants = {
  hidden: (side: number) => ({ opacity: 0, x: side * 34, y: 26, rotate: side * 1.2, scale: 0.96 }),
  shown: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, transition: { type: "spring", stiffness: 70, damping: 16, mass: 1.1 } },
};

/**
 * The homepage's workspace boxes. Three layers so the motions never fight: the outer one
 * arrives (spring, staggered), the middle one sways slowly (CSS, out of step), the inner one
 * tilts toward the pointer while a warm sheen follows it. All stop under reduced motion.
 */
export function StudioBoxes({ boxes }: { boxes: StudioBox[] }) {
  const reduce = useReducedMotion();
  return (
    <motion.ul
      // Phones stack; tablets put Jobs across the top over a row of three; from lg the boxes share
      // two columns and fill the height left under the greeting, within sensible limits.
      className="grid gap-4 sm:gap-5 md:grid-cols-3 lg:h-[clamp(26rem,calc(100dvh-19rem),46rem)] lg:grid-cols-[1.35fr_1fr] lg:grid-rows-3"
      initial={reduce ? false : "hidden"}
      animate="shown"
      variants={rail}
    >
      {boxes.map((b, i) => (
        <motion.li key={b.href} className={b.primary ? "md:col-span-3 lg:col-span-1 lg:row-span-3" : ""} custom={b.primary ? -1 : 1} variants={arrive}>
          {/* A size container, so each box's name scales with the box rather than the window */}
          <div
            className="float-idle @container h-full"
            style={{ "--float-dur": `${8.5 + i * 1.7}s`, "--float-delay": `${-i * 2.3}s`, "--float-x": `${b.primary ? 1.5 : 2.5 + i * 0.4}px`, "--float-r": `${b.primary ? 0.12 : 0.3}deg` } as React.CSSProperties}
          >
            <TiltBox box={b} still={!!reduce} />
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}

function TiltBox({ box: b, still }: { box: StudioBox; still: boolean }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 150, damping: 18, mass: 0.6 };
  // Smaller boxes may tilt further than the big one; a few degrees either way.
  const range = b.primary ? 3 : 5;
  const rotateX = useSpring(useTransform(py, [0, 1], [range, -range]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-range, range]), spring);

  function track(e: React.PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty("--mx", `${x * 100}%`);
    e.currentTarget.style.setProperty("--my", `${y * 100}%`);
    if (still) return;
    px.set(x);
    py.set(y);
  }
  function release() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <motion.div
      className="h-full [perspective:900px]"
      whileHover={still ? undefined : { y: -4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <motion.div className="h-full" style={still ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}>
        <Link
          href={b.href}
          onPointerMove={track}
          onPointerLeave={release}
          style={b.photo ? ({ "--photo": `url(${b.photo})`, "--photo-pos": b.photoPosition ?? "center" } as React.CSSProperties) : undefined}
          className={`studio-box group flex h-full flex-col justify-end overflow-hidden rounded-[var(--r-panel)] p-6 sm:p-7 ${b.photo ? "studio-box-photo" : "stitched"} ${b.primary ? "min-h-64 lg:min-h-0" : "min-h-36 lg:min-h-0"}`}
        >
          <span className={`studio-box-name font-[family-name:var(--font-display)] leading-none text-[var(--ink)] ${b.primary ? "text-[clamp(2.4rem,12cqi,5rem)]" : "text-[clamp(1.5rem,10cqi,2.4rem)]"}`}>{b.name}</span>
          <span className={`mt-3 block text-pretty ${b.primary ? "text-[0.9375rem] sm:mt-4" : "text-[0.875rem]"} ${b.photo ? "text-[#e6d8c2]" : "text-[var(--ink-2)]"}`}>
            {b.detail}
            <ArrowRight className="ml-2 inline-block size-4 align-[-0.2em] transition-transform duration-500 group-hover:translate-x-1 group-focus-visible:translate-x-1" aria-hidden />
          </span>
        </Link>
      </motion.div>
    </motion.div>
  );
}
