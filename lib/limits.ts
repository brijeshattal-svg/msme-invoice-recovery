// Shared by the browser (pre-checks) and the /api/extract route (authoritative checks).
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel functions reject request bodies over 4.5 MB
export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];
export const isAllowedMime = (t: string): t is AllowedMime =>
  (ALLOWED_MIME as readonly string[]).includes(t);
