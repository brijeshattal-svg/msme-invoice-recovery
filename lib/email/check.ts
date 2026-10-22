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
  /** Approved figures used in the wrong place, e.g. the total written as the interest. */
  misplaced: string[];
};

// Numbers written as words carry no digit, so the digit rule alone misses "thirty days" or
// "2.4 lakh" written as "two lakh". "one" is left out: it is everyday English ("one thing").
const NUMBER_WORDS =
  /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakhs?|lacs?|crores?|million|billion)\b/gi;
// Describing the law is not a figure: Section 16 is "three times the Bank Rate".
const ALLOWED_NUMBER_PHRASES = ["three times"];

// Which money figure a nearby label points at. Used to catch an approved figure in the wrong
// role, e.g. "interest so far is <total>". Only the closest label before the figure counts.
type Role = "interest" | "total" | "amount";
const ROLE_WORDS: [RegExp, Role][] = [
  [/\binterest\b/gi, "interest"],
  [/\b(total|outstanding)\b/gi, "total"],
  [/\b(amount|invoiced?)\b/gi, "amount"],
];
const WINDOW = 40;

function lastRole(text: string): Role | null {
  let best: { at: number; role: Role } | null = null;
  for (const [re, role] of ROLE_WORDS) {
    for (const m of text.matchAll(re)) if (!best || m.index! >= best.at) best = { at: m.index!, role };
  }
  return best?.role ?? null;
}

/** Each money fact must not sit right after a label that belongs to another money fact. */
function findMisplaced(text: string, facts: Facts): string[] {
  const f = facts.strings;
  const money: [string, Role][] = (
    [
      [f.interest, "interest"],
      [f.totalDue, "total"],
      [f.amount, "amount"],
    ] as [string, Role][]
  ).filter(([s]) => s.length > 0);
  // Two facts can share one string (e.g. tiny interest): then the role can't be told apart.
  if (new Set(money.map(([s]) => s)).size < money.length) return [];
  const out: string[] = [];
  for (const [value, role] of money) {
    let from = 0;
    for (let i = text.indexOf(value, from); i >= 0; i = text.indexOf(value, from)) {
      from = i + value.length;
      let before = text.slice(Math.max(0, i - WINDOW), i);
      before = before.slice(before.lastIndexOf("\n") + 1); // same line only
      for (const [other] of money) before = before.split(other).join(" ");
      const label = lastRole(before);
      // A combined label ("interest amount", "outstanding invoice amount") still names the right figure.
      const own = role === "interest" ? /\binterest\b/i : role === "total" ? /\b(total|outstanding)\b/i : null;
      const wrong = label !== null && label !== role && !(label === "amount" && own !== null && own.test(before));
      if (wrong) out.push(`${value} (written as the ${label})`);
    }
  }
  return [...new Set(out)];
}

// "Never threaten; never mention lawyers, courts or the ODR portal." A live draft titled itself
// "Overdue Payment Notice", which reads like a legal notice, so enforce the rule mechanically.
const FORBIDDEN =
  /\b(lawyers?|advocates?|attorneys?|solicitors?|legal (?:action|notice|proceedings|recourse|steps|remedies)|litigation|sue|suing|courts?|tribunals?|councils?|notices?|complaints?|portal|odr|msefc)\b/gi;

/**
 * The number check (docs/LEGAL_RULES_SPEC.md section 7). Purely mechanical, deterministic:
 * 1. every required fact string appears verbatim in the body;
 * 2. after deleting every approved string (longest first), no digit may remain anywhere.
 * A wrong amount, a rounded "1.2 lakh", a re-formatted date or an invented deadline all
 * leave a digit behind. Numbers written as words ("thirty days", "two lakh") are rejected too,
 * and an approved money figure placed under another figure's label is reported as misplaced.
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
  const digits = leftovers.match(/\S*\p{Nd}\S*/gu) ?? [];
  const wordy = ALLOWED_NUMBER_PHRASES.reduce((acc, p) => acc.replace(new RegExp(p, "gi"), " "), leftovers);
  const words = (wordy.match(NUMBER_WORDS) ?? []).map((w) => w.toLowerCase());
  const strayNumbers = [...new Set([...digits, ...words])];

  // Seen live: the model wrote "the lastPayableDate was 23 Aug 2026" and "the totalDue". Digits pass
  // the check above, so reject the camelCase field names themselves (plain words like "amount" and
  // "interest" are legitimate English and are not checked).
  const text = `${email.subject}\n${email.body}`;
  const leakedNames = (Object.keys(facts.strings) as FactKey[]).filter(
    (k) => /[A-Z]/.test(k) && new RegExp(`\\b${k}\\b`).test(text),
  );

  // Checked outside the approved strings, so a client really named "Courtyard Notice Media" (which
  // the founder confirmed) does not fail every draft; the model's own words are still checked.
  const forbidden = [...new Set((leftovers.match(FORBIDDEN) ?? []).map((w) => w.toLowerCase()))];
  const misplaced = findMisplaced(`${email.subject}\n${email.body}`, facts);

  return {
    ok:
      missing.length === 0 && strayNumbers.length === 0 && leakedNames.length === 0 && forbidden.length === 0 && misplaced.length === 0,
    missing,
    strayNumbers,
    leakedNames,
    forbidden,
    misplaced,
  };
}
