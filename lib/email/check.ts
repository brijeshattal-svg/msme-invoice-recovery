import { LEGAL_REFERENCES, type FactKey, type Facts } from "./facts";

export type Email = { subject: string; body: string };
export type CheckResult = {
  ok: boolean;
  missing: FactKey[];
  strayNumbers: string[];
  /** Internal field names such as "totalDue" that the model copied into the prose. */
  leakedNames: string[];
  /** Words the spec forbids (docs/LEGAL_RULES_SPEC.md section 8): lawyers, courts, notices, portals... */
  forbidden: string[];
};

// "Never threaten; never mention lawyers, courts or the ODR portal." A live draft titled itself
// "Overdue Payment Notice", which reads like a legal notice, so enforce the rule mechanically.
const FORBIDDEN =
  /\b(lawyers?|advocates?|attorneys?|solicitors?|legal (?:action|notice|proceedings|recourse|steps|remedies)|litigation|sue|suing|courts?|tribunals?|councils?|notices?|complaints?|portal|odr|msefc)\b/gi;

/**
 * The number check (docs/LEGAL_RULES_SPEC.md section 7). Purely mechanical, deterministic:
 * 1. every required fact string appears verbatim in the body;
 * 2. after deleting every approved string (longest first), no digit may remain anywhere.
 * A wrong amount, a rounded "1.2 lakh", a re-formatted date or an invented deadline all
 * leave a digit behind. Known gap: numbers written as words contain no digit.
 */
export function checkEmail(email: Email, facts: Facts): CheckResult {
  const allowed = [...new Set([...Object.values(facts.strings), ...LEGAL_REFERENCES])]
    .filter((s) => s.length > 0)
    .sort((a, b) => b.length - a.length);

  const missing = facts.required.filter((k) => !email.body.includes(facts.strings[k]));

  // Replace with a space so text on either side can't fuse into a new token.
  const scrub = (t: string) => allowed.reduce((acc, a) => acc.split(a).join(" "), t);
  const leftovers = `${scrub(email.subject)}\n${scrub(email.body)}`;
  // \p{Nd} catches every script's decimal digits, not just 0-9.
  const strayNumbers = [...new Set(leftovers.match(/\S*\p{Nd}\S*/gu) ?? [])];

  // Seen live: the model wrote "the lastPayableDate was 23 Aug 2026" and "the totalDue". Digits pass
  // the check above, so reject the camelCase field names themselves (plain words like "amount" and
  // "interest" are legitimate English and are not checked).
  const text = `${email.subject}\n${email.body}`;
  const leakedNames = (Object.keys(facts.strings) as FactKey[]).filter(
    (k) => /[A-Z]/.test(k) && new RegExp(`\\b${k}\\b`).test(text),
  );

  const forbidden = [...new Set((text.match(FORBIDDEN) ?? []).map((w) => w.toLowerCase()))];

  return {
    ok: missing.length === 0 && strayNumbers.length === 0 && leakedNames.length === 0 && forbidden.length === 0,
    missing,
    strayNumbers,
    leakedNames,
    forbidden,
  };
}
