// Builds test-invoices/pack/: ten invoices in the layouts Indian service businesses actually send
// (Zoho-style, Razorpay-style, Tally-style, a phone photo, two pages, an export invoice in USD, one
// with an advance already paid, a proforma and a credit note), plus truth.json with the correct
// values for each. Rendered by the installed Chrome so the rupee sign and layouts look real.
// The businesses, GSTINs (dummy PAN AAAAA0000A), bank details and people are illustrative: never
// put a real client's invoice through a free-tier AI key. Run: node scripts/make-invoice-pack.mjs
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const OUT = "test-invoices/pack";
const inr = (n) => "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const num = (n) => new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const usd = (n) => "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(n);
const r2 = (x) => Math.round(x * 100) / 100;
const SPECIMEN = `<p class="specimen">Specimen for demonstration. The businesses, GSTINs, bank details and people on this invoice are illustrative.</p>`;

// Indian-system amount in words (lakh, crore), for "Amount in words" lines.
function words(n) {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x) => (x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? "-" + a[x % 10] : ""));
  const three = (x) => (x >= 100 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + two(x % 100) : "") : two(x));
  let s = "";
  const crore = Math.floor(n / 1e7), lakh = Math.floor((n % 1e7) / 1e5), th = Math.floor((n % 1e5) / 1e3), rest = n % 1e3;
  if (crore) s += three(crore) + " Crore ";
  if (lakh) s += two(lakh) + " Lakh ";
  if (th) s += two(th) + " Thousand ";
  if (rest) s += three(rest);
  return s.trim();
}

const BASE_CSS = `
  * { box-sizing: border-box; } body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #1f2328; font-size: 12.5px; }
  .page { width: 794px; min-height: 1123px; padding: 48px 52px; background: #fff; position: relative; }
  table { width: 100%; border-collapse: collapse; } th, td { padding: 7px 8px; text-align: left; vertical-align: top; }
  .r { text-align: right; } .muted { color: #6b7280; } .b { font-weight: 700; }
  .specimen { position: absolute; bottom: 18px; left: 52px; right: 52px; font-size: 9px; color: #9ca3af; text-align: center; }
`;

