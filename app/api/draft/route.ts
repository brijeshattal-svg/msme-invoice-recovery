import { z } from "zod";
import { draftEmail } from "@/lib/ai/draft";
import { cleanString } from "@/lib/ai/normalize";
import { buildFacts, factsForTone } from "@/lib/email/facts";
import { TONE_IDS } from "@/lib/email/tones";
import { compute, isValidISODate } from "@/lib/engine";
import { ipFrom, rateLimit } from "@/lib/ratelimit";
import { todayIST } from "@/lib/today";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEADERS = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 20_000;

// Strings arrive from the browser but originally from an untrusted file: clean, then cap.
const Text = (max: number) =>
  z
    .string()
    .max(2000)
    .transform((s) => cleanString(s) ?? "")
    .pipe(z.string().min(1).max(max));
const IsoDate = z.string().refine(isValidISODate);

const DraftRequest = z.object({
  clientName: Text(200),
  invoiceNumber: Text(100),
  invoiceDate: IsoDate,
  amount: z.number().positive().max(1e12),
  acceptanceDate: IsoDate,
  agreementDays: z.number().int().min(0).max(365).nullable(),
  udyamDate: IsoDate,
  tone: z.enum(TONE_IDS as [string, ...string[]]),
});

// CLAUDE.md rule 3: log status, timing and outcome only; never inputs or the email.
function respond(started: number, status: number, body: unknown, extra = ""): Response {
  console.info(`draft status=${status} ms=${Date.now() - started}${extra}`);
  return Response.json(body, { status, headers: HEADERS });
}

export async function POST(req: Request) {
  const started = Date.now();
  if (!rateLimit(`draft:${ipFrom(req)}`)) return respond(started, 429, { error: "rate_limited" });

  // A real request is well under 2 KB; refuse oversized bodies before reading them.
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return respond(started, 413, { error: "too_large" });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return respond(started, 400, { error: "invalid_input" });
  }
  const parsed = DraftRequest.safeParse(json);
  if (!parsed.success) return respond(started, 400, { error: "invalid_input" });
  const p = parsed.data;

  // The server re-computes from the inputs; figures from the browser are never trusted.
  const result = compute({
    amount: p.amount,
    invoiceDate: p.invoiceDate,
    acceptanceDate: p.acceptanceDate,
    agreementDays: p.agreementDays,
    udyamDate: p.udyamDate,
    asOf: todayIST(),
  });
  if (result.status !== "overdue") return respond(started, 409, { error: "not_overdue" });

  const tone = p.tone as (typeof TONE_IDS)[number];
  const facts = factsForTone(buildFacts(p, result, todayIST()), tone);
  const draft = await draftEmail(facts, tone);
  return respond(
    started,
    200,
    { subject: draft.subject, body: draft.body, source: draft.source, redrafts: draft.redrafts },
    ` source=${draft.source} redrafts=${draft.redrafts}`,
  );
}
