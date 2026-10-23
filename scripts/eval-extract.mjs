// Live accuracy check of invoice reading: sends every file in test-invoices/pack (made by
// scripts/make-invoice-pack.mjs) to /api/extract and scores each field against truth.json.
// Spends one AI request per file, so it is never part of npm test.
// Run: node scripts/eval-extract.mjs [baseUrl] [fileFilter]   (default: the live site, every file)
import { readFile } from "node:fs/promises";

const BASE = process.argv[2] ?? "https://msme-invoice-recovery.vercel.app";
const DIR = "test-invoices/pack";
const ONLY = process.argv[3];
const truth = JSON.parse(await readFile(`${DIR}/truth.json`, "utf8")).filter((t) => !ONLY || ONLY.split(",").some((f) => t.file.includes(f)));
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const FIELDS = ["isInvoice", "clientName", "invoiceNumber", "invoiceDate", "amountTotal", "currency", "paymentTermsDays"];

let right = 0;
let total = 0;
const rows = [];
for (const t of truth) {
  const bytes = await readFile(`${DIR}/${t.file}`);
  const type = t.file.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), t.file);
  const started = Date.now();
  const res = await fetch(`${BASE}/api/extract`, { method: "POST", body: form });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    rows.push({ file: t.file, status: res.status, error: j.error, secs });
    console.log(`${t.file}: HTTP ${res.status} ${j.error} (${secs}s)`);
    continue;
  }
  const d = j.data;
  // Non-invoices: only isInvoice is scored (the app stops there).
  const fields = t.isInvoice ? FIELDS : ["isInvoice"];
  const misses = [];
  for (const f of fields) {
    total++;
    const ok = f === "clientName" || f === "invoiceNumber" ? norm(d[f]) === norm(t[f]) : d[f] === t[f];
    if (ok) right++;
    else misses.push(`${f}: got ${JSON.stringify(d[f])} (${d.confidence?.[f === "isInvoice" ? "" : f] ?? "-"}), want ${JSON.stringify(t[f])}`);
  }
  rows.push({ file: t.file, secs, misses, got: d });
  console.log(`${misses.length ? "MISS" : "OK  "} ${t.file} (${secs}s)${misses.length ? "\n      " + misses.join("\n      ") : ""}`);
  await new Promise((r) => setTimeout(r, 3000)); // stay polite with the per-IP limiter
}
console.log(`\nfields right: ${right}/${total} (${((100 * right) / Math.max(1, total)).toFixed(0)}%)`);
console.log(JSON.stringify(rows.map((r) => ({ file: r.file, got: r.got })), null, 0).slice(0, 4000));
