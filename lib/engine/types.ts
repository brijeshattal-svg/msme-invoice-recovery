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
};

export type RateSegment = { bankRate: number; section16Rate: number; days: number };

export type MonthRow = {
  month: string; // YYYY-MM
  openingBalance: number;
  days: number;
  segments: RateSegment[];
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
    }
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
    };
