import { addDays } from "@/lib/engine";
import type { Facts } from "./facts";
import type { Tone } from "./tones";

// F2: WhatsApp text and the "If they don't reply" plan. Built only from approved fact strings,
// so every digit passes checkEmail. Nothing is scheduled, stored or sent by the app.

/** Short plain-text message for WhatsApp: the same facts as the email, no new numbers. */
export function whatsappText(facts: Facts): string {
  const f = facts.strings;
  return [
    `Hi ${f.clientName} team, a quick reminder about invoice ${f.invoiceNumber} dated ${f.invoiceDate} for ${f.amount}.`,
    `It was due by ${f.lastPayableDate} and is now ${f.daysOverdue} overdue. Under Section 16 of the MSMED Act, 2006, interest of ${f.interest} may be owed so far, so the total now due is ${f.totalDue}.`,
    `Could you share the expected payment date? Thank you.`,
    `[Your name]`,
  ].join("\n\n");
}

/** The next, slightly firmer tone after this one. The ladder ends at the last friendly reminder. */
export const NEXT_TONE: Record<Tone, Tone> = {
  relationship: "friendly",
  friendly: "firm",
  firm: "lastReminder",
  finance: "formal",
  formal: "lastReminder",
  lastReminder: "lastReminder",
};

/** Days after today for the suggested sends: this email, a follow-up, a last reminder. */
export const FOLLOW_UP_DAYS = [0, 7, 15] as const;

export type FollowUpStep = { day: number; sendOn: string; tone: Tone };

/**
 * Suggested send dates (ISO) and tones, starting from the tone the founder chose: one step firmer
 * after a week (or the same tone again if the next step would already be the last reminder), and
 * the last friendly reminder at day 15.
 */
export function followUpPlan(today: string, chosen: Tone): FollowUpStep[] {
  const next = NEXT_TONE[chosen];
  const second = next === "lastReminder" ? chosen : next;
  const tones: Tone[] = [chosen, second, "lastReminder"];
  return FOLLOW_UP_DAYS.map((day, i) => ({ day, sendOn: addDays(today, day), tone: tones[i] }));
}
