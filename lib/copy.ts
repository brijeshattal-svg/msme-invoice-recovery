// User-facing strings. Kept in one place so legal wording can be reviewed in one read.
export const COPY = {
  headline: "Is your client paying you late? See what you may be owed and what to say.",
  eyebrow: "The 45-day rule, on your side.",
  heroLine1: "Your client is late.",
  heroLine2: "Here's what you may be owed.",
  heroSub: "Upload an overdue invoice. See if it's late under the law, how much interest may be owed, and send one polite email that keeps the client.",
  chooseInvoice: "Choose invoice",
  fileHint: "PDF or photo, up to 4 MB. Or drop it here.",
  trust: (ratesDate: string) => ["MSMED Act Sections 15–16", `RBI rates checked to ${ratesDate}`, "Nothing stored", "You press send"],
  sampleTag: "Sample",
  sampleDue: (date: string) => `Invoice due ${date}`,
  sampleLate: (days: number) => `${days} ${days === 1 ? "day" : "days"} late`,
  sampleOwed: "interest that may be owed",
  sampleNote: (date: string) => `A fictional invoice for ₹2,36,000, worked out by the app's calculator to ${date}.`,
  trySample: "Try the sample",
  privacy: "Your file is sent to an AI service to be read. This app doesn't save it.",
  disclaimer: "Not legal advice. Calculates and drafts; you decide what to send.",
  reading: "Reading your invoice... about 10 seconds",
  noInvoice: "No invoice found in this file. Please try another.",
  pdfTooLarge: "That PDF is too large. Try a photo of it or a smaller export.",
  imageTooLarge: "That photo is still too large after shrinking it. Try a smaller one.",
  unsupported: "Please upload a PDF, JPEG or PNG file.",
  heic: "HEIC photos aren't supported. Please take or export the photo as a JPEG or PNG.",
  empty: "That file is empty. Please choose another.",
  rateLimited: "Too many tries just now. Please wait a few minutes and try again, or enter the details by hand.",
  aiFailed: "We couldn't read that invoice. You can try again or enter the details by hand.",
  network: "We couldn't reach the server. Check your connection and try again, or enter the details by hand.",
  agreementNote:
    "Terms printed on an invoice are not the same as a signed agreement. Choose Yes only if you and your client agreed the days in writing; otherwise the 15-day rule applies.",
  udyamHelp: "Find it on your Udyam registration certificate (the date of registration).",
  acceptanceHelp: "If they didn't object in writing within 15 days of delivery, use the delivery date.",
  unreadable: "We couldn't read this",
  pleaseCheck: "Please check",
  readFromInvoice: "Read from your invoice",
  notRupees: "This invoice isn't in rupees. Enter the amount in INR to continue.",
  stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  fixErrors: (n: number) => (n === 1 ? "Please fix 1 thing below." : `Please fix ${n} things below.`),
  dataTitle: "How your data is handled",
  // Accurate, not reassuring: we control what this app keeps; we do not control the AI provider.
  dataPoints: [
    "Your invoice file is sent to an AI provider's API (Google Gemini) so the details can be read. The details you confirm are sent again to write the email.",
    "This app does not store your file, the details or the email. There is no database and no login. Everything stays in this browser tab and is gone when you close or refresh it.",
    "Our server logs only whether a request worked and how long it took, never what was in it.",
    "What the AI provider does with what it receives is set by its own terms, not by this app. Depending on the plan, those terms may let it keep or use what is sent, so check them before uploading a real client invoice.",
  ],
} as const;

