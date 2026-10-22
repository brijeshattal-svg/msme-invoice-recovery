import type { EngineInput } from "./engine";
import type { FormValues } from "./wizard";

/**
 * Validated form -> engine input. Values are only parsed here, never computed:
 * all dates, interest and eligibility come from compute() (CLAUDE.md rule 1).
 * Call only after validateForm() returned no errors.
 */
export function toEngineInput(f: FormValues, asOf: string): EngineInput {
  return {
    amount: Number(f.amount),
    invoiceDate: f.invoiceDate,
    acceptanceDate: f.acceptanceDate,
    agreementDays: f.hasAgreement ? Number(f.agreementDays) : null,
    udyamDate: f.udyamDate,
    asOf,
  };
}