// ---------------------------------------------------------------- 1. Zoho-style (the demo invoice)
function zoho() {
  const items = [
    ["Brand identity system", "Logo suite, colour and type system, brand guidelines (48 pages)", "998391", 1, 150000],
    ["Packaging design", "Front and back labels for 6 SKUs, print-ready files", "998391", 6, 15000],
    ["Website UI design", "Home, product and checkout pages, desktop and mobile", "998391", 1, 60000],
  ];
  const sub = items.reduce((s, i) => s + i[3] * i[4], 0);
  const cgst = r2(sub * 0.09), sgst = r2(sub * 0.09), total = r2(sub + cgst + sgst);
  if (total !== 354000) throw new Error("zoho total " + total);
  const html = `<style>${BASE_CSS}
    .top{display:flex;justify-content:space-between} .logo{width:52px;height:52px;border-radius:10px;background:#0f766e;color:#fff;display:grid;place-items:center;font-weight:800;font-size:20px}
    h1{font-size:30px;font-weight:300;letter-spacing:1px;margin:0;text-align:right} .bal{margin-top:6px;text-align:right} .bal .v{font-size:20px;font-weight:700}
    .meta td{padding:3px 0} .items th{background:#3c3d3a;color:#fff;font-weight:600;font-size:11.5px} .items td{border-bottom:1px solid #e5e7eb}
    .tot td{padding:5px 8px} .grand td{background:#f3f4f6;font-weight:700;font-size:14px}</style>
  <div class="page">
    <div class="top">
      <div style="display:flex;gap:14px"><div class="logo">AS</div><div>
        <div class="b" style="font-size:15px">Ankur Brand Studio LLP</div>
        <div class="muted">2nd Floor, 14 HSR Layout Sector 6<br>Bengaluru, Karnataka 560102<br>GSTIN 29AAAAA0000A1Z5<br>accounts@ankurbrand.studio</div></div></div>
      <div><h1>TAX INVOICE</h1><div class="muted r"># INV-000142</div>
        <div class="bal"><div class="muted">Balance Due</div><div class="v">${inr(total)}</div></div></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:34px">
      <div><div class="muted">Bill To</div><div class="b" style="font-size:14px">Meridian Foods Pvt Ltd</div>
        <div>Finance &amp; Accounts, 5th Floor, Prestige Tech Park<br>Outer Ring Road, Bengaluru, Karnataka 560103<br>GSTIN 29AAAAA0000A2Z4</div></div>
      <table class="meta" style="width:280px"><tr><td class="muted r">Invoice Date :</td><td class="r">01/08/2026</td></tr>
        <tr><td class="muted r">Terms :</td><td class="r">Net 30</td></tr><tr><td class="muted r">Due Date :</td><td class="r">31/08/2026</td></tr>
        <tr><td class="muted r">P.O.# :</td><td class="r">MFPL/PO/2026/0388</td></tr><tr><td class="muted r">Place Of Supply :</td><td class="r">Karnataka (29)</td></tr></table>
    </div>
    <table class="items" style="margin-top:26px"><tr><th>#</th><th>Item &amp; Description</th><th>HSN/SAC</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
      ${items.map((i, k) => `<tr><td>${k + 1}</td><td><div class="b">${i[0]}</div><div class="muted">${i[1]}</div></td><td>${i[2]}</td><td class="r">${num(i[3])}</td><td class="r">${num(i[4])}</td><td class="r">${num(i[3] * i[4])}</td></tr>`).join("")}
    </table>
    <div style="display:flex;justify-content:space-between;margin-top:14px">
      <div style="width:330px"><div class="muted">Total In Words</div><div class="b" style="font-style:italic">Indian Rupee ${words(total)} Only</div>
        <div class="muted" style="margin-top:18px">Notes</div><div>Thank you for the business. Please quote the invoice number with your payment.</div>
        <div class="muted" style="margin-top:14px">Bank Details</div><div>Ankur Brand Studio LLP · Current A/c 000000000000<br>IFSC SBIN0000000 · State Bank of India, HSR Layout</div></div>
      <table class="tot" style="width:300px"><tr><td class="r">Sub Total</td><td class="r">${num(sub)}</td></tr>
        <tr><td class="r">CGST9 (9%)</td><td class="r">${num(cgst)}</td></tr><tr><td class="r">SGST9 (9%)</td><td class="r">${num(sgst)}</td></tr>
        <tr><td class="r b">Total</td><td class="r b">${inr(total)}</td></tr><tr class="grand"><td class="r">Balance Due</td><td class="r">${inr(total)}</td></tr></table>
    </div>
    <div style="margin-top:60px;text-align:right"><div style="height:36px"></div><div class="muted">Authorized Signature</div></div>
    ${SPECIMEN}
  </div>`;
  return { html, truth: { isInvoice: true, clientName: "Meridian Foods Pvt Ltd", invoiceNumber: "INV-000142", invoiceDate: "2026-08-01", amountTotal: total, currency: "INR", paymentTermsDays: 30 } };
}

