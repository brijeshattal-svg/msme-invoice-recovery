/**
 * Money the client has already paid towards this invoice. `tds` is tax the client deducted at
 * source from that payment; it counts as paid (docs/LEGAL_RULES_SPEC.md section 4a).
 */
export type Payment = { date: string; amount: number; tds: number };

export type EngineInput = {
  /** Invoice total in INR, as confirmed by the founder. */
  amount: number;
  invoiceDate: string;
  acceptanceDate: string;
  /** null = no written agreement. */
  agreementDays: number | null;
  udyamDate: string;
  /** "Today" in Asia/Kolkata; the engine never reads the clock. */
  asOf: string;
  /** Part payments received so far. Absent or empty = nothing paid (the original behaviour). */
  payments?: Payment[];
};

/** Present on a result only when some payment up to asOf was entered. */
export type PaidSoFar = {
  /** Cash received plus TDS deducted, up to asOf. */
  paidSoFar: number;
  /** The TDS part of paidSoFar. */
  tdsSoFar: number;
  /** Invoice amount minus paidSoFar: the part of the invoice still unpaid. */
  unpaidAmount: number;
};

export type RateSegment = { bankRate: number; section16Rate: number; days: number };

export type MonthRow = {
  month: string; // YYYY-MM
  openingBalance: number;
  days: number;
  segments: RateSegment[];
  /** Payments received in this month (only present when there were some). */
  paid?: number;
  interest: number;
  closingBalance: number;
};

export type EngineResult =
  | { status: "udyam_after_invoice" }
  | { status: "rate_history_not_loaded"; lastPayableDate: string; interestStartDate: string }
  | {
      status: "not_yet_due";
      termDays: number;
      capped: boolean;
      lastPayableDate: string;
      interestStartDate: string;
      daysLeft: number;
    } & Partial<PaidSoFar>
  | {
      status: "overdue";
      termDays: number;
      capped: boolean;
      lastPayableDate: string;
      interestStartDate: string;
      daysOverdue: number;
      rows: MonthRow[];
      totalInterest: number;
      totalDue: number;
    } & Partial<PaidSoFar>;
