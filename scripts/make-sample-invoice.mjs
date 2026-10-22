// One-off generator for public/sample/sample-invoice.pdf. Run: node scripts/make-sample-invoice.mjs
// pdf-lib is a devDependency used only here; nothing under app/, lib/ or components/ imports it.
// Everything is FICTIONAL: no real company, GSTIN, PAN, address or bank detail.
// The standard PDF fonts cannot draw the rupee sign, so amounts are printed as "INR".
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";

// Keep in sync with sampleExtraction() in lib/wizard.ts.
const INVOICE = {
  seller: "Brightline Digital Studio",
  buyer: "Northwind Test Industries Pvt Ltd",
  number: "BDS/2026/0142",
  dateDisplay: "08/08/2026", // dd/mm/yyyy on purpose: exercises Indian date reading (ISO: 2026-08-08)
  terms: "Net 30",
  items: [
    ["Website redesign and CMS build", 120000],
    ["Monthly SEO retainer (July 2026)", 50000],
    ["Hosting and maintenance (Q3 2026)", 30000],
  ],
  gstRate: 0.18,
};

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const subtotal = INVOICE.items.reduce((s, [, a]) => s + a, 0);
const gst = Math.round(subtotal * INVOICE.gstRate * 100) / 100;
const total = subtotal + gst;
if (total !== 236000) throw new Error(`Sample total must be 236000, got ${total}`);

const pdf = await PDFDocument.create();
pdf.setTitle("Sample invoice (fictional)");
pdf.setCreator("msme-invoice-recovery sample generator");
pdf.setCreationDate(new Date("2026-10-22T00:00:00Z"));
const page = pdf.addPage([595, 842]); // A4
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const ink = rgb(0.1, 0.1, 0.12);
const grey = rgb(0.4, 0.4, 0.45);
const left = 50;
const right = 545;

const text = (s, x, y, { size = 11, f = font, color = ink } = {}) => page.drawText(s, { x, y, size, font: f, color });
const textRight = (s, y, opts = {}) => {
  const { size = 11, f = font } = opts;
  text(s, right - f.widthOfTextAtSize(s, size), y, opts);
};
const rule = (y, thickness = 0.8) =>
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness, color: rgb(0.7, 0.7, 0.75) });

text("SAMPLE: fictional invoice for product demonstration only", left, 805, { size: 8, color: grey });

text("TAX INVOICE", left, 770, { size: 22, f: bold });
textRight(INVOICE.seller, 770, { size: 13, f: bold });
textRight("Sample Lane, Bengaluru", 754, { size: 9, color: grey });

rule(735);

text("Bill to", left, 712, { size: 9, color: grey });
text(INVOICE.buyer, left, 695, { size: 12, f: bold });
text("100 Test Park, Bengaluru", left, 680, { size: 10, color: grey });

text("Invoice number", 360, 712, { size: 9, color: grey });
text(INVOICE.number, 360, 695, { size: 12, f: bold });
text("Invoice date", 360, 672, { size: 9, color: grey });
text(INVOICE.dateDisplay, 360, 656, { size: 12, f: bold });

// Line items
let y = 610;
rule(y + 20, 1.2);
text("#", left, y, { size: 10, f: bold });
text("Description", left + 30, y, { size: 10, f: bold });
textRight("Amount (INR)", y, { size: 10, f: bold });
rule(y - 10);
y -= 32;
INVOICE.items.forEach(([desc, amount], i) => {
  text(String(i + 1), left, y);
  text(desc, left + 30, y);
  textRight(inr.format(amount), y);
  y -= 28;
});
rule(y + 12);

y -= 14;
text("Subtotal", 330, y);
textRight(inr.format(subtotal), y);
y -= 22;
text("IGST @ 18%", 330, y);
textRight(inr.format(gst), y);
y -= 12;
rule(y, 1.2);
y -= 24;
text("Total payable (incl. GST)", 330 - 40, y, { size: 12, f: bold });
textRight(`INR ${inr.format(total)}`, y, { size: 13, f: bold });

y -= 70;
text(`Payment terms: ${INVOICE.terms}`, left, y, { size: 12, f: bold });
y -= 24;
text("Thank you for your business.", left, y, { size: 10, color: grey });

text("This is a sample invoice with fictional parties, generated for product demonstration.", left, 60, { size: 8, color: grey });

await mkdir(new URL("../public/sample/", import.meta.url), { recursive: true });
const bytes = await pdf.save();
await writeFile(new URL("../public/sample/sample-invoice.pdf", import.meta.url), bytes);
console.log(`Wrote public/sample/sample-invoice.pdf (${bytes.length} bytes), total INR ${inr.format(total)}`);