// ---------------------------------------------------------------- 2. Razorpay-style
function razorpay() {
  const sub = 120000 + 70000, igst = r2(sub * 0.18), total = sub + igst;
  if (total !== 224200) throw new Error("rzp " + total);
  const html = `<style>${BASE_CSS} body{background:#fff} .page{padding:56px}
    .brand{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:700} .dot{width:34px;height:34px;border-radius:50%;background:#2563eb}
    .card{border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-top:22px} h2{font-size:13px;color:#6b7280;font-weight:600;margin:0 0 6px;text-transform:uppercase;letter-spacing:.6px}
    .items th{color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb} .items td{border-bottom:1px solid #f1f5f9}
    .due{background:#eff6ff;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-top:22px}
    .pay{background:#2563eb;color:#fff;border-radius:6px;padding:8px 18px;font-weight:600}</style>
  <div class="page">
    <div style="display:flex;justify-content:space-between"><div class="brand"><div class="dot"></div>Tidewater Cloud Consulting</div>
      <div class="r"><div style="font-size:22px;font-weight:700">Invoice</div><div class="muted">#TCC/26-27/031</div></div></div>
    <div style="display:flex;gap:20px">
      <div class="card" style="flex:1"><h2>Billed to</h2><div class="b">Brightpath Edtech Pvt Ltd</div><div class="muted">Plot 22, Sector 44, Gurugram, Haryana 122003<br>GSTIN 06AAAAA0000A1Z2</div></div>
      <div class="card" style="flex:1"><h2>From</h2><div class="b">Tidewater Cloud Consulting</div><div class="muted">Unit 7, Kalyani Nagar, Pune, Maharashtra 411006<br>GSTIN 27AAAAA0000A1Z9</div></div>
      <div class="card" style="width:200px"><h2>Details</h2><div>Issued on <b>12 Aug 2026</b></div><div>Due by <b>27 Aug 2026</b></div></div>
    </div>
    <table class="items" style="margin-top:26px"><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>
      <tr><td>AWS migration consulting (fixed scope)</td><td class="r">1</td><td class="r">${inr(120000)}</td><td class="r">${inr(120000)}</td></tr>
      <tr><td>DevOps retainer, August 2026</td><td class="r">1</td><td class="r">${inr(70000)}</td><td class="r">${inr(70000)}</td></tr>
      <tr><td class="r muted" colspan="3">Subtotal</td><td class="r">${inr(sub)}</td></tr>
      <tr><td class="r muted" colspan="3">IGST @ 18%</td><td class="r">${inr(igst)}</td></tr>
      <tr><td class="r b" colspan="3">Total</td><td class="r b">${inr(total)}</td></tr></table>
    <div class="due"><div><div class="muted">Amount due</div><div style="font-size:24px;font-weight:700">${inr(total)}</div></div><div class="pay">Pay now</div></div>
    <p class="muted" style="margin-top:22px">Payments are accepted by UPI, cards and netbanking through the payment link. Questions? billing@tidewater.cloud</p>
    ${SPECIMEN}
  </div>`;
  return { html, truth: { isInvoice: true, clientName: "Brightpath Edtech Pvt Ltd", invoiceNumber: "TCC/26-27/031", invoiceDate: "2026-08-12", amountTotal: total, currency: "INR", paymentTermsDays: null } };
}

