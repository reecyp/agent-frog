"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";

const cinematic = [0.65, 0, 0.35, 1] as const;
const settle = [0.16, 1, 0.3, 1] as const;
const WORD = "AGENT FROG";

/**
 * The shop entrance: a real shop photo under a slow camera drift, its pendant lamp breathing.
 * The page opens with one orchestrated moment (the wordmark's letters settle in, then the line
 * and the button), and the click pushes the camera into the shop: an ~850ms zoom that ends on
 * the onboarding room's colour, then the route changes underneath. Reduced motion gets a fade.
 */
export function Entrance() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate();
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    router.prefetch("/start");
  }, [router]);

  async function enter() {
    if (entering) return;
    setEntering(true);
    if (reduce) {
      await animate("[data-veil]", { opacity: 1 }, { duration: 0.18 });
    } else {
      animate("[data-copy]", { opacity: 0, x: -16 }, { duration: 0.32, ease: cinematic });
      animate("[data-scene]", { scale: 2.4, filter: "blur(4px)" }, { duration: 0.85, ease: cinematic });
      await animate("[data-veil]", { opacity: 1 }, { duration: 0.42, delay: 0.43, ease: "easeIn" });
    }
    router.push("/start");
  }

  // Copy arrival: one sequence, timed off the wordmark.
  const after = (i: number) => (reduce ? { duration: 0 } : { duration: 0.9, ease: settle, delay: 0.55 + WORD.length * 0.05 + i * 0.14 });

  return (
    <div ref={scope} className="fixed inset-0 z-40 overflow-hidden bg-[#140b07]">
      <div data-scene aria-hidden className="absolute inset-0 origin-[52%_58%] will-change-transform">
        <div className="scene-photo">
          <Image src="/entrance/drinkwaters.webp" alt="" fill priority sizes="(max-aspect-ratio: 3/2) 150vh, 100vw" className="object-cover" />
          <div className="scene-lamp" />
        </div>
        <div className="scene-scrim" />
        <div className="scene-vignette" />
      </div>

      <div data-copy className="relative flex h-full flex-col justify-end px-6 pb-10 sm:justify-center sm:pb-0 sm:pl-[clamp(2rem,7vw,7rem)]">
        <h1 aria-label={WORD} className="wordmark font-bold text-[clamp(2.4rem,6vw,5.2rem)] leading-none tracking-[0.14em] text-[#f6ecda] [text-shadow:0_2px_30px_rgb(0_0_0/0.55),0_0_26px_rgb(165_115_230/0.7),0_0_70px_rgb(130_75_205/0.45)]">
          {WORD.split("").map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="inline-block whitespace-pre"
              initial={reduce ? false : { opacity: 0, y: 22, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.1, ease: settle, delay: 0.35 + i * 0.05 }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={after(0)}
          className="mt-5 font-[family-name:var(--font-display)] text-[clamp(1.15rem,2.2vw,1.6rem)] italic text-[#e6d5b8] [text-shadow:0_1px_12px_rgb(0_0_0/0.7)]"
        >
          Tailor your application.
        </motion.p>
        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={after(1)} className="mt-10 sm:mt-12">
          <button type="button" onClick={enter} disabled={entering} className="btn btn-primary min-h-12 px-7 text-[0.95rem] shadow-[0_12px_40px_-10px_rgb(77_25_121/0.8),var(--shadow-raised)]">
            Upload your materials here
          </button>
        </motion.div>
        <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={after(2)} className="mt-6 sm:absolute sm:bottom-8 sm:left-[clamp(2rem,7vw,7rem)] sm:mt-0">
          <Link href="/studio" className="-mx-2 inline-flex min-h-11 items-center px-2 text-[0.8125rem] text-[#cdb99c] underline-offset-4 hover:text-[#f6ecda] hover:underline">
            Already fitted? Go to your studio
          </Link>
        </motion.div>
      </div>

      <div data-veil aria-hidden className="pointer-events-none absolute inset-0 bg-[var(--fitting)] opacity-0" />
    </div>
  );
}
