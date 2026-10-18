"use client";

import { useSyncExternalStore } from "react";

// Tiny client store for the jobs picked for side-by-side comparison (max 3).
let selected: string[] = [];
const EMPTY: string[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function toggleCompare(id: string): boolean {
  if (selected.includes(id)) selected = selected.filter((x) => x !== id);
  else if (selected.length < 3) selected = [...selected, id];
  else return false;
  emit();
  return true;
}

export function clearCompare() {
  selected = [];
  emit();
}

export function useCompare(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selected,
    () => EMPTY,
  );
}