// ---------------------------------------------------------------- 3. Tally-style boxed grid
function tally() {
  const sub = 40 * 2500 + 35000, igst = r2(sub * 0.18), total = sub + igst;
  if (total !== 159300) throw new Error("tally " + total);
  const html = `<style>${BASE_CSS} .page{padding:36px 40px;font-family:Arial,sans-serif;font-size:11.5px}
    .box{border:1px solid #000} .box td,.box th{border:1px solid #000;padding:4px 6px} h1{text-align:center;font-size:15px;margin:0 0 6px}</style>
  <div class="page"><h1>Tax Invoice</h1>
    <table class="box"><tr><td rowspan="3" style="width:50%"><b>Kaveri Tech Services</b><br>No. 9, 2nd Cross, Jayanagar 4th Block<br>Bengaluru-560011<br>GSTIN/UIN: 29AAAAA0000A1Z5<br>State Name : Karnataka, Code : 29</td>
      <td>Invoice No.<br><b>KT/0451/26-27</b></td><td>Dated<br><b>5-Sep-26</b></td></tr>
      <tr><td>Delivery Note<br>&nbsp;</td><td>Mode/Terms of Payment<br><b>45 Days</b></td></tr>
      <tr><td>Buyer's Order No.<br>SPL/IT/772</td><td>Dated<br>28-Aug-26</td></tr>
      <tr><td>Buyer (Bill to)<br><b>Sunrise Polymers Ltd</b><br>Survey No. 118, MIDC Chakan<br>Pune, Maharashtra 410501<br>GSTIN/UIN: 27AAAAA0000A1Z9<br>State Name : Maharashtra, Code : 27</td><td colspan="2">Terms of Delivery<br>On-site, Chakan plant</td></tr></table>
    <table class="box" style="margin-top:-1px"><tr><th>Sl No.</th><th>Description of Services</th><th>HSN/SAC</th><th class="r">Quantity</th><th class="r">Rate</th><th>per</th><th class="r">Amount</th></tr>
      <tr><td>1</td><td><b>Annual Maintenance Contract - Workstations</b></td><td>998713</td><td class="r">40 Nos</td><td class="r">2,500.00</td><td>Nos</td><td class="r">1,00,000.00</td></tr>
      <tr><td>2</td><td><b>Network Security Audit</b></td><td>998313</td><td class="r">1 Job</td><td class="r">35,000.00</td><td>Job</td><td class="r">35,000.00</td></tr>
      <tr><td></td><td class="r"><b>IGST @ 18%</b></td><td></td><td></td><td class="r">18 %</td><td></td><td class="r">${num(igst)}</td></tr>
      <tr><td></td><td class="r">Total</td><td></td><td class="r">41 Nos</td><td></td><td></td><td class="r"><b>₹ ${num(total)}</b></td></tr></table>
    <table class="box" style="margin-top:-1px"><tr><td>Amount Chargeable (in words)<br><b>INR ${words(total)} Only</b></td><td class="r">E. &amp; O.E</td></tr>
      <tr><td>Company's Bank Details<br>Bank Name : Canara Bank<br>A/c No. : 0000000000000<br>Branch &amp; IFS Code : Jayanagar &amp; CNRB0000000</td><td class="r">for Kaveri Tech Services<br><br><br>Authorised Signatory</td></tr></table>
    <p style="text-align:center;margin-top:8px">This is a Computer Generated Invoice</p>${SPECIMEN}</div>`;
  return { html, truth: { isInvoice: true, clientName: "Sunrise Polymers Ltd", invoiceNumber: "KT/0451/26-27", invoiceDate: "2026-09-05", amountTotal: total, currency: "INR", paymentTermsDays: 45 } };
}

// ---------------------------------------------------------------- 4. Simple small-business bill (no GST)
function simple() {
  const total = 2 * 18000 + 9500;
  const html = `<style>${BASE_CSS} .head{background:#7c3aed;color:#fff;padding:22px 52px;margin:-48px -52px 26px} .items th{background:#f5f3ff} .items td,.items th{border:1px solid #e9d5ff}</style>
  <div class="page"><div class="head"><div style="font-size:22px;font-weight:700">Rang Photography</div><div>Freelance event &amp; wedding photography · Jaipur · 98XXXXXX10</div></div>
    <div style="display:flex;justify-content:space-between"><div><div class="muted">Bill To</div><b style="font-size:14px">Lotus Events &amp; Weddings</b><div>C-Scheme, Jaipur, Rajasthan 302001</div></div>
      <div class="r"><div style="font-size:18px;font-weight:700">INVOICE</div><div>Invoice No: RP-27</div><div>Date: 28/08/2026</div></div></div>
    <table class="items" style="margin-top:22px"><tr><th>#</th><th>Item name</th><th class="r">Qty</th><th class="r">Price/Unit</th><th class="r">Amount</th></tr>
      <tr><td>1</td><td>Event photography (Sharma-Mehta wedding)</td><td class="r">2 days</td><td class="r">${inr(18000)}</td><td class="r">${inr(36000)}</td></tr>
      <tr><td>2</td><td>Edited album, 60 pages</td><td class="r">1</td><td class="r">${inr(9500)}</td><td class="r">${inr(9500)}</td></tr></table>
    <table style="width:280px;margin:14px 0 0 auto"><tr><td>Sub Total</td><td class="r">${inr(total)}</td></tr><tr><td class="b">Total</td><td class="r b">${inr(total)}</td></tr><tr><td>Received</td><td class="r">${inr(0)}</td></tr><tr><td class="b">Balance</td><td class="r b">${inr(total)}</td></tr></table>
    <p><b>Invoice Amount In Words:</b> ${words(total)} Rupees only</p><p><b>Terms and conditions:</b> Payment within 15 days. UPI: rangphoto@upi</p>${SPECIMEN}</div>`;
  return { html, truth: { isInvoice: true, clientName: "Lotus Events & Weddings", invoiceNumber: "RP-27", invoiceDate: "2026-08-28", amountTotal: total, currency: "INR", paymentTermsDays: 15 } };
}

