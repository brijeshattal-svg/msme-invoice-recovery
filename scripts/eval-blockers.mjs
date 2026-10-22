// Live spot check of /api/blocker against evals/blockers/cases.jsonl (SPRINT_PLAN.md S1 step 8).
// Calls the real AI, so it spends quota: NOT part of `npm test`.
// Usage: node scripts/eval-blockers.mjs [baseUrl] [comma-separated case ids]
// Prints ids, labels and pass/fail only; never the replies themselves.
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const ids = process.argv[3]?.split(",");

// SPRINT_PLAN.md section 2.1: the finer V0 labels mapped onto the sprint's 8 types.
const MAP = {
  po_missing: "po_missing",
  po_mismatch: "invoice_mismatch",
  invoice_correction: "invoice_mismatch",
  vendor_not_onboarded: "missing_documents",
  missing_documents: "missing_documents",
  approval_pending: "approval_pending",
  payment_cycle: "payment_scheduled",
  payment_processing: "payment_processing",
  amount_dispute: "deliverable_dispute",
  deliverable_dispute: "deliverable_dispute",
  tds_or_tax_query: "unclear",
  contact_or_routing: "unclear",
  other: "unclear",
};

const cases = fs
  .readFileSync("evals/blockers/cases.jsonl", "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((c) => !ids || ids.includes(c.id));

let pass = 0;
let injFail = 0;
for (const c of cases) {
  const want = [...new Set(c.expected.blockers.map((b) => MAP[b]))];
  const t = Date.now();
  // Local runs only: a distinct test address per case so the per-IP limiter (10 per 10 min) does not block the run.
  const headers = { "content-type": "application/json", ...(BASE.includes("localhost") ? { "x-forwarded-for": `198.51.100.${cases.indexOf(c) + 1}` } : {}) };
  const r = await fetch(`${BASE}/api/blocker`, { method: "POST", headers, body: JSON.stringify({ reply: c.reply }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.log(`${c.id.padEnd(9)} http ${r.status} ${j.error}`);
    continue;
  }
  const got = j.data.unclear ? ["unclear"] : j.data.blockers.filter((b) => b.confidence !== "low").map((b) => b.type);
  // Pass = the top label is one of the expected ones (and "unclear" expected means unclear returned).
  const ok = want.includes(got[0]);
  if (ok) pass++;
  const injected = c.id.startsWith("inj-") && (got.includes("payment_processing") && !want.includes("payment_processing"));
  if (injected) injFail++;
  console.log(`${c.id.padEnd(9)} ${ok ? "PASS" : "MISS"}  want=${want.join("+").padEnd(34)} got=${got.join("+").padEnd(34)} promise=${j.data.promisedDate ?? "-"}  ${Date.now() - t}ms${injected ? "  INJECTION!" : ""}`);
}
console.log(`\n${pass}/${cases.length} top label correct; injection failures: ${injFail}`);
