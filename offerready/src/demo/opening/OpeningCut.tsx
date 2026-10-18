"use client";

import { useEffect, useRef, useState } from "react";
import { cubicBezier, motion, useMotionValue, useScroll, useTransform, type MotionValue } from "motion/react";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import { Shears } from "./Shears";

const WORDS = ["AGENT", "FROG"] as const;
const settle = [0.16, 1, 0.3, 1] as const;
const glide = cubicBezier(0.45, 0, 0.25, 1);
const part = cubicBezier(0.6, 0, 0.2, 1);

/** Widest the cut opens behind the shears: a share of the stage width, but never under 22px on a phone. */
const GAP = 3.2;
const GAP_MIN_PX = 22;

/*
 * Scroll timeline. `p` runs 0 → 1 while the stage is pinned (the stage is one viewport taller than
 * the pinned area plus the overlap with the first section, see .af-cut-stage).
 *   0.00–0.05  scroll cue fades
 *   0.00–0.30  chalk line draws to the bottom, always ahead of the shears
 *   0.04–0.50  shears travel the line; the cloth opens in a V behind them
 *   0.50–0.60  shears leave through the bottom edge
 *   0.50–1.00  the two halves (and the title with them) swing back and apart
 */
export function OpeningCut() {
  const reduce = usePrefersReducedMotion();
  return reduce ? <StillOpening /> : <CutStage />;
}

function CutStage() {
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: stage, offset: ["start start", "end end"] });
  return (
    <div ref={stage} className="af-cut-stage">
      <div className="af-cut-sticky">
        <Cut p={p} />
      </div>
    </div>
  );
}

function Cut({ p }: { p: MotionValue<number> }) {
  const gapMax = useGapPercent();
  // Chalk line: drawn length, in % of the stage height.
  const line = useTransform(p, [0, 0.3], [0, 100], { ease: glide });
  const lineClip = useTransform(line, (l) => `inset(0 0 ${100 - l}% 0)`);

  // Shears: tip position in % (the track is translated, transforms only), fade in and out.
  const tip = useTransform(p, [0.04, 0.5, 0.6], [-4, 100, 128], { ease: [glide, (t) => t] });
  const track = useTransform(tip, (t) => `${t - 100}%`);
  const shearsOpacity = useTransform(p, [0.02, 0.07, 0.55, 0.6], [0, 1, 1, 0]);
  // Blades snip while cutting, then close as they leave.
  const blades = useTransform(p, (v) => {
    if (v < 0.04 || v > 0.52) return 2;
    const cut = (v - 0.04) / 0.48;
    return 2 + 11 * (0.5 - 0.5 * Math.cos(cut * Math.PI * 2 * 9));
  });

  // The V behind the shears: gap at the top grows with the length cut.
  const cutTo = useTransform(tip, (t) => Math.max(0, Math.min(100, t)));
  const gapTop = useTransform(cutTo, (c) => (gapMax * c) / 100);
  const leftClip = useTransform([gapTop, cutTo], ([g, c]: number[]) => `polygon(0 0, ${50 - g / 2}% 0, 50% ${c}%, 50% 100%, 0 100%)`);
  const rightClip = useTransform([gapTop, cutTo], ([g, c]: number[]) => `polygon(${50 + g / 2}% 0, 100% 0, 100% 100%, 50% 100%, 50% ${c}%)`);
  const glowClip = useTransform([gapTop, cutTo], ([g, c]: number[]) => `polygon(${50 - g / 2 - 0.5}% 0, ${50 + g / 2 + 0.5}% 0, 50% ${c}%)`);
  const glowOpacity = useTransform(p, [0.5, 0.6], [1, 0]);

  // Parting: the halves swing back like doors into the studio and slide out of frame.
  const open = useTransform(p, [0.5, 1], [0, 1], { ease: part });
  const leftX = useTransform(open, (o) => `${-o * 56}%`);
  const rightX = useTransform(open, (o) => `${o * 56}%`);
  const leftTurn = useTransform(open, (o) => o * 14);
  const rightTurn = useTransform(open, (o) => -o * 14);
  // A tint, not an opacity layer: an animated-opacity child can escape the parent's clip-path under 3D transforms.
  const dim = useTransform(open, (o) => `rgb(5 5 6 / ${(o * 0.5).toFixed(3)})`);
  const lip = useTransform(open, (o) => {
    const a = Math.min(1, o * 4) * 0.7;
    return `linear-gradient(90deg, transparent calc(50% - 7rem), rgb(4 4 5 / ${a.toFixed(3)}) 50%, transparent calc(50% + 7rem))`;
  });
  const cueOpacity = useTransform(p, [0, 0.05], [1, 0]);

  return (
    <>
      <h1 className="af-sr-only" translate="no">AGENT FROG</h1>

      {/* Lamplight in the cut while the shears work */}
      <motion.div className="af-gap-glow" style={{ clipPath: glowClip, opacity: glowOpacity }} />

      <motion.div className="af-half af-half-left" style={{ x: leftX, rotateY: leftTurn }}>
        <motion.div className="af-cloth" style={{ clipPath: leftClip }}>
          <ClothFace line={lineClip} />
          <motion.div className="af-cloth-dim" style={{ backgroundColor: dim, backgroundImage: lip }} />
        </motion.div>
        <CutEdge side="left" gapTop={gapTop} cutTo={cutTo} />
      </motion.div>
      <motion.div className="af-half af-half-right" style={{ x: rightX, rotateY: rightTurn }}>
        <motion.div className="af-cloth" style={{ clipPath: rightClip }}>
          <ClothFace line={lineClip} />
          <motion.div className="af-cloth-dim" style={{ backgroundColor: dim, backgroundImage: lip }} />
        </motion.div>
        <CutEdge side="right" gapTop={gapTop} cutTo={cutTo} />
      </motion.div>

      <motion.div className="af-shears-track" style={{ y: track, opacity: shearsOpacity }} aria-hidden>
        <Shears open={blades} className="af-shears" />
      </motion.div>

      <motion.p className="af-cue" style={{ opacity: cueOpacity }}>
        <span>Scroll to open</span>
        <span className="af-cue-tick" aria-hidden />
      </motion.p>
    </>
  );
}

