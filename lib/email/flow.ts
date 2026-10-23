import { compute } from "@/lib/engine";
import { toEngineInput } from "@/lib/standing";
import type { FormValues } from "@/lib/wizard";
import { checkEmail } from "./check";
import { buildFacts, factsForTone, type Facts, type Overdue } from "./facts";
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
  /** The founder chose to offer waiving the interest (never applies to the gentle check-in). */
  waiver?: boolean;
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
    today,
  );
}

export function payloadFromForm(form: FormValues, tone: Tone, waiver = false): DraftPayload {
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
    ...(waiver ? { waiver: true } : {}),
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
  waiver = false,
): Promise<Drafted | null> {
  const base = factsFromForm(form, today);
  if (!base) return null;
  const facts = factsForTone(base, tone, { waiver });
  try {
    const d = await fetchDraft(payloadFromForm(form, tone, waiver));
    if (checkEmail(d, facts).ok) return { subject: d.subject, body: d.body, source: d.source, facts };
  } catch {
    // network error, rate limit, server error: fall through to the template
  }
  return { ...buildTemplate(facts, tone), source: "template", facts };
}
