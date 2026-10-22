// SPRINT_PLAN.md section 2.1: the eight blocker types the classifier may return.
export const BLOCKER_TYPES = [
  "po_missing",
  "approval_pending",
  "missing_documents",
  "invoice_mismatch",
  "payment_scheduled",
  "payment_processing",
  "deliverable_dispute",
  "unclear",
] as const;

export type BlockerType = (typeof BLOCKER_TYPES)[number];
export type Confidence = "high" | "medium" | "low";

export const BLOCKER_LABELS: Record<BlockerType, string> = {
  po_missing: "Missing PO",
  approval_pending: "Pending approval",
  missing_documents: "Missing documents",
  invoice_mismatch: "Invoice mismatch",
  payment_scheduled: "Payment scheduled",
  payment_processing: "Payment processing",
  deliverable_dispute: "Disputed deliverable",
  unclear: "Unclear response",
};

export const isBlockerType = (t: unknown): t is BlockerType =>
  typeof t === "string" && (BLOCKER_TYPES as readonly string[]).includes(t);

/** One blocker after validation: its evidence is a verbatim quote from the client's reply. */
export type Blocker = { type: BlockerType; evidence: string; confidence: Confidence };

/** What the route returns and the screen shows. */
export type BlockerAnalysis = {
  blockers: Blocker[];
  /** A payment date the client committed to, validated (ISO, today or later, quoted in the evidence). */
  promisedDate: string | null;
  /** True when no blocker survived with medium or high confidence: show "Unclear" and ask one question. */
  unclear: boolean;
};
