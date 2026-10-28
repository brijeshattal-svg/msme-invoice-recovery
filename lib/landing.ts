import { buildFacts } from "@/lib/email/facts";
import { compute } from "@/lib/engine";
import { SAMPLE_PREVIEW_AS_OF, sampleExtraction, samplePreviewInput } from "@/lib/wizard";

/** Part payment shown on the landing: ₹90,000 received plus ₹10,000 TDS deducted, on 16 Sep 2026. */
const SAMPLE_PAYMENT = { date: "2026-09-16", amount: 90000, tds: 10000 };

/**
 * Everything the landing page shows about the fictional sample invoice, taken from the real
 * engine at the fixed sample date (CLAUDE.md rule 1: no figure on the page is typed by hand).
 */
export function landingSample() {
  const input = samplePreviewInput();
  const r = compute(input);
  if (r.status !== "overdue") throw new Error("the landing sample must be overdue");
  const paid = compute({ ...input, payments: [SAMPLE_PAYMENT] });
  if (paid.status !== "overdue") throw new Error("the landing sample with a payment must be overdue");
  const s = sampleExtraction();
  const facts = buildFacts(
    { clientName: s.clientName ?? "", invoiceNumber: s.invoiceNumber ?? "", invoiceDate: s.invoiceDate ?? "", amount: input.amount },
    r,
    SAMPLE_PREVIEW_AS_OF,
  ).strings;
  return { input, r, paid, facts, asOf: SAMPLE_PREVIEW_AS_OF, invoiceDate: input.invoiceDate };
}
