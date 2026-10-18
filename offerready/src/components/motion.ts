// Shared motion tokens. Durations stay short so repeated interactions remain fast.
export const ease = [0.2, 0.8, 0.2, 1] as const;

export const dur = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
};

/** Spring for indicators that slide between positions (nav, tabs). No bounce. */
export const indicatorSpring = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 } as const;

export const fadeRise = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4, transition: { duration: dur.fast } },
  transition: { duration: dur.base, ease },
};

export const popover = {
  initial: { opacity: 0, scale: 0.98, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, transition: { duration: dur.fast } },
  transition: { duration: dur.base, ease },
};
