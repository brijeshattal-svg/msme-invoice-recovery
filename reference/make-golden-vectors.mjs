// Generates docs/golden-vectors.json from the reference engine. Run: node reference/make-golden-vectors.mjs
import { compute } from './msme-engine.reference.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const base = { invoiceDate: '2025-01-01', udyamDate: '2024-06-01', agreementDays: null };
const cases = [
  { id: 'one-day-hand-check', note: '1 day overdue at 16.50% on 100000: 100000*0.165/365 = 45.205... => 45.21 (hand-checkable)',
    input: { ...base, amount: 100000, invoiceDate: '2026-01-01', acceptanceDate: '2026-01-01', asOf: '2026-01-17' } },
  { id: 'single-month-no-agreement', note: 'No agreement => 15-day rule, interest within one month at one rate',
    input: { ...base, amount: 100000, invoiceDate: '2026-01-01', acceptanceDate: '2026-01-01', asOf: '2026-01-31' } },
  { id: 'rate-change-crossing-7-oct-2026', note: 'Crosses 7 Oct 2026: 16.50% before, 17.25% from that day',
    input: { ...base, amount: 250000, invoiceDate: '2026-08-01', acceptanceDate: '2026-08-01', asOf: '2026-10-22' } },
  { id: 'multi-month-compounding', note: 'Several full months => monthly rests compound',
    input: { ...base, amount: 500000, invoiceDate: '2025-08-01', acceptanceDate: '2025-08-01', asOf: '2026-02-28' } },
  { id: 'agreement-60-capped-to-45', note: 'Agreement of 60 days is capped at 45',
    input: { ...base, amount: 120000, invoiceDate: '2026-05-10', acceptanceDate: '2026-05-10', agreementDays: 60, asOf: '2026-08-20' } },
  { id: 'agreement-30-respected', note: 'Agreement of 30 days (<=45) is used as is',
    input: { ...base, amount: 120000, invoiceDate: '2026-05-10', acceptanceDate: '2026-05-10', agreementDays: 30, asOf: '2026-08-20' } },
  { id: 'deemed-acceptance-later-than-invoice', note: 'Acceptance date later than invoice date shifts the due date',
    input: { ...base, amount: 80000, invoiceDate: '2026-03-01', acceptanceDate: '2026-03-10', asOf: '2026-06-30' } },
  { id: 'across-several-rate-cuts', note: 'Long span across 2025 cuts (6.50 -> 6.25 -> 5.75 -> 5.50)',
    input: { ...base, amount: 300000, invoiceDate: '2025-01-01', acceptanceDate: '2025-01-01', asOf: '2026-01-15' } },
  { id: 'last-payable-day-is-today', note: 'Today is the last day to pay => not yet due, 0 days left',
    input: { ...base, amount: 100000, invoiceDate: '2026-10-07', acceptanceDate: '2026-10-07', asOf: '2026-10-22' } },
  { id: 'not-yet-due-10-days-left', note: 'Not yet due, 10 days left',
    input: { ...base, amount: 100000, invoiceDate: '2026-10-17', acceptanceDate: '2026-10-17', asOf: '2026-10-22' } },
  { id: 'udyam-after-invoice', note: 'Udyam registration dated after the invoice => may not be covered',
    input: { ...base, amount: 100000, invoiceDate: '2026-01-01', acceptanceDate: '2026-01-01', udyamDate: '2026-02-01', asOf: '2026-06-01' } },
  { id: 'rate-history-not-loaded', note: 'Interest would start before 8 Feb 2023 => rate history not loaded',
    input: { ...base, amount: 100000, invoiceDate: '2022-11-01', acceptanceDate: '2022-11-01', udyamDate: '2022-01-01', asOf: '2026-10-22' } },
  { id: 'rate-history-boundary-ok', note: 'Interest starts exactly on 2023-02-08 => allowed',
    input: { ...base, amount: 100000, invoiceDate: '2023-01-23', acceptanceDate: '2023-01-23', udyamDate: '2022-01-01', asOf: '2023-02-28' } },
];

const out = cases.map((c) => ({ ...c, expected: compute(c.input) }));
mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/golden-vectors.json', import.meta.url), JSON.stringify(out, null, 2));
for (const c of out) {
  const e = c.expected;
  console.log(c.id.padEnd(40), e.status.padEnd(24),
    e.status === 'overdue' ? `days=${e.daysOverdue} interest=${e.totalInterest} total=${e.totalDue}` :
    e.status === 'not_yet_due' ? `daysLeft=${e.daysLeft}` : '');
}
