import { z } from "zod";

const Confidence = z.enum(["high", "low"]);

/** IMPLEMENTATION_PLAN.md section 5.1. null + "low" means "unclear, leave blank for the founder". */
export const ExtractedInvoiceSchema = z.object({
  isInvoice: z.boolean(),
  clientName: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(), // ISO YYYY-MM-DD
  amountTotal: z.number().nullable(), // total payable incl. tax, INR
  currency: z.string().nullable(),
  paymentTermsDays: z.number().nullable(),
  paymentTermsText: z.string().nullable(),
  confidence: z.object({
    clientName: Confidence,
    invoiceNumber: Confidence,
    invoiceDate: Confidence,
    amountTotal: Confidence,
    paymentTermsDays: Confidence,
  }),
});

export type ExtractedInvoice = z.infer<typeof ExtractedInvoiceSchema>;
export type ConfidenceKey = keyof ExtractedInvoice["confidence"];

/** SPRINT_PLAN.md section 2.2: the blocker classifier's raw answer. Validated again in lib/blockers/validate.ts. */
export const BlockerClassificationSchema = z.object({
  blockers: z
    .array(
      z.object({
        type: z.string().max(40),
        evidence: z.string().max(1000),
        confidence: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(5),
  promisedDate: z.string().max(20).nullable(),
});

export type BlockerClassification = z.infer<typeof BlockerClassificationSchema>;
