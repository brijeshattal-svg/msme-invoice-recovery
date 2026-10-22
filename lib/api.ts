import { COPY } from "./copy";
import type { ExtractedInvoice } from "./ai/schemas";
import type { DraftPayload, ServerDraft } from "./email/flow";

export class ExtractFailure extends Error {}

/** Browser -> POST /api/draft. Throws on any problem; the caller falls back to the template. */
export async function requestDraft(payload: DraftPayload): Promise<ServerDraft> {
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
    res = await fetch("/api/extract", { method: "POST", body });
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
