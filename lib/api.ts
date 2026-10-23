import { COPY } from "./copy";
import { CLIENT_TIMEOUT_MS } from "./limits";
import type { ExtractedInvoice } from "./ai/schemas";
import type { DraftPayload, ServerDraft } from "./email/flow";
import type { BlockerAnalysis } from "./blockers/types";

export class ExtractFailure extends Error {}

/** Browser -> POST /api/draft. Throws on any problem; the caller falls back to the template. */
export async function requestDraft(payload: DraftPayload): Promise<ServerDraft> {
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`draft failed: ${res.status}`);
  const j = (await res.json()) as Partial<ServerDraft>;
  if (typeof j.subject !== "string" || typeof j.body !== "string" || (j.source !== "ai" && j.source !== "template")) {
    throw new Error("draft malformed");
  }
  return { subject: j.subject, body: j.body, source: j.source };
}

/** Browser -> POST /api/extract. Throws ExtractFailure with user-facing copy. */
export async function extractInvoice(file: File): Promise<ExtractedInvoice> {
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/extract", { method: "POST", body, signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS) });
  } catch {
    throw new ExtractFailure(COPY.network);
  }
  if (res.ok) {
    const json = (await res.json()) as { data: ExtractedInvoice };
    if (!json.data.isInvoice) throw new ExtractFailure(COPY.noInvoice);
    return json.data;
  }
  const code = ((await res.json().catch(() => ({}))) as { error?: string }).error;
  if (code === "rate_limited") throw new ExtractFailure(COPY.rateLimited);
  if (code === "too_large") throw new ExtractFailure(COPY.pdfTooLarge);
  if (code === "not_supported") throw new ExtractFailure(COPY.unsupported);
  if (code === "empty") throw new ExtractFailure(COPY.empty);
  throw new ExtractFailure(COPY.aiFailed);
}

/** Browser -> POST /api/blocker. Returns the validated analysis, or the error kind for the UI. */
export async function analyseReply(
  reply: string,
  context?: string,
): Promise<{ ok: true; data: BlockerAnalysis } | { ok: false; error: "rate_limited" | "ai_failed" | "invalid_input" | "network" }> {
  let res: Response;
  try {
    res = await fetch("/api/blocker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply, context: context || undefined }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: "network" };
  }
  const json = (await res.json().catch(() => ({}))) as { data?: BlockerAnalysis; error?: string };
  if (res.ok && json.data) return { ok: true, data: json.data };
  if (json.error === "rate_limited") return { ok: false, error: "rate_limited" };
  if (json.error === "invalid_input" || json.error === "too_large") return { ok: false, error: "invalid_input" };
  return { ok: false, error: "ai_failed" };
}
