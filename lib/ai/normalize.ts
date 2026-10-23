import { isValidISODate } from "@/lib/engine/dates";
import type { ExtractedInvoice } from "./schemas";

const MAX_LEN = 200;

/** Strip control characters, collapse whitespace, cap length. Used on every string from the model. */
export function cleanString(s: string | null): string | null {
  if (s === null) return null;
  const out = s
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LEN);
  return out === "" ? null : out;
}

/**
 * Post-parse hardening (CLAUDE.md rule 6): the model output is untrusted.
 * Invalid dates, non-positive amounts and implausible terms become null + "low".
 * A non-invoice has every field blanked.
 */
export function normalizeExtraction(raw: ExtractedInvoice): ExtractedInvoice {
  if (!raw.isInvoice) {
    return {
      isInvoice: false,
      clientName: null,
      invoiceNumber: null,
      invoiceDate: null,
      amountTotal: null,
      currency: null,
      paymentTermsDays: null,
      paymentTermsText: null,
      amountPaid: null,
      amountPaidDate: null,
      confidence: {
        clientName: "low",
        invoiceNumber: "low",
        invoiceDate: "low",
        amountTotal: "low",
        paymentTermsDays: "low",
      },
    };
  }

  const confidence = { ...raw.confidence };

  const clientName = cleanString(raw.clientName);
  if (clientName === null) confidence.clientName = "low";

  // Seen live: "#TCC/26-27/031". A label in front would end up in the email.
  const invoiceNumber = cleanString(raw.invoiceNumber?.replace(/^\s*(?:#|no\s*[.:])\s*/i, "") ?? null);
  if (invoiceNumber === null) confidence.invoiceNumber = "low";

  let invoiceDate = cleanString(raw.invoiceDate);
  if (invoiceDate !== null && !isValidISODate(invoiceDate)) invoiceDate = null;
  if (invoiceDate === null) confidence.invoiceDate = "low";

  let amountTotal = raw.amountTotal;
  if (amountTotal !== null && !(Number.isFinite(amountTotal) && amountTotal > 0)) amountTotal = null;
  if (amountTotal === null) confidence.amountTotal = "low";
  else amountTotal = Math.round(amountTotal * 100) / 100;

  let paymentTermsDays = raw.paymentTermsDays;
  if (
    paymentTermsDays !== null &&
    !(Number.isInteger(paymentTermsDays) && paymentTermsDays >= 0 && paymentTermsDays <= 365)
  ) {
    paymentTermsDays = null;
    confidence.paymentTermsDays = "low";
  }

  const currency = cleanString(raw.currency)?.toUpperCase() ?? null;

  // A payment the invoice shows as already made: only a positive amount below the total counts.
  let amountPaid = raw.amountPaid ?? null;
  if (amountPaid !== null && !(Number.isFinite(amountPaid) && amountPaid > 0 && (amountTotal === null || amountPaid < amountTotal))) amountPaid = null;
  if (amountPaid !== null) amountPaid = Math.round(amountPaid * 100) / 100;
  let amountPaidDate = cleanString(raw.amountPaidDate ?? null);
  if (amountPaid === null || (amountPaidDate !== null && !isValidISODate(amountPaidDate))) amountPaidDate = null;

  return {
    isInvoice: true,
    clientName,
    invoiceNumber,
    invoiceDate,
    amountTotal,
    currency,
    paymentTermsDays,
    paymentTermsText: cleanString(raw.paymentTermsText),
    amountPaid,
    amountPaidDate,
    confidence,
  };
}