// Phase 3 "Where you stand" screen. Meanings follow docs/LEGAL_RULES_SPEC.md section 6.
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const STANDING = {
  title: "Where you stand",
  figuresNote:
    "Figures are based on the details you entered. We have not verified them. The MSMED Act's payment rules cover micro and small enterprises only, not medium enterprises or traders.",
  notAdvice: "Not legal advice.",
  back: "Back",
  chooseTone: "Choose a tone",
  checkAnother: "Check another invoice",

  // overdue
  interestSuffix: "interest may be owed so far", // follows the big interest amount
  totalNowDueLine: (total: string) => `Total now due ${total}`,
  daysLate: (n: number) => `${n} ${n === 1 ? "day" : "days"} late`,
  timeline: { invoice: "Invoice date", due: "Payment due", today: "Today" },
  plain: (due: string, days: number) =>
    `Your client was due to pay by ${due}. That is ${days} ${days === 1 ? "day" : "days"} ago.`,
  legalLine:
    "Under Section 16 of the MSMED Act, 2006, interest may be owed on a payment that is late beyond its due date.",
  rows: {
    dueBy: "Payment was due by",
    interestFrom: "Interest runs from",
    daysOverdue: "Days overdue",
    amount: "Amount you confirmed",
    interest: "Interest to today",
    total: "Total now due",
  },
  capped: (agreedDays: string) =>
    `Your agreement says ${agreedDays} days. The law caps this at 45, so we used 45.`,
  workingTitle: "Show the working, month by month",
  columns: { month: "Month", days: "Days", opening: "Opening balance", rate: "Rate used", interest: "Interest", closing: "Closing balance" },
  daysCount: (n: number) => plural(n, "day", "days"),
  howTitle: "How this is worked out",
  how:
    "Interest is worked out at three times the RBI Bank Rate in force on each day. It builds up day by day on the amount owed at the start of each calendar month, using a 365-day year, and is added to the amount owed at the end of the month, so the next month's interest is worked out on a slightly larger amount.",
  ratesLoaded: (date: string) => `Interest rates checked to ${date}`,

  // not yet due
  notYetDueTitle: "Not late yet",
  lastDayToPay: (date: string) => `The last day to pay is ${date}.`,
  daysLeft: (n: number) => (n === 0 ? "Today is the last day to pay." : `${plural(n, "day", "days")} left.`),

  // udyam registration after the invoice
  notCoveredTitle: "This invoice may not be covered",
  notCoveredBody:
    "Your Udyam registration date is after the invoice date, so the MSMED Act's payment rules may not cover this invoice.",
  notCoveredCaveat:
    "The Supreme Court has held that registration must come before the contract, which is a stricter test than the one used here. It has since referred the question to a larger bench.",
  notCoveredLawyer: "Please check with a lawyer before relying on this invoice for interest.",

  // interest would start before the loaded rate history
  historyTitle: "We can't calculate interest this far back yet",
  historyBody: (date: string) =>
    `This version only has RBI rates from ${date}. Interest on this invoice would start earlier, so we can't calculate it yet.`,

} as const;

// Phase 4: tone and send screens.
export const EMAIL = {
  toneTitle: "Pick a tone",
  toneHelp: "You can change it and redraft any time.",
  draftButton: "Draft my email",
  sendTitle: "Send it yourself",
  sendSub: "Read it, edit it, send it from your own email.",
  newMessage: "New message",
  toLabel: "To",
  toPlaceholder: "Client's email (optional)",
  copyWhatsApp: "Copy for WhatsApp",
  copiedWhatsApp: "Copied a short version. Paste it into WhatsApp.",
  planTitle: "If they don't reply",
  planHelp:
    "Suggested dates only. Nothing is scheduled or sent by this app. Each later reminder works out the figures for its date, assuming nothing is paid by then.",
  planToday: "Today",
  planThisEmail: (tone: string) => `This email (${tone})`,
  copyReminder: "Copy this reminder",
  copiedReminder: (date: string) => `Copied the reminder for ${date}. Paste it into your email on that day.`,
  beforeTitle: "Before you send",
  beforeSteps: ["Replace the highlighted placeholders.", "Send it from your own email address.", "Note the date you sent it."],
  writing: "Writing your email...",
  checkedChip: "Numbers checked against your calculation",
  templateChip: "Standard draft (AI was unavailable). Same checked figures; you can send it as is.",
  subjectLabel: "Subject",
  bodyLabel: "Email",
  copy: "Copy email",
  open: "Open in my email app",
  changeTone: "Change tone",
  back: "Back",
  copied: "Copied. Paste it into your email.",
  copiedWithPlaceholders: "Copied. Remember to replace the highlighted parts first.",
  noMailApp: "If no email app opened, you may not have one set up on this device. Use Copy email and paste it into your own email.",
  copyFailed: "Couldn't copy automatically. Select the text and copy it yourself.",
  draftLong: "Draft is long. We copied it, paste it into your email.",
  placeholderWarning: "Replace the highlighted parts, like [Your name], before you send.",
  edited: "You edited the draft. Numbers are no longer auto-checked.",
  strayWarning: (tokens: string) =>
    `Check these before sending. They are not figures from your calculation: ${tokens}`,
  disclaimer: "Not legal advice. Review before sending. You send this yourself from your own email.",
  notOverdue: "This invoice isn't overdue today, so there is nothing to draft.",
} as const;