// ---------------------------------------------------------------- 5. Phone photo of a printed invoice (JPEG)
function photo() {
  const sub = 48000 + 12400, c = r2(sub * 0.09), total = r2(sub + 2 * c);
  if (total !== 71272) throw new Error("photo " + total);
  const paper = `<div class="paper"><div style="text-align:center"><div style="font-size:20px;font-weight:800">SHREE GANESH ELECTRICALS &amp; SERVICES</div><div>Shop 4, Navrangpura, Ahmedabad 380009 · GSTIN 24AAAAA0000A1Z1</div><div style="font-weight:700;margin-top:6px;letter-spacing:2px">TAX INVOICE</div></div>
    <div style="display:flex;justify-content:space-between;margin-top:14px"><div>To: <b>Orchid Residency Hotels Pvt Ltd</b><br>SG Highway, Ahmedabad 380054</div><div>Bill No: <b>SGE/122</b><br>Date: <b>10/08/2026</b></div></div>
    <table style="margin-top:12px" class="g"><tr><th>Particulars</th><th class="r">Amount (₹)</th></tr><tr><td>Electrical maintenance, Jul-Aug 2026</td><td class="r">48,000.00</td></tr><tr><td>Spares (MCBs, cables, fittings)</td><td class="r">12,400.00</td></tr>
      <tr><td class="r">CGST 9%</td><td class="r">${num(c)}</td></tr><tr><td class="r">SGST 9%</td><td class="r">${num(c)}</td></tr><tr><td class="r"><b>GRAND TOTAL</b></td><td class="r"><b>${num(total)}</b></td></tr></table>
    <p>Rupees ${words(total)} only</p><p style="text-align:right;margin-top:26px">For Shree Ganesh Electricals<br><br>Proprietor</p><p style="font-size:9px;color:#999">Specimen for demonstration; illustrative business details.</p></div>`;
  const html = `<style>${BASE_CSS} body{background:#6b5b4b} .scene{width:900px;height:1150px;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,#8b7765,#4a3d31)}
    .paper{width:700px;padding:40px;background:#fbfaf6;font-family:"Courier New",monospace;font-size:13px;transform:rotate(-2.4deg) skewX(-0.6deg);box-shadow:0 18px 40px rgba(0,0,0,.45);filter:blur(0.5px) contrast(.92) brightness(.97)}
    .g{width:100%;border-collapse:collapse} .g td,.g th{border:1px solid #333;padding:5px}</style><div class="scene">${paper}</div>`;
  return { html, photo: true, truth: { isInvoice: true, clientName: "Orchid Residency Hotels Pvt Ltd", invoiceNumber: "SGE/122", invoiceDate: "2026-08-10", amountTotal: total, currency: "INR", paymentTermsDays: null } };
}

