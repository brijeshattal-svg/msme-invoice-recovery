import type { ConfidenceKey, ExtractedInvoice } from "./ai/schemas";
import { COPY, PAYMENTS } from "./copy";
import { isValidISODate } from "./engine/dates";
import type { EngineInput } from "./engine";
import type { Tone } from "./email/tones";
import { emptyEligibility, type Eligibility } from "./standing";

export type Step = "upload" | "check" | "standing" | "tone" | "send";
export const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "check", label: "Check" },
  { id: "standing", label: "Standing" },
  { id: "tone", label: "Tone" },
  { id: "send", label: "Send" },
];

export type FormValues = {
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  udyamDate: string;
  hasAgreement: boolean;
  agreementDays: string;
  acceptanceDate: string;
  /** Part payments received so far, as typed. Absent or empty = nothing paid. */
  payments?: PaymentRow[];
};
export type FieldKey = keyof FormValues;
/** One part payment as typed in the form; `id` is only a React key. */
export type PaymentRow = { id: string; date: string; amount: string; tds: string };
export type PaymentField = "date" | "amount" | "tds";
/** Most payments one invoice can list; the server enforces the same. */
export const MAX_PAYMENTS = 20;

export type DraftState = {
  status: "idle" | "loading" | "ready";
  subject: string;
  body: string;
  /** "ai" = passed the number check; "template" = standard draft. */
  source: "ai" | "template" | null;
  /** True once the founder edits the text (the automatic check no longer covers it). */
  edited: boolean;
};

export type State = {
  step: Step;
  tone: Tone;
  /** Offer to waive the interest if they pay by the reply-by date (founder's choice, off by default). */
  waiver: boolean;
  draft: DraftState;
  upload: "idle" | "reading" | "error";
  error: string | null;
  form: FormValues;
  /** Fields the AI was unsure about, or could not read. Cleared per field once the founder edits it. */
  flagged: Partial<Record<FieldKey, "missing" | "check">>;
  /** What the invoice itself says, shown read-only. Never turns on the "written agreement" toggle. */
  termsHint: string | null;
  currency: string | null;
  acceptanceEdited: boolean;
  /** Fields filled from the invoice that the AI was sure about: shown with "Read from your invoice". */
  read: Partial<Record<FieldKey, true>>;
  /** Optional answers to "Does the law apply to you?"; they only add hedged notes. */
  eligibility: Eligibility;
  /** A payment the invoice itself shows as made, pre-filled under "Paid so far" for the founder to check. */
  paidHint: number | null;
};

const emptyForm: FormValues = {
  clientName: "",
  invoiceNumber: "",
  invoiceDate: "",
  amount: "",
  udyamDate: "",
  hasAgreement: false,
  agreementDays: "",
  acceptanceDate: "",
};

const emptyDraft: DraftState = { status: "idle", subject: "", body: "", source: null, edited: false };

export const initialState: State = {
  step: "upload",
  tone: "friendly",
  waiver: false,
  draft: emptyDraft,
  upload: "idle",
  error: null,
  form: emptyForm,
  flagged: {},
  termsHint: null,
  currency: null,
  acceptanceEdited: false,
  read: {},
  eligibility: emptyEligibility,
  paidHint: null,
};

export type Action =
  | { type: "reading" }
  | { type: "failed"; message: string }
  | { type: "extracted"; data: ExtractedInvoice }
  | { type: "manual" }
  | { type: "edit"; field: FieldKey; value: string | boolean }
  | { type: "addPayment"; id: string }
  | { type: "editPayment"; id: string; field: PaymentField; value: string }
  | { type: "removePayment"; id: string }
  | { type: "clearPayments" }
  | { type: "eligibility"; field: keyof Eligibility; value: string }
  | { type: "go"; step: Step }
  | { type: "setTone"; tone: Tone }
  | { type: "setWaiver"; on: boolean }
  | { type: "draftLoading" }
  | { type: "drafted"; subject: string; body: string; source: "ai" | "template" }
  | { type: "editDraft"; field: "subject" | "body"; value: string }
  | { type: "reset" };

const MAP: [ConfidenceKey, FieldKey][] = [
  ["clientName", "clientName"],
  ["invoiceNumber", "invoiceNumber"],
  ["invoiceDate", "invoiceDate"],
  ["amountTotal", "amount"],
];

