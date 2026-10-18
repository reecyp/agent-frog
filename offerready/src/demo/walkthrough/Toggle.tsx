"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId } from "react";

/** A two-or-three-way switch between views of the same thing. Each option is a pressed/unpressed button. */
export function Toggle<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const group = useId();
  return (
    <LayoutGroup id={group}>
      <div className="af-toggle" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" className="af-toggle-opt" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {value === o.id && <motion.span layoutId="toggle-bed" className="af-toggle-bed" transition={{ type: "spring", bounce: 0, duration: 0.35 }} />}
            <span className="af-toggle-label">{o.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}