// ---------------------------------------------------------------- 6. Two-page invoice, total on page 2
function twoPage() {
  const topics = ["UPI fraud explainer", "Credit score myths", "Tax-saving FDs", "Digital gold basics", "BNPL risks", "Home loan prepayment", "SIP vs lump sum", "Emergency funds", "Term insurance 101", "NPS tier II", "GST on fintech fees", "RBI repo explained", "Credit card rewards", "Gold loans", "PPF rules 2026", "ELSS lock-in", "Senior citizen schemes", "Health top-ups", "Rent agreement tips", "Personal loan EMIs", "Crypto tax in India", "Budget 2026 recap"];
  const items = topics.map((t, i) => [`Long-form article: ${t} (1,800 words)`, i % 3 === 0 ? 7500 : 6000]);
  const sub = items.reduce((s, i) => s + i[1], 0), igst = r2(sub * 0.18), total = r2(sub + igst);
  const rows = (arr, from) => arr.map((it, k) => `<tr><td>${from + k}</td><td>${it[0]}</td><td>998399</td><td class="r">1</td><td class="r">${num(it[1])}</td></tr>`).join("");
  const css = `<style>${BASE_CSS} .page{page-break-after:always} .items th{background:#111827;color:#fff} .items td{border-bottom:1px solid #e5e7eb}</style>`;
  const head = `<div style="display:flex;justify-content:space-between"><div><div style="font-size:20px;font-weight:700">Inkwell Content Co.</div><div class="muted">12 Linking Road, Bandra West, Mumbai 400050 · GSTIN 27AAAAA0000A1Z9</div></div><div class="r"><div style="font-size:18px">TAX INVOICE</div><div>No. IWC-2026-118</div><div>Date: 20 July 2026</div></div></div>`;
  const html = `${css}<div class="page">${head}<div style="margin-top:20px">Billed to: <b>Fintrail Payments Pvt Ltd</b>, 3rd Floor, Cyber City, Gurugram, Haryana 122002 · GSTIN 06AAAAA0000A1Z2<br>Payment terms: Net 45</div>
    <table class="items" style="margin-top:18px"><tr><th>#</th><th>Description</th><th>SAC</th><th class="r">Qty</th><th class="r">Amount (₹)</th></tr>${rows(items.slice(0, 14), 1)}</table><p class="muted r">Continued on page 2</p>${SPECIMEN}</div>
    <div class="page">${head}<table class="items" style="margin-top:18px"><tr><th>#</th><th>Description</th><th>SAC</th><th class="r">Qty</th><th class="r">Amount (₹)</th></tr>${rows(items.slice(14), 15)}</table>
    <table style="width:300px;margin:16px 0 0 auto"><tr><td>Taxable value</td><td class="r">${num(sub)}</td></tr><tr><td>IGST 18%</td><td class="r">${num(igst)}</td></tr><tr><td class="b">Invoice total</td><td class="r b">${inr(total)}</td></tr></table>
    <p>Amount in words: Rupees ${words(Math.round(total))} Only</p><p>Bank: HDFC Bank, A/c 00000000000000, IFSC HDFC0000000</p>${SPECIMEN}</div>`;
  return { html, truth: { isInvoice: true, clientName: "Fintrail Payments Pvt Ltd", invoiceNumber: "IWC-2026-118", invoiceDate: "2026-07-20", amountTotal: total, currency: "INR", paymentTermsDays: 45 } };
}

// ---------------------------------------------------------------- 7. Export invoice in USD
function exportUsd() {
  const total = 120 * 45 + 30 * 30;
  const html = `<style>${BASE_CSS} .items th{border-bottom:2px solid #111} .items td{border-bottom:1px solid #e5e7eb}</style>
  <div class="page"><div style="display:flex;justify-content:space-between"><div><div style="font-size:20px;font-weight:700">Bluefin Code Labs</div><div class="muted">Infopark Phase 1, Kochi, Kerala 682042, India<br>GSTIN 32AAAAA0000A1Z0 · LUT ARN AD320000000000X</div></div>
    <div class="r"><div style="font-size:18px;font-weight:700">EXPORT INVOICE</div><div>Invoice # BCL-EXP-0093</div><div>Date: Aug 18, 2026</div><div>Terms: Net 30</div></div></div>
    <div style="margin-top:22px">Bill to: <b>Northshore Analytics Inc.</b><br>700 Congress Ave, Austin, TX 78701, USA</div>
    <p class="muted">Supply meant for export under LUT without payment of integrated tax.</p>
    <table class="items"><tr><th>Description</th><th class="r">Hours</th><th class="r">Rate (USD)</th><th class="r">Amount (USD)</th></tr>
      <tr><td>Dashboard development</td><td class="r">120</td><td class="r">${usd(45)}</td><td class="r">${usd(5400)}</td></tr><tr><td>QA and test automation</td><td class="r">30</td><td class="r">${usd(30)}</td><td class="r">${usd(900)}</td></tr>
      <tr><td class="r b" colspan="3">Total due (USD)</td><td class="r b">${usd(total)}</td></tr></table>
    <p>Wire to: Federal Bank, SWIFT FDRLINBB, A/c 00000000000000</p>${SPECIMEN}</div>`;
  return { html, truth: { isInvoice: true, clientName: "Northshore Analytics Inc.", invoiceNumber: "BCL-EXP-0093", invoiceDate: "2026-08-18", amountTotal: total, currency: "USD", paymentTermsDays: 30 } };
}