// F1: landing process strip. Plain words; each step says who does what.
export const PROCESS = {
  title: "How it works",
  steps: [
    { title: "Upload", body: "AI reads your invoice. You check every field." },
    { title: "See where you stand", body: "Plain code works out the due date and the interest that may be owed." },
    { title: "Send it yourself", body: "Pick a tone, get a polite draft, send it from your own email." },
  ],
  haveReadyTitle: "Have these ready",
  haveReady: [
    "The invoice (PDF or photo)",
    "The date your client accepted the work or goods",
    "Any written agreement on payment time",
    "Your Udyam registration date",
  ],
} as const;

// F1: optional eligibility questions on the Check screen. Notes are hedged ("may") and never block.
export const ELIGIBILITY = {
  title: "Does the law apply to you?",
  intro: "Optional, but it helps you know how much to rely on the result. You can continue whatever you answer.",
  enterpriseQ: "Is your business registered on Udyam as a micro or small enterprise?",
  enterpriseOptions: [
    { value: "micro_small", label: "Yes, micro or small" },
    { value: "medium", label: "Medium" },
    { value: "none", label: "Not registered" },
    { value: "unsure", label: "Not sure" },
  ],
  buyerQ: "Is your client a business or person based in India?",
  buyerOptions: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "unsure", label: "Not sure" },
  ],
  notesTitle: "Worth knowing",
  notes: {
    medium:
      "The MSMED Act's late-payment interest covers micro and small enterprises only, so it may not apply to a medium enterprise.",
    notRegistered:
      "The late-payment rules are usually applied to suppliers registered on Udyam. Without registration, they may not apply.",
    enterpriseUnsure:
      "Your Udyam certificate shows your category. The late-payment interest covers micro and small enterprises only.",
    buyerAbroad:
      "Section 15 is about buyers in India, so the rules may not apply to a client based outside India.",
    buyerUnsure: "Section 15 is about buyers in India. Check where your client is based before relying on the result.",
    udyamAfter:
      "Your Udyam registration date is after the invoice date, so this invoice may not be covered.",
  },
} as const;

// F1: rate freshness on the Standing screen.
export const RATES = {
  staleTitle: "The RBI rate may have changed since",
  staleBody: "Check the current Bank Rate before you rely on this.",
} as const;

// F1: static help, not a chat. Reviewed wording; no legal outcome is promised.
export const HELP = {
  open: "How this works",
  title: "How this works and what it means",
  close: "Close",
  items: [
    {
      q: "What is the 45-day rule?",
      a: "Under Section 15 of the MSMED Act, 2006, a buyer should pay a micro or small supplier within 15 days of accepting the work or goods, or within the days agreed in writing, which can't be more than 45.",
    },
    {
      q: "How is the interest worked out?",
      a: "At three times the RBI Bank Rate in force on each day, from the day after payment was due. It builds up day by day on the amount owed at the start of each month (monthly rests), using a 365-day year.",
    },
    {
      q: "What do you store?",
      a: "Nothing. There is no database and no login. Everything stays in this browser tab and is gone when you close or refresh it.",
    },
    {
      q: "What is sent to AI?",
      a: "Your invoice file, so the details can be read, and the details you confirm, so the email can be written. The AI never works out a date or a number; plain code does, and code checks every number in the draft.",
    },
    {
      q: "What will the email say?",
      a: "It will be polite, give the invoice details, the due date and the interest that may be owed, and ask when you can expect payment. It will not threaten, and it will not mention lawyers, courts or any outside body.",
    },
    {
      q: "Is this legal advice?",
      a: "No. It is a calculator and a draft. Talk to a professional before any formal step.",
    },
  ],
} as const;

