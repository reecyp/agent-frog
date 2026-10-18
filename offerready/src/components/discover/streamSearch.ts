"use client";

import type { SearchFilters, SearchStats, SourceStat } from "@/domain/types";

export type StreamEvent =
  | { type: "stage"; stage: string; message: string }
  | { type: "source"; stat: SourceStat }
  | { type: "done"; searchId: string; stats: SearchStats }
  | { type: "error"; message: string };

/** Runs a search and forwards each real progress event from the server. Resolves with the finished search. */
export async function streamSearch(
  body: { query: string; filters: SearchFilters; interpretedBy: "claude" | "rules" },
  onEvent: (e: StreamEvent) => void,
): Promise<{ searchId: string; stats: SearchStats }> {
  const res = await fetch("/api/search/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "The search couldn't start.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: { searchId: string; stats: SearchStats } | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const e = JSON.parse(line) as StreamEvent;
      if (e.type === "error") throw new Error(e.message);
      if (e.type === "done") result = { searchId: e.searchId, stats: e.stats };
      onEvent(e);
    }
  }
  if (!result) throw new Error("The search ended without results. Try again.");
  return result;
}