/** Extraction result -> prefilled form + flags for the fields to double-check. */
export function fromExtraction(d: ExtractedInvoice): Pick<State, "form" | "flagged" | "termsHint" | "currency" | "paidHint"> {
  const form: FormValues = {
    ...emptyForm,
    clientName: d.clientName ?? "",
    invoiceNumber: d.invoiceNumber ?? "",
    invoiceDate: d.invoiceDate ?? "",
    amount: d.amountTotal === null ? "" : String(d.amountTotal),
    acceptanceDate: d.invoiceDate ?? "", // defaults to the invoice date
    // The invoice shows money already received: pre-fill it so interest is never claimed on it.
    ...(d.amountPaid ? { payments: [{ id: "from-invoice", date: d.amountPaidDate ?? "", amount: String(d.amountPaid), tds: "" }] } : {}),
  };
  const values: Record<ConfidenceKey, unknown> = {
    clientName: d.clientName,
    invoiceNumber: d.invoiceNumber,
    invoiceDate: d.invoiceDate,
    amountTotal: d.amountTotal,
    paymentTermsDays: d.paymentTermsDays,
  };
  const flagged: State["flagged"] = {};
  for (const [ck, fk] of MAP) {
    if (values[ck] === null) flagged[fk] = "missing";
    else if (d.confidence[ck] === "low") flagged[fk] = "check";
  }
  const termsHint = d.paymentTermsText ?? (d.paymentTermsDays !== null ? `Net ${d.paymentTermsDays}` : null);
  return { form, flagged, termsHint, currency: d.currency, paidHint: d.amountPaid ?? null };
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "reading":
      return { ...s, upload: "reading", error: null };
    case "failed":
      return { ...s, upload: "error", error: a.message };
    case "extracted": {
      const x = fromExtraction(a.data);
      const read: State["read"] = {};
      for (const [, fk] of MAP) if (String(x.form[fk]).trim() !== "" && !x.flagged[fk]) read[fk] = true;
      return { ...initialState, step: "check", ...x, read };
    }
    case "manual":
      return { ...initialState, step: "check" };
    case "edit": {
      const form = { ...s.form, [a.field]: a.value } as FormValues;
      let acceptanceEdited = s.acceptanceEdited;
      if (a.field === "acceptanceDate") acceptanceEdited = true;
      if (a.field === "invoiceDate" && !acceptanceEdited) form.acceptanceDate = String(a.value);
      const flagged = { ...s.flagged };
      delete flagged[a.field];
      const read = { ...s.read };
      delete read[a.field];
      // Re-entering the amount is the founder confirming it is in rupees (see validateForm).
      const currency = a.field === "amount" && s.currency !== null && s.currency !== "INR" ? "INR" : s.currency;
      return { ...s, form, flagged, read, acceptanceEdited, currency };
    }
    case "addPayment": {
      const rows = s.form.payments ?? [];
      if (rows.length >= MAX_PAYMENTS) return s;
      return { ...s, form: { ...s.form, payments: [...rows, { id: a.id, date: "", amount: "", tds: "" }] } };
    }
    case "editPayment":
      return {
        ...s,
        form: { ...s.form, payments: (s.form.payments ?? []).map((p) => (p.id === a.id ? { ...p, [a.field]: a.value } : p)) },
      };
    case "removePayment":
      return { ...s, form: { ...s.form, payments: (s.form.payments ?? []).filter((p) => p.id !== a.id) } };
    case "clearPayments":
      return { ...s, form: { ...s.form, payments: [] } };
    case "eligibility":
      return { ...s, eligibility: { ...s.eligibility, [a.field]: a.value } as Eligibility };
    case "go":
      return { ...s, step: a.step };
    case "setWaiver":
      return { ...s, waiver: a.on };
    case "setTone":
      return { ...s, tone: a.tone };
    case "draftLoading":
      return { ...s, step: "send", draft: { ...emptyDraft, status: "loading" } };
    case "drafted":
      return { ...s, draft: { status: "ready", subject: a.subject, body: a.body, source: a.source, edited: false } };
    case "editDraft":
      return { ...s, draft: { ...s.draft, [a.field]: a.value, edited: true } };
    case "reset":
      return initialState;
  }
}

export type FormErrors = Partial<Record<FieldKey, string>>;

/** ₹1,000 crore. Far above any one invoice from a micro or small enterprise; catches typos like extra zeros. */
export const MAX_AMOUNT = 10_000_000_000;

/**
 * Pure validation; `today` is todayIST(). `currency` is what the invoice was read as: anything
 * other than INR blocks until the founder re-enters the amount (editing it sets currency to INR).
 */