// Overnight sprint (SPRINT_PLAN.md): the /toolkit page. Hedged; never "will pay", never legal claims.
export const TOOLKIT = {
  title: "Toolkit",
  intro: "Work out what's blocking a payment, who to chase first, and how late payments affect your cash.",
  memoryNote: "Nothing here is saved. Refreshing the page clears it.",
  tabs: { blockers: "Blockers", priorities: "Priorities", cash: "Cash" },
  backToCheck: "Quick Check",
  notAdvice: "Not legal or financial advice. You decide what to send.",
} as const;

export const BLOCKERS_COPY = {
  heading: "What did the client say?",
  help: "Paste the client's latest email or WhatsApp reply. We'll find what may be blocking payment and suggest a reply you can edit.",
  replyLabel: "Client's reply",
  replyPlaceholder: "e.g. \"Finance can't process this until we receive the PO.\"",
  detailsTitle: "Invoice details (optional, used only in the draft)",
  clientLabel: "Client name",
  numberLabel: "Invoice number",
  amountLabel: "Amount (₹)",
  dueLabel: "Payment was due on",
  contextLabel: "Anything else we should know (optional)",
  analyse: "Analyse reply",
  analysing: "Reading the reply…",
  tooLong: (max: number) => `Please shorten the reply to ${max} characters or fewer.`,
  empty: "Paste the client's reply first.",
  amountInvalid: "Use digits only, with at most 2 decimal places.",
  dateInvalid: "Enter a valid date.",
  failed: "We couldn't analyse the reply right now. You can choose the blocker yourself below.",
  rateLimited: "Too many tries just now. Please wait a few minutes, or choose the blocker yourself below.",
  network: "We couldn't reach the server. Check your connection, or choose the blocker yourself below.",
  resultTitle: "What may be blocking payment",
  evidenceTitle: "From the client's message",
  confidence: { high: "Clear in the message", medium: "Strongly implied", low: "Low confidence" },
  unclearTitle: "Unclear: not enough evidence in the message",
  unclearBody: "The reply doesn't say clearly what is blocking payment. The draft below asks one clear question.",
  possible: "Possibly",
  promised: (date: string) => `The client mentioned a payment date: ${date}. Check it against their message.`,
  nextAction: "Suggested next step",
  chooseLabel: "Not right? Choose the blocker",
  chooseHelp: "Changing it rewrites the draft below.",
  draftTitle: "Suggested reply",
  draftHelp: "Edit anything before you send it from your own email or WhatsApp. Replace [Your name] and [Your business].",
  subjectLabel: "Subject",
  bodyLabel: "Message",
  copy: "Copy reply",
  open: "Open in my email app",
  copied: "Copied. Paste it into your email or WhatsApp.",
  copyFailed: "Couldn't copy automatically. Select the text and copy it yourself.",
} as const;