// ---------------------------------------------------------------- 8. Advance already received (balance due < total)
function advance() {
  const sub = 200000, igst = 36000, total = 236000, paid = 50000;
  const html = `<style>${BASE_CSS} h1{font-size:26px;font-weight:300;margin:0} .items th{background:#1e3a8a;color:#fff} .items td{border-bottom:1px solid #e5e7eb} .t td{padding:5px 8px}</style>
  <div class="page"><div style="display:flex;justify-content:space-between"><div><div style="font-size:17px;font-weight:700">Monsoon Media Works</div><div class="muted">Banjara Hills Road No. 2, Hyderabad, Telangana 500034<br>GSTIN 36AAAAA0000A1Z8</div></div>
    <div class="r"><h1>TAX INVOICE</h1><div># MMW/INV/2026/064</div></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:26px"><div><div class="muted">Bill To</div><b>Greenleaf Organics Pvt Ltd</b><br>Whitefield, Bengaluru, Karnataka 560066<br>GSTIN 29AAAAA0000A1Z5</div>
      <div class="r">Invoice Date : 05/08/2026<br>Terms : Due on Receipt<br>Place Of Supply : Karnataka (29)</div></div>
    <table class="items" style="margin-top:22px"><tr><th>Item &amp; Description</th><th>SAC</th><th class="r">Amount</th></tr><tr><td><b>Brand film production</b><br><span class="muted">90-second film, 2 shoot days, edit, grade and sound</span></td><td>999612</td><td class="r">${num(sub)}</td></tr></table>
    <table class="t" style="width:320px;margin:12px 0 0 auto"><tr><td class="r">Sub Total</td><td class="r">${num(sub)}</td></tr><tr><td class="r">IGST18 (18%)</td><td class="r">${num(igst)}</td></tr>
      <tr><td class="r b">Total</td><td class="r b">${inr(total)}</td></tr><tr><td class="r">Payment Made</td><td class="r" style="color:#dc2626">(-) ${num(paid)}</td></tr>
      <tr style="background:#f3f4f6"><td class="r b">Balance Due</td><td class="r b">${inr(total - paid)}</td></tr></table>
    <p>Total in words: Indian Rupee ${words(total)} Only</p><p class="muted">Advance of ₹50,000.00 received on 25/07/2026 against PO GLO/PO/219.</p>${SPECIMEN}</div>`;
  return { html, truth: { isInvoice: true, clientName: "Greenleaf Organics Pvt Ltd", invoiceNumber: "MMW/INV/2026/064", invoiceDate: "2026-08-05", amountTotal: total, currency: "INR", paymentTermsDays: null, note: "Advance ₹50,000 paid 25 Jul 2026; balance due ₹1,86,000. The grand total is ₹2,36,000; the founder should enter the advance as a part payment." } };
}

// ---------------------------------------------------------------- 9. Proforma (not a tax invoice)
function proforma() {
  const total = 118000;
  const html = `<style>${BASE_CSS} .items td,.items th{border:1px solid #d1d5db}</style>
  <div class="page"><div style="text-align:center"><div style="font-size:22px;font-weight:700">PROFORMA INVOICE</div><div class="muted">This is not a tax invoice. A tax invoice will be issued on receipt of payment.</div></div>
    <div style="display:flex;justify-content:space-between;margin-top:22px"><div><b>Quillstone Training Co.</b><br>Salt Lake Sector V, Kolkata 700091<br>GSTIN 19AAAAA0000A1Z3</div><div class="r">Proforma No: QTC/PI/2026/045<br>Date: 02/09/2026<br>Valid till: 30/09/2026</div></div>
    <div style="margin-top:16px">To: <b>Eastern Freight Lines Pvt Ltd</b>, Kolkata</div>
    <table class="items" style="margin-top:14px"><tr><th>Description</th><th class="r">Amount</th></tr><tr><td>Leadership workshop, 2 days, 25 participants</td><td class="r">${num(100000)}</td></tr><tr><td class="r">CGST 9% + SGST 9%</td><td class="r">${num(18000)}</td></tr><tr><td class="r b">Total payable in advance</td><td class="r b">${inr(total)}</td></tr></table>
    <p>Kindly release 100% advance to confirm the dates.</p>${SPECIMEN}</div>`;
  return { html, truth: { isInvoice: false, clientName: "Eastern Freight Lines Pvt Ltd", invoiceNumber: "QTC/PI/2026/045", invoiceDate: "2026-09-02", amountTotal: total, currency: "INR", paymentTermsDays: null, note: "A proforma is a request for advance payment, not an invoice for accepted work: it should not be chased as overdue." } };
}

