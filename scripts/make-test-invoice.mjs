// Generator for test-invoices/saffron-pixel-SPS-26-27-0087.pdf: a realistic Indian GST tax invoice
// for trying the app with something other than the built-in sample. Run: node scripts/make-test-invoice.mjs
// Everything is FICTIONAL: the companies, GSTINs (dummy PAN AAAAA0000A), Udyam number, PO and bank
// details do not exist. The standard PDF fonts cannot draw the rupee sign, so amounts use "Rs.".
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";

const INV = {
  seller: {
    name: "Saffron Pixel Studio LLP",
    lines: ["3rd Floor, 41 Indiranagar 100 Ft Road", "Bengaluru, Karnataka 560038", "GSTIN: 29AAAAA0000A1Z5 (sample)", "Udyam: UDYAM-KR-03-0000000 (sample) - Micro enterprise"],
  },
  buyer: {
    name: "Harbourline Retail Pvt Ltd",
    lines: ["Accounts Payable, 7th Floor, Marine Lines Business Centre", "Mumbai, Maharashtra 400020", "GSTIN: 27AAAAA0000A1Z9 (sample)"],
  },
  number: "SPS/26-27/0087",
  date: "15/07/2026",
  due: "14/08/2026",
  po: "HRL-PO-44120",
  terms: "Net 30 days from invoice date",
  placeOfSupply: "Maharashtra (27)",
  items: [
    ["UI/UX design, e-commerce app (Phase 2)", "9983", 1, 110000],
    ["Front-end development sprint (2 weeks)", "9983", 1, 45000],
    ["Analytics setup and dashboard", "9983", 1, 30000],
  ],
  igstRate: 0.18,
};

const fmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const subtotal = INV.items.reduce((s, [, , q, r]) => s + q * r, 0);
const igst = Math.round(subtotal * INV.igstRate * 100) / 100;
const total = subtotal + igst;
if (total !== 218300) throw new Error(`Expected total 218300, got ${total}`);

const pdf = await PDFDocument.create();
pdf.setTitle(`Tax invoice ${INV.number} (fictional test)`);
pdf.setCreator("msme-invoice-recovery test invoice generator");
pdf.setCreationDate(new Date("2026-07-15T00:00:00Z"));
const page = pdf.addPage([595, 842]);
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const ink = rgb(0.1, 0.1, 0.12);
const grey = rgb(0.42, 0.42, 0.46);
const brand = rgb(0.85, 0.42, 0.1);
const L = 48;
const R = 547;
let y = 790;

const text = (s, x, yy, size = 10, f = font, color = ink) => page.drawText(s, { x, y: yy, size, font: f, color });
const rightText = (s, xr, yy, size = 10, f = font, color = ink) => text(s, xr - f.widthOfTextAtSize(s, size), yy, size, f, color);
const rule = (yy, t = 0.6, c = rgb(0.82, 0.82, 0.8)) => page.drawLine({ start: { x: L, y: yy }, end: { x: R, y: yy }, thickness: t, color: c });

// Header
page.drawRectangle({ x: L, y: y - 6, width: 26, height: 26, color: brand });
text("SP", L + 5, y + 2, 11, bold, rgb(1, 1, 1));
text(INV.seller.name, L + 36, y + 6, 15, bold);
text("Design and technology for growing brands", L + 36, y - 8, 9, font, grey);
rightText("TAX INVOICE", R, y + 6, 16, bold, brand);
rightText("Original for recipient", R, y - 8, 8, font, grey);
y -= 34;
rule(y, 1.2, brand);
y -= 18;

// Seller / invoice meta
INV.seller.lines.forEach((l, i) => text(l, L, y - i * 13, 9, font, grey));
const meta = [["Invoice no.", INV.number], ["Invoice date", INV.date], ["Due date", INV.due], ["PO number", INV.po], ["Place of supply", INV.placeOfSupply]];
meta.forEach(([k, v], i) => {
  text(k, 360, y - i * 13, 9, font, grey);
  rightText(v, R, y - i * 13, 9, bold);
});
y -= 78;

// Bill to
text("BILL TO", L, y, 8, bold, grey);
y -= 14;
text(INV.buyer.name, L, y, 11, bold);
INV.buyer.lines.forEach((l, i) => text(l, L, y - 14 - i * 13, 9, font, grey));
y -= 70;

// Items table
const cols = { desc: L + 8, sac: 330, qty: 385, rate: 465, amt: R - 8 };
page.drawRectangle({ x: L, y: y - 6, width: R - L, height: 22, color: rgb(0.97, 0.94, 0.9) });
text("#", L + 8, y, 9, bold);
text("Description of service", L + 24, y, 9, bold);
text("SAC", cols.sac, y, 9, bold);
text("Qty", cols.qty, y, 9, bold);
rightText("Rate", cols.rate, y, 9, bold);
rightText("Amount", cols.amt, y, 9, bold);
y -= 24;
INV.items.forEach(([d, sac, q, r], i) => {
  text(String(i + 1), L + 8, y, 9);
  text(d, L + 24, y, 9);
  text(sac, cols.sac, y, 9);
  text(String(q), cols.qty, y, 9);
  rightText(fmt.format(r), cols.rate, y, 9);
  rightText(fmt.format(q * r), cols.amt, y, 9);
  y -= 8;
  rule(y);
  y -= 16;
});

// Totals
y -= 6;
const totals = [["Taxable value", fmt.format(subtotal)], ["IGST @ 18%", fmt.format(igst)]];
totals.forEach(([k, v]) => {
  text(k, 360, y, 9, font, grey);
  rightText(`Rs. ${v}`, R - 8, y, 9);
  y -= 15;
});
page.drawRectangle({ x: 352, y: y - 8, width: R - 352, height: 24, color: rgb(0.97, 0.94, 0.9) });
text("Total amount due", 360, y, 10, bold);
rightText(`Rs. ${fmt.format(total)}`, R - 8, y, 11, bold);
y -= 26;
text("Amount in words: Rupees Two Lakh Eighteen Thousand Three Hundred Only", L, y, 9, font, grey);
y -= 30;

// Terms and bank
text("PAYMENT TERMS", L, y, 8, bold, grey);
y -= 14;
[
  `${INV.terms}. Please quote invoice ${INV.number} and PO ${INV.po} with your payment.`,
  "We are a micro enterprise registered under the MSMED Act, 2006 (Udyam number above).",
  "Bank transfer: Fictional Bank Ltd, A/c 000000000000, IFSC TEST0000000 (sample details).",
].forEach((l) => {
  text(l, L, y, 9);
  y -= 13;
});
y -= 24;
text(`For ${INV.seller.name}`, 360, y, 9, bold);
y -= 34;
text("Authorised signatory", 360, y, 9, font, grey);

// Fictional notice
page.drawRectangle({ x: L, y: 40, width: R - L, height: 22, color: rgb(1, 0.96, 0.9) });
text("FICTIONAL TEST INVOICE - not a real company, GSTIN or transaction. For trying the FortyFive app only.", L + 10, 47, 8, bold, rgb(0.48, 0.29, 0));

await mkdir("test-invoices", { recursive: true });
const out = "test-invoices/saffron-pixel-SPS-26-27-0087.pdf";
await writeFile(out, await pdf.save());
console.log(`wrote ${out}: subtotal ${subtotal}, IGST ${igst}, total ${total}`);
