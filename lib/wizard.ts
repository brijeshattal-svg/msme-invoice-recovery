import type { ConfidenceKey, ExtractedInvoice } from "./ai/schemas";
import { addDays, isValidISODate } from "./engine/dates";

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

export type State = {
  step: Step;
  upload: "idle" | "reading" | "error";
  error: string | null;
  form: FormValues;
  /** Fields the AI was unsure about, or could not read. Cleared per field once the founder edits it. */
  flagged: Partial<Record<FieldKey, "missing" | "check">>;
  /** What the invoice itself says, shown read-only. Never turns on the "written agreement" toggle. */
  termsHint: string | null;
  currency: string | null;
  acceptanceEdited: boolean;
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

export const initialState: State = {
  step: "upload",
  upload: "idle",
  error: null,
  form: emptyForm,
  flagged: {},
  termsHint: null,
  currency: null,
  acceptanceEdited: false,
};

export type Action =
  | { type: "reading" }
  | { type: "failed"; message: string }
  | { type: "extracted"; data: ExtractedInvoice }
  | { type: "manual" }
  | { type: "edit"; field: FieldKey; value: string | boolean }
  | { type: "go"; step: Step }
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
      return { ...s, form, flagged, acceptanceEdited };
    }
    case "go":
      return { ...s, step: a.step };
    case "reset":
      return initialState;
  }
}

export type FormErrors = Partial<Record<FieldKey, string>>;

/** Pure validation; `today` is todayIST(). Phase 3 feeds the validated values to the engine. */
export function validateForm(f: FormValues, today: string): FormErrors {
  const e: FormErrors = {};
  if (!f.clientName.trim()) e.clientName = "Enter the client's name.";
  if (!f.invoiceNumber.trim()) e.invoiceNumber = "Enter the invoice number.";
  if (!isValidISODate(f.invoiceDate)) e.invoiceDate = "Enter a valid invoice date.";
  else if (f.invoiceDate > today) e.invoiceDate = "The invoice date can't be in the future.";
  const amount = Number(f.amount);
  if (f.amount.trim() === "" || !Number.isFinite(amount) || amount <= 0) e.amount = "Enter the invoice amount in rupees.";
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

/** Hard-coded stand-in for the sample invoice if the real file or the AI call is unavailable. */
export function sampleExtraction(today: string): ExtractedInvoice {
  return {
    isInvoice: true,
    clientName: "Northwind Test Industries Pvt Ltd",
    invoiceNumber: "BDS/2026/0142",
    invoiceDate: addDays(today, -75),
    amountTotal: 236000,
    currency: "INR",
    paymentTermsDays: 30,
    paymentTermsText: "Net 30",
    confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "high" },
  };
}
