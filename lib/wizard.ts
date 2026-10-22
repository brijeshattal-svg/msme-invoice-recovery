import type { ConfidenceKey, ExtractedInvoice } from "./ai/schemas";
import { COPY } from "./copy";
import { isValidISODate } from "./engine/dates";
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
};
export type FieldKey = keyof FormValues;

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
  /** Optional answers to "Does the law apply to you?"; they only add hedged notes. */
  eligibility: Eligibility;
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
  draft: emptyDraft,
  upload: "idle",
  error: null,
  form: emptyForm,
  flagged: {},
  termsHint: null,
  currency: null,
  acceptanceEdited: false,
  eligibility: emptyEligibility,
};

export type Action =
  | { type: "reading" }
  | { type: "failed"; message: string }
  | { type: "extracted"; data: ExtractedInvoice }
  | { type: "manual" }
  | { type: "edit"; field: FieldKey; value: string | boolean }
  | { type: "eligibility"; field: keyof Eligibility; value: string }
  | { type: "go"; step: Step }
  | { type: "setTone"; tone: Tone }
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
export function fromExtraction(d: ExtractedInvoice): Pick<State, "form" | "flagged" | "termsHint" | "currency"> {
  const form: FormValues = {
    ...emptyForm,
    clientName: d.clientName ?? "",
    invoiceNumber: d.invoiceNumber ?? "",
    invoiceDate: d.invoiceDate ?? "",
    amount: d.amountTotal === null ? "" : String(d.amountTotal),
    acceptanceDate: d.invoiceDate ?? "", // defaults to the invoice date
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
  return { form, flagged, termsHint, currency: d.currency };
}

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "reading":
      return { ...s, upload: "reading", error: null };
    case "failed":
      return { ...s, upload: "error", error: a.message };
    case "extracted":
      return { ...initialState, step: "check", ...fromExtraction(a.data) };
    case "manual":
      return { ...initialState, step: "check" };
    case "edit": {
      const form = { ...s.form, [a.field]: a.value } as FormValues;
      let acceptanceEdited = s.acceptanceEdited;
      if (a.field === "acceptanceDate") acceptanceEdited = true;
      if (a.field === "invoiceDate" && !acceptanceEdited) form.acceptanceDate = String(a.value);
      const flagged = { ...s.flagged };
      delete flagged[a.field];
      // Re-entering the amount is the founder confirming it is in rupees (see validateForm).
      const currency = a.field === "amount" && s.currency !== null && s.currency !== "INR" ? "INR" : s.currency;
      return { ...s, form, flagged, acceptanceEdited, currency };
    }
    case "eligibility":
      return { ...s, eligibility: { ...s.eligibility, [a.field]: a.value } as Eligibility };
    case "go":
      return { ...s, step: a.step };
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
  if (!isValidISODate(f.udyamDate)) e.udyamDate = "Enter your Udyam registration date.";
  else if (f.udyamDate > today) e.udyamDate = "The registration date can't be in the future.";
  if (f.hasAgreement) {
    const days = Number(f.agreementDays);
    if (f.agreementDays.trim() === "" || !Number.isInteger(days) || days < 0 || days > 365) {
      e.agreementDays = "Enter the agreed number of days (0 to 365).";
    }
  }
  if (!isValidISODate(f.acceptanceDate)) e.acceptanceDate = "Enter a valid acceptance date.";
  return e;
}

/**
 * Hard-coded stand-in for public/sample/sample-invoice.pdf, used if the file or the AI call is
 * unavailable. Must match the PDF (scripts/make-sample-invoice.mjs); the date is fixed, not
 * relative to today, so both always agree. Fictional parties only.
 */
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