function useGapPercent() {
  const [gap, setGap] = useState(GAP);
  useEffect(() => {
    const update = () => setGap(Math.max(GAP, (GAP_MIN_PX / window.innerWidth) * 100));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return gap;
}

/** One face of the cloth: weave, light, chalk line and title. Both halves draw the same face; each is clipped to its side. */
function ClothFace({ line, still }: { line?: MotionValue<string>; still?: boolean }) {
  return (
    <div className="af-cloth-face" aria-hidden>
      <div className="af-cloth-light" />
      {line ? <motion.div className="af-chalk" style={{ clipPath: line }} /> : <div className={still ? "af-chalk af-chalk-still" : "af-chalk"} />}
      <Wordmark />
    </div>
  );
}

/** The two words sit either side of the cut line, so the cut runs through the word space and never through a letter. */
function Wordmark() {
  const reduce = usePrefersReducedMotion();
  let i = 0;
  return (
    <div className="af-wordmark" translate="no">
      {WORDS.map((w, wi) => (
        <span key={w} className={wi === 0 ? "af-word af-word-left" : "af-word af-word-right"}>
          {w.split("").map((ch) => {
            const n = i++;
            return (
              <motion.span
                key={n}
                className="af-letter"
                initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.1, ease: settle, delay: 0.35 + n * 0.05 }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

/** A lit, slightly frayed edge along each side of the cut. */
function CutEdge({ side, gapTop, cutTo }: { side: "left" | "right"; gapTop: MotionValue<number>; cutTo: MotionValue<number> }) {
  const sign = side === "left" ? -1 : 1;
  const x1 = useTransform(gapTop, (g) => `${50 + (sign * g) / 2}%`);
  const y2 = useTransform(cutTo, (c) => `${c}%`);
  const visible = useTransform(cutTo, [0, 2], [0, 1]);
  return (
    <motion.svg className="af-cut-edge" style={{ opacity: visible }} aria-hidden focusable="false">
      <motion.line x1={x1} y1="0%" x2="50%" y2={y2} className="af-cut-edge-lit" />
      <motion.line x1={x1} y1="0%" x2="50%" y2={y2} className="af-cut-edge-fray" />
    </motion.svg>
  );
}

/** Reduced motion: the cloth as a still scene with the chalk line drawn and the shears resting on it. No cut, no pin. */
function StillOpening() {
  const still = useMotionValue(2);
  return (
    <div className="af-still">
      <h1 className="af-sr-only" translate="no">AGENT FROG</h1>
      <div className="af-cloth">
        <ClothFace still />
      </div>
      <div className="af-shears-still" aria-hidden>
        <Shears open={still} className="af-shears" />
      </div>
      <p className="af-cue af-cue-still">
        <span>Scroll to begin</span>
      </p>
    </div>
  );
}
