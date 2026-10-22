import { extractInvoice, ExtractionError } from "@/lib/ai/extract";
import { isAllowedMime, MAX_UPLOAD_BYTES, type AllowedMime } from "@/lib/limits";
import { ipFrom, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEADERS = { "Cache-Control": "no-store" };

// Magic-byte check so a mislabelled file is not forwarded to the model.
function sniff(b: Buffer): AllowedMime | null {
  if (b.length >= 4 && b.subarray(0, 4).toString("latin1") === "%PDF") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  return null;
}

// CLAUDE.md rule 3: log only status and duration, never file bytes, extracted fields or prompts.
function respond(started: number, status: number, body: unknown): Response {
  console.info(`extract status=${status} ms=${Date.now() - started}`);
  return Response.json(body, { status, headers: HEADERS });
}

export async function POST(req: Request) {
  const started = Date.now();

  if (!rateLimit(ipFrom(req))) return respond(started, 429, { error: "rate_limited" });

  // Cheap early rejection before the body is read (multipart adds a little overhead).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) return respond(started, 413, { error: "too_large" });

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return respond(started, 400, { error: "not_supported" });
  }
  if (!(file instanceof File)) return respond(started, 400, { error: "not_supported" });
  if (file.size === 0) return respond(started, 400, { error: "empty" });
  if (file.size > MAX_UPLOAD_BYTES) return respond(started, 413, { error: "too_large" });
  if (!isAllowedMime(file.type)) return respond(started, 400, { error: "not_supported" });

  const bytes = Buffer.from(await file.arrayBuffer());
  const sniffed = sniff(bytes);
  if (sniffed === null || sniffed !== file.type) return respond(started, 400, { error: "not_supported" });

  try {
    const data = await extractInvoice(bytes, sniffed);
    return respond(started, 200, { data });
  } catch (e) {
    if (e instanceof ExtractionError && e.kind === "rate_limited") return respond(started, 429, { error: "rate_limited" });
    return respond(started, 502, { error: "ai_failed" });
  }
}
