// Mail clients and browsers truncate or reject long mailto: URLs; ~2000 characters is a common
// ceiling, so stay under 1800 and fall back to subject-only (the UI copies the body instead).
const MAX_MAILTO = 1800;

/** What "Copy email" puts on the clipboard: subject line, blank line, body. */
export const emailAsText = (subject: string, body: string): string => `Subject: ${subject}\n\n${body}`;

export function buildMailto(subject: string, body: string): { href: string; truncated: boolean } {
  const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, "\r\n")); // CRLF -> %0D%0A
  const full = `mailto:?subject=${enc(subject)}&body=${enc(body)}`;
  if (full.length <= MAX_MAILTO) return { href: full, truncated: false };
  return { href: `mailto:?subject=${enc(subject)}`, truncated: true };
}
