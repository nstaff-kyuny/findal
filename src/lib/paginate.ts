export const ADMIN_PAGE_SIZE = 10;

/** Slice a list into one page. Out-of-range pages are clamped to the nearest valid page. */
export function paginate<T>(items: T[], page: number, pageSize = ADMIN_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, totalPages, start };
}

/** Page numbers to show around the current page, e.g. [1, "…", 4, 5, 6, "…", 12]. */
export function pageWindow(current: number, total: number, radius = 2): (number | "…")[] {
  const out: (number | "…")[] = [];
  const from = Math.max(2, current - radius);
  const to = Math.min(total - 1, current + radius);
  out.push(1);
  if (from > 2) out.push("…");
  for (let p = from; p <= to; p++) out.push(p);
  if (to < total - 1) out.push("…");
  if (total > 1) out.push(total);
  return out;
}