export const PRIORITIES_COPY = {
  heading: "Who to chase first",
  help: "Add the invoices that are still unpaid. We rank clients by how much is overdue, for how long, and any promises they've missed.",
  empty: "No invoices yet. Add one below, add the invoice from Quick Check, or load the fictional sample to see how it works.",
  sampleBanner: "Fictional sample: these are not real clients or invoices.",
  loadSample: "Load fictional sample",
  clearAll: "Clear all",
  rankTitle: "Needs attention",
  nothingOverdue: "Nothing overdue right now.",
  clearTitle: "Nothing overdue",
  history: "Not enough history yet",
  historyHelp: "Payment patterns (like \"usually pays late\") need paid-invoice history, which this list doesn't have.",
  whyTitle: "Why this order?",
  whyBody: "Each client's score uses only the invoices in this list. A bigger overdue amount, an older invoice and missed promises all push a client up. Ties go to the larger overdue amount.",
  missedChip: (n: number) => (n === 1 ? "1 missed promise" : `${n} missed promises`),
  daysOverdue: (n: number) => (n === 1 ? "1 day overdue" : `${n} days overdue`),
  notYetDue: (date: string) => `Due ${date}`,
  paid: "Paid",
  interestMay: (amount: string) => `${amount} interest may be owed`,
  due: (date: string) => `due ${date}`,
  listTitle: "Invoices in this list",
  addTitle: "Add an invoice",
  editTitle: "Edit invoice",
  clientLabel: "Client",
  numberLabel: "Invoice number",
  amountLabel: "Amount (₹, incl. GST)",
  invoiceDateLabel: "Invoice date",
  acceptanceLabel: "Work accepted on (optional)",
  acceptanceHelp: "Leave blank to use the invoice date.",
  agreementLabel: "Agreed payment days in writing (optional)",
  agreementHelp: "Leave blank if there's no written agreement: the 15-day rule applies.",
  promisedLabel: "Client promised to pay by (optional)",
  add: "Add invoice",
  save: "Save changes",
  cancel: "Cancel",
  edit: "Edit",
  remove: "Remove",
  markPaid: "Mark paid",
  markUnpaid: "Mark unpaid",
  added: "Added from Quick Check.",
  addFromCheck: "Add this invoice to Priorities",
} as const;

export const CASH_COPY = {
  heading: "Will late payments squeeze your cash?",
  help: "Enter the cash you have today, the payments you expect from clients and the bills you have to pay. We'll show your balance day by day for the next 30 days.",
  startLabel: "Cash available today (₹)",
  startHelp: "Bank balance you can actually use today.",
  collectionsTitle: "Money expected in",
  expensesTitle: "Money going out",
  prefill: (n: number) => `Use unpaid invoices from Priorities (${n})`,
  prefillNone: "Add invoices in the Priorities tab to bring them in here.",
  prefillNote: "Brought in from Priorities using each invoice's due date. Edit the dates if you expect payment later.",
  sampleNote: "Includes fictional sample invoices from Priorities.",
  addCollection: "Add expected payment",
  addExpense: "Add bill or salary",
  descLabel: "Description",
  collectionPlaceholder: "e.g. Client payment",
  expensePlaceholder: "e.g. Salaries",
  amountLabel: "Amount (₹)",
  dateIn: "Expected on",
  dateOut: "Due on",
  mayBeLate: "May be late",
  remove: "Remove",
  notCounted: "Not counted until the amount and date are valid.",
  enterStart: "Enter the cash you have today to see the forecast.",
  lateToggle: "Show what happens if ticked payments arrive 15 days late",
  lateNoneTicked: "Tick \"May be late\" on expected payments to include them in this scenario.",
  expectedTitle: "If payments arrive as expected",
  lateTitle: "If ticked payments are 15 days late",
  lowest: (amount: string, date: string) => `Lowest point: ${amount} on ${date}`,
  shortfall: (amount: string, date: string) => `Shortfall: ${amount} below zero on ${date}`,
  noShortfall: "No shortfall in the next 30 days",
  totals: (inflow: string, outflow: string) => `Expected in: ${inflow} · Going out: ${outflow}`,
  overdueNote: (n: number) => (n === 1 ? "1 item dated before today is counted today." : `${n} items dated before today are counted today.`),
  outsideNote: (n: number, date: string) => (n === 1 ? `1 item falls after ${date} and isn't in this 30-day view.` : `${n} items fall after ${date} and aren't in this 30-day view.`),
  chartTitle: "Cash balance over the next 30 days",
  legendExpected: "Solid line: as expected",
  legendLate: "Dashed line: ticked payments 15 days late",
  tableTitle: "Show the day-by-day table",
  colDate: "Date",
  colIn: "In",
  colOut: "Out",
  colBalance: "Balance (expected)",
  colLateBalance: "Balance (if late)",
  assumptionsTitle: "Assumptions",
  assumptions: [
    "Payments from clients are expected, not guaranteed.",
    "Anything dated before today is counted today.",
    "Money in and out on the same day is netted.",
    "The late scenario moves only the payments you tick by 15 days. Bills are never moved.",
    "Items after the 30-day window are listed but not counted.",
    "Nothing here is saved, and this is not financial advice.",
  ],
} as const;
