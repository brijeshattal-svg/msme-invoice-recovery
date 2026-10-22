import { z } from "zod";
import { classifyReply, ClassifyError } from "@/lib/ai/classify";
import { MAX_REPLY_CHARS, sanitizeReply, validateClassification } from "@/lib/blockers/validate";
import { ipFrom, rateLimit } from "@/lib/ratelimit";
import { todayIST } from "@/lib/today";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEADERS = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 20_000;
const MAX_CONTEXT_CHARS = 500;

// The reply is pasted by the founder but written by someone else: untrusted. Clean, then cap.
const BlockerRequest = z.object({
  reply: z
    .string()
    .max(MAX_REPLY_CHARS * 2)
    .transform(sanitizeReply)
    .pipe(z.string().min(1).max(MAX_REPLY_CHARS)),
  context: z
    .string()
    .max(MAX_CONTEXT_CHARS * 2)
    .optional()
    .transform((s) => (s === undefined ? undefined : sanitizeReply(s).slice(0, MAX_CONTEXT_CHARS) || undefined)),
});

// CLAUDE.md rule 3: status, timing and model only; never the reply, the context or the result.
function respond(started: number, status: number, body: unknown, extra = ""): Response {
  console.info(`blocker status=${status} ms=${Date.now() - started}${extra}`);
  return Response.json(body, { status, headers: HEADERS });
}

/** SPRINT_PLAN.md section 2.2: classify a client's reply; the answer is validated before it leaves. */
export async function POST(req: Request) {
  const started = Date.now();
  if (!rateLimit(`blocker:${ipFrom(req)}`)) return respond(started, 429, { error: "rate_limited" });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return respond(started, 413, { error: "too_large" });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return respond(started, 400, { error: "invalid_input" });
  }
  const parsed = BlockerRequest.safeParse(json);
  if (!parsed.success) return respond(started, 400, { error: "invalid_input" });
  const { reply, context } = parsed.data;

  const today = todayIST();
  try {
    const raw = await classifyReply(reply, today, context);
    const analysis = validateClassification(raw, reply, today);
    return respond(started, 200, { data: analysis }, ` blockers=${analysis.blockers.length} unclear=${analysis.unclear}`);
  } catch (e) {
    const kind = e instanceof ClassifyError && e.kind === "rate_limited" ? "rate_limited" : "ai_failed";
    return respond(started, kind === "rate_limited" ? 429 : 502, { error: kind });
  }
}
