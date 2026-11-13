/**
 * Korean phone number formatting. Mirrors the database function
 * public.format_kr_phone so typed input and stored values match.
 */
export function formatPhone(input: string | null | undefined): string {
  const d = (input ?? "").replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  // Seoul area code 02
  if (d.startsWith("02")) {
    const x = d.slice(0, 10);
    if (x.length <= 2) return x;
    if (x.length <= 5) return `02-${x.slice(2)}`;
    if (x.length <= 9) return `02-${x.slice(2, 5)}-${x.slice(5)}`;
    return `02-${x.slice(2, 6)}-${x.slice(6)}`;
  }
  // 15xx / 16xx / 18xx representative numbers
  if (/^1[5-9]/.test(d)) {
    const x = d.slice(0, 8);
    return x.length <= 4 ? x : `${x.slice(0, 4)}-${x.slice(4)}`;
  }
  // Mobile (010…) and other area codes (031, 070 …)
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** Digits only — use for tel: links. */
export function phoneDigits(input: string | null | undefined): string {
  return (input ?? "").replace(/[^\d+]/g, "");
}
