// ISO 'YYYY-MM-DD' <-> integer day number (days since 1970-01-01, proleptic Gregorian).
// Pure integer arithmetic (Howard Hinnant's civil-date algorithms): no Date object,
// no local time, no DST.

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width: number): string => String(n).padStart(width, "0");

export function toDayNum(iso: string): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  let y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  y -= mo <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (mo + (mo > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function fromDayNum(n: number): string {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const mo = mp + (mp < 10 ? 3 : -9);
  const y = yoe + era * 400 + (mo <= 2 ? 1 : 0);
  return `${pad(y, 4)}-${pad(mo, 2)}-${pad(d, 2)}`;
}

export function isValidISODate(iso: string): boolean {
  const m = ISO_RE.exec(iso);
  if (!m) return false;
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return false;
  return fromDayNum(toDayNum(iso)) === iso; // rejects 2026-02-30 etc.
}

export const addDays = (iso: string, n: number): string => fromDayNum(toDayNum(iso) + n);

/** b - a in whole days. */
export const daysBetween = (a: string, b: string): number => toDayNum(b) - toDayNum(a);

export const monthKey = (iso: string): string => iso.slice(0, 7);
