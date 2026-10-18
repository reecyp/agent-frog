// Shared by the search bar (client) and the results' page links (server).

/** The /network URL for a search; the page number is in the URL so Back works across pages. */
export function alumniHref(query: string, page = 1) {
  const p = new URLSearchParams();
  if (query) p.set("q", query);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/network?${s}#find` : "/network#find";
}
