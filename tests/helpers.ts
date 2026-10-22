import { buildFacts, type Facts, type Overdue } from "@/lib/email/facts";
import { compute } from "@/lib/engine";
import { toEngineInput } from "@/lib/standing";
import type { FormValues } from "@/lib/wizard";

export const TODAY = "2026-10-22";

// Fictional invoice dated 8 Aug 2026, no written agreement: due 23 Aug, 60 days overdue on TODAY.
export const FORM: FormValues = {
  clientName: "Northwind Test Industries Pvt Ltd",
  invoiceNumber: "BDS/2026/0142",
  invoiceDate: "2026-08-08",
  amount: "236000",
  udyamDate: "2024-06-01",
  hasAgreement: false,
  agreementDays: "",
  acceptanceDate: "2026-08-08",
};

export function overdueFor(form: FormValues, today = TODAY): Overdue {
  const r = compute(toEngineInput(form, today));
  if (r.status !== "overdue") throw new Error(`fixture is not overdue: ${r.status}`);
  return r;
}

export function factsFor(form: FormValues = FORM, today = TODAY): Facts {
  return buildFacts(
    { clientName: form.clientName, invoiceNumber: form.invoiceNumber, invoiceDate: form.invoiceDate, amount: Number(form.amount) },
    overdueFor(form, today),
    today,
  );
}
