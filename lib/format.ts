const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inr = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 100045.21 -> "₹1,00,045.21" (Indian digit grouping, always 2 decimals). */
export const formatINR = (n: number): string => `₹${inr.format(n)}`;

/** "2026-10-22" -> "22 Oct 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-08" -> "Aug 2026". */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** 16.5 -> "16.50%". */
export const formatPercent = (n: number): string => `${n.toFixed(2)}%`;
