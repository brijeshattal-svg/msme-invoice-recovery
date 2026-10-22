import { COPY } from "./copy";
import type { ExtractedInvoice } from "./ai/schemas";

export class ExtractFailure extends Error {}

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