// ---------------------------------------------------------------- 10. Credit note
function creditNote() {
  const total = 17700;
  const html = `<style>${BASE_CSS} .items td,.items th{border:1px solid #d1d5db}</style>
  <div class="page"><div style="display:flex;justify-content:space-between"><div><b style="font-size:17px">Kaveri Tech Services</b><br>Jayanagar, Bengaluru 560011 · GSTIN 29AAAAA0000A1Z5</div><div class="r"><div style="font-size:20px;font-weight:700">CREDIT NOTE</div><div>Credit Note No: KT/CN/012/26-27</div><div>Date: 20/09/2026</div><div>Against Invoice: KT/0451/26-27 dt 05/09/2026</div></div></div>
    <div style="margin-top:18px">Issued to: <b>Sunrise Polymers Ltd</b>, Chakan, Pune</div>
    <table class="items" style="margin-top:14px"><tr><th>Reason</th><th class="r">Amount</th></tr><tr><td>Short service: 6 workstations not covered under AMC</td><td class="r">${num(15000)}</td></tr><tr><td class="r">IGST 18%</td><td class="r">${num(2700)}</td></tr><tr><td class="r b">Total credit</td><td class="r b">${inr(total)}</td></tr></table>${SPECIMEN}</div>`;
  return { html, truth: { isInvoice: false, clientName: "Sunrise Polymers Ltd", invoiceNumber: "KT/CN/012/26-27", invoiceDate: "2026-09-20", amountTotal: total, currency: "INR", paymentTermsDays: null, note: "A credit note reduces what the client owes; it is not an invoice to chase." } };
}

const PACK = [
  ["01-zoho-style-ankur-brand-INV-000142", zoho, "pdf"],
  ["02-razorpay-style-tidewater-TCC-031", razorpay, "pdf"],
  ["03-tally-style-kaveri-KT-0451", tally, "pdf"],
  ["04-simple-bill-rang-photography-RP-27", simple, "pdf"],
  ["05-phone-photo-shree-ganesh-SGE-122", photo, "jpg"],
  ["06-two-page-inkwell-IWC-118", twoPage, "pdf"],
  ["07-export-usd-bluefin-BCL-EXP-0093", exportUsd, "pdf"],
  ["08-advance-paid-monsoon-MMW-064", advance, "pdf"],
  ["09-proforma-quillstone-QTC-PI-045", proforma, "pdf"],
  ["10-credit-note-kaveri-KT-CN-012", creditNote, "pdf"],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 900, height: 1150 } });
const truth = [];
for (const [name, make, ext] of PACK) {
  const { html, truth: t } = make();
  await page.setContent(`<!doctype html><meta charset="utf-8">${html}`);
  const file = `${name}.${ext}`;
  if (ext === "pdf") await page.pdf({ path: `${OUT}/${file}`, format: "A4", printBackground: true, margin: { top: "0", bottom: "0", left: "0", right: "0" } });
  else await page.screenshot({ path: `${OUT}/${file}`, type: "jpeg", quality: 72, fullPage: false });
  truth.push({ file, ...t });
  console.log(`${file}  ${t.currency} ${t.amountTotal}`);
}
await browser.close();
await writeFile(`${OUT}/truth.json`, JSON.stringify(truth, null, 2) + "\n");
console.log(`wrote ${truth.length} files + truth.json to ${OUT}`);
