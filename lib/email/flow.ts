import { compute } from "@/lib/engine";
import { toEngineInput } from "@/lib/standing";
import type { FormValues } from "@/lib/wizard";
import { checkEmail } from "./check";
import { buildFacts, type Facts, type Overdue } from "./facts";
import { buildTemplate } from "./template";
import type { Tone } from "./tones";

export type DraftPayload = {
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  acceptanceDate: string;
  agreementDays: number | null;
  udyamDate: string;
  tone: Tone;
};
export type ServerDraft = { subject: string; body: string; source: "ai" | "template" };
export type DraftFetcher = (payload: DraftPayload) => Promise<ServerDraft>;
export type Drafted = ServerDraft & { facts: Facts };

/** Facts for the confirmed form, or null if the invoice is not overdue today. */
export function factsFromForm(form: FormValues, today: string): Facts | null {
  const r = compute(toEngineInput(form, today));
  if (r.status !== "overdue") return null;
  return buildFacts(
    { clientName: form.clientName, invoiceNumber: form.invoiceNumber, invoiceDate: form.invoiceDate, amount: Number(form.amount) },
    r as Overdue,
  );
}

export function payloadFromForm(form: FormValues, tone: Tone): DraftPayload {
  const e = toEngineInput(form, "");
  return {
    clientName: form.clientName,
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    amount: e.amount,
    acceptanceDate: form.acceptanceDate,
    agreementDays: e.agreementDays,
    udyamDate: form.udyamDate,
    tone,
  };
}

/**
 * Gets the email: ask the server, then re-run the number check here before trusting the answer
 * (so the "numbers checked" chip is never shown for text that did not pass). Any failure, or a
 * draft that does not pass, yields the deterministic template: the journey never dead-ends.
 * Returns null only when the invoice is not overdue today.
 */
export async function getDraft(
  form: FormValues,
  tone: Tone,
  today: string,
  fetchDraft: DraftFetcher,
): Promise<Drafted | null> {
  const facts = factsFromForm(form, today);
  if (!facts) return null;
  try {
    const d = await fetchDraft(payloadFromForm(form, tone));
    if (checkEmail(d, facts).ok) return { subject: d.subject, body: d.body, source: d.source, facts };
  } catch {
    // network error, rate limit, server error: fall through to the template
  }
  return { ...buildTemplate(facts, tone), source: "template", facts };
}
