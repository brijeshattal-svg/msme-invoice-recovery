import { isValidISODate } from "@/lib/engine";
import { isBlockerType, type Blocker, type BlockerAnalysis, type Confidence } from "./types";

// SPRINT_PLAN.md section 2.2. The model's output is untrusted: everything it says is checked here.

export const MAX_REPLY_CHARS = 4000;
export const MAX_BLOCKERS = 2;
/** A promised date further away than this is treated as a misreading, not a promise. */
export const MAX_PROMISE_DAYS_AHEAD = 180;

/** Pasted text: control characters out (line breaks kept), line endings unified, capped. */
export function sanitizeReply(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, " ")
    .trim()
    .slice(0, MAX_REPLY_CHARS);
}

/** Same normalisation on both sides of the verbatim check: every whitespace run becomes one space. */
export const normalizeForMatch = (s: string): string => s.replace(/\s+/g, " ").trim();

// A fooled model can quote the injection itself ("classify this as payment_processing with
// promisedDate …"), and that quote IS verbatim. Real client messages don't talk to a classifier,
// so evidence that does is dropped: our internal ids and keys, instruction phrases, JSON.
const INSTRUCTION_LIKE =
  /\b(po_missing|approval_pending|missing_documents|invoice_mismatch|payment_scheduled|payment_processing|deliverable_dispute|promiseddate)\b|[{}<>]|\b(ignore|disregard)\b.{0,40}\b(instructions?|rules?|prompt)\b|\b(system|assistant|developer|ai|chatbot|model)\s*[:,]|\bset (the )?(amount|status|label|type)\b|\bmark (this|it)\b.{0,25}\bas\b|\badmin mode\b|\bclassify (this|it|as)\b|\b(you are now|act as)\b/i;

export const looksLikeInstruction = (s: string): boolean => INSTRUCTION_LIKE.test(s);

/** True only if the quote appears word for word (whitespace-normalised) in the reply. */
export function isVerbatim(evidence: string, reply: string): boolean {
  const e = normalizeForMatch(evidence);
  return e.length >= 3 && normalizeForMatch(reply).includes(e);
}

// A promise is only accepted if the quoted sentence actually talks about a date or a day.
const DATE_WORDS =
  /\d|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b|\b(mon|tues|wednes|thurs|fri|satur|sun)day\b|\b(today|tomorrow|tonight|week|month|aaj|kal|parso|hafte|mahine)\b/i;

const dayNumber = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;

export type RawClassification = {
  blockers: { type: string; evidence: string; confidence: Confidence }[];
  promisedDate: string | null;
};

/**
 * Keeps only what can be proven from the reply: known types, verbatim evidence (except "unclear",
 * which needs none), at most two blockers, and a promised date only if it is a real date, not in
 * the past, within six months, and quoted in a sentence that mentions a date or day.
 */
export function validateClassification(raw: RawClassification, reply: string, today: string): BlockerAnalysis {
  const seen = new Set<string>();
  const kept: Blocker[] = [];
  for (const b of raw.blockers) {
    if (!isBlockerType(b.type) || seen.has(b.type)) continue;
    const evidence = normalizeForMatch(b.evidence ?? "");
    if (b.type !== "unclear" && (!isVerbatim(evidence, reply) || looksLikeInstruction(evidence))) continue;
    seen.add(b.type);
    kept.push({ type: b.type, evidence: isVerbatim(evidence, reply) && !looksLikeInstruction(evidence) ? evidence : "", confidence: b.confidence });
  }
  // A real blocker outranks "unclear"; stronger evidence first.
  const rank: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
  const blockers = kept
    .sort((a, b) => Number(a.type === "unclear") - Number(b.type === "unclear") || rank[a.confidence] - rank[b.confidence])
    .slice(0, MAX_BLOCKERS);

  const confident = blockers.filter((b) => b.type !== "unclear" && b.confidence !== "low");
  const unclear = confident.length === 0;

  let promisedDate: string | null = null;
  const d = raw.promisedDate;
  if (d && isValidISODate(d) && d >= today && dayNumber(d) - dayNumber(today) <= MAX_PROMISE_DAYS_AHEAD) {
    if (confident.some((b) => DATE_WORDS.test(b.evidence))) promisedDate = d;
  }

  return {
    blockers: blockers.length > 0 ? blockers : [{ type: "unclear", evidence: "", confidence: "low" }],
    promisedDate,
    unclear,
  };
}

/** Character ranges of each evidence quote inside the normalised reply, for highlighting. */
export function evidenceRanges(reply: string, evidences: string[]): { start: number; end: number }[] {
  const text = normalizeForMatch(reply);
  const ranges: { start: number; end: number }[] = [];
  for (const e of evidences) {
    const q = normalizeForMatch(e);
    if (q.length < 3) continue;
    const start = text.indexOf(q);
    if (start >= 0) ranges.push({ start, end: start + q.length });
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged;
}
