"use client";

import { MotionConfig } from "motion/react";
import { OpeningCut } from "./opening/OpeningCut";
import { Walkthrough } from "./walkthrough/Walkthrough";
import "./demo.css";
import "./walkthrough.css";
import "./sections.css";

/**
 * The whole demo in one component, so it can mount as a dashboard tab later.
 * Opening: dark suit cloth cut open by scroll. Underneath: the walkthrough, in the studio's warm walnut.
 */
export function DemoExperience() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="af-demo" id="top">
        <a className="af-skip" href="#materials">
          Skip to the walkthrough
        </a>
        <OpeningCut />
        <Walkthrough />
      </div>
    </MotionConfig>
  );
}