export function validateForm(f: FormValues, today: string, currency: string | null = null): FormErrors {
  const e: FormErrors = {};
  if (!f.clientName.trim()) e.clientName = "Enter the client's name.";
  if (!f.invoiceNumber.trim()) e.invoiceNumber = "Enter the invoice number.";
  if (!isValidISODate(f.invoiceDate)) e.invoiceDate = "Enter a valid invoice date.";
  else if (f.invoiceDate > today) e.invoiceDate = "The invoice date can't be in the future.";
  const amount = Number(f.amount);
  if (f.amount.trim() === "" || !Number.isFinite(amount) || amount <= 0) e.amount = "Enter the invoice amount in rupees.";
  else if (currency !== null && currency !== "INR") e.amount = COPY.notRupees;
  // Paise only: a third decimal would be shown rounded in the email but used unrounded in the maths.
  else if (!/^\d+(\.\d{1,2})?$/.test(f.amount.trim())) e.amount = "Use digits only, with at most 2 decimal places (paise).";
  else if (amount > MAX_AMOUNT) e.amount = "That amount looks too large. Please check it.";
  if (!isValidISODate(f.udyamDate)) e.udyamDate = "Enter your Udyam registration date.";
  else if (f.udyamDate > today) e.udyamDate = "The registration date can't be in the future.";
  if (f.hasAgreement) {
    const days = Number(f.agreementDays);
    if (f.agreementDays.trim() === "" || !Number.isInteger(days) || days < 0 || days > 365) {
      e.agreementDays = "Enter the agreed number of days (0 to 365).";
    }
  }
  if (!isValidISODate(f.acceptanceDate)) e.acceptanceDate = "Enter a valid acceptance date.";
  else if (f.acceptanceDate > today) e.acceptanceDate = "The acceptance date can't be in the future.";
  const pay = validatePayments(f, today);
  if (pay) e.payments = pay;
  return e;
}

const PAISE = /^\d+(\.\d{1,2})?$/;

/**
 * The first problem with the part payments, or null. Each needs a date on or before today (an
 * advance may predate the invoice), and a received amount and/or TDS in rupees (paise at most); together they must stay
 * below the invoice amount (fully paid invoices are out of scope for now).
 */
export function validatePayments(f: FormValues, today: string): string | null {
  const rows = f.payments ?? [];
  if (rows.length > MAX_PAYMENTS) return PAYMENTS.errTooMany;
  let total = 0;
  for (const [i, p] of rows.entries()) {
    const n = i + 1;
    if (!isValidISODate(p.date)) return PAYMENTS.errDate(n);
    // An advance is often paid before the invoice is raised, so earlier dates are allowed.
    if (p.date > today) return PAYMENTS.errFuture(n);
    const amount = p.amount.trim();
    const tds = p.tds.trim();
    if ((amount !== "" && !PAISE.test(amount)) || (tds !== "" && !PAISE.test(tds))) return PAYMENTS.errAmount(n);
    const credit = Number(amount || 0) + Number(tds || 0);
    if (!(credit > 0)) return PAYMENTS.errZero(n);
    total += credit;
  }
  const invoice = Number(f.amount);
  if (rows.length > 0 && Number.isFinite(invoice) && invoice > 0 && Math.round(total * 100) >= Math.round(invoice * 100)) return PAYMENTS.errTooMuch;
  return null;
}

/**
 * Hard-coded stand-in for public/sample/sample-invoice.pdf, used if the file or the AI call is
 * unavailable. Must match the PDF (scripts/make-sample-invoice.mjs); the date is fixed, not
 * relative to today, so both always agree. Fictional parties only.
 */
/** Fixed date the landing's sample card is worked out to, so the example never changes. */
export const SAMPLE_PREVIEW_AS_OF = "2026-10-22";

/** Engine input for the landing's sample card: the sample invoice, no agreement, accepted on the invoice date. */
export function samplePreviewInput(): EngineInput {
  const s = sampleExtraction();
  return {
    amount: s.amountTotal ?? 0,
    invoiceDate: s.invoiceDate ?? "",
    acceptanceDate: s.invoiceDate ?? "",
    agreementDays: null,
    udyamDate: "2024-01-15",
    asOf: SAMPLE_PREVIEW_AS_OF,
  };
}

export function sampleExtraction(): ExtractedInvoice {
  return {
    isInvoice: true,
    clientName: "Northwind Test Industries Pvt Ltd",
    invoiceNumber: "BDS/2026/0142",
    invoiceDate: "2026-08-08",
    amountTotal: 236000,
    currency: "INR",
    paymentTermsDays: 30,
    paymentTermsText: "Net 30",
    confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "high" },
  };
}
