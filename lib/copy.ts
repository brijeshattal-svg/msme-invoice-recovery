// User-facing strings. Kept in one place so legal wording can be reviewed in one read.
export const COPY = {
  headline: "Is your client paying you late? Find out what you're owed and what to say.",
  privacy: "Your file is sent to an AI service to be read. We don't save it.",
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
  agreementNote: "Terms printed on an invoice are not the same as a signed agreement.",
  acceptanceHelp: "If they didn't object in writing within 15 days of delivery, use the delivery date.",
  unreadable: "We couldn't read this",
  pleaseCheck: "Please check",
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
  figuresNote: "Figures are based on the details you entered. We have not verified them.",
  notAdvice: "Not legal advice.",
  back: "Back",
  chooseTone: "Choose a tone",
  checkAnother: "Check another invoice",

  // overdue
  interestSuffix: "interest owed so far", // follows the big interest amount
  totalNowDueLine: (total: string) => `Total now due ${total}`,
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
    "Interest is charged at three times the RBI Bank Rate in force on each day. It builds up day by day on the amount owed at the start of each calendar month, using a 365-day year, and is added to the amount owed at the end of the month, so the next month's interest is worked out on a slightly larger amount.",
  ratesLoaded: (date: string) => `RBI rates loaded up to ${date}`,

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
  writing: "Writing your email...",
  checkedChip: "Numbers checked against your calculation",
  templateChip: "Standard draft (AI was unavailable)",
  subjectLabel: "Subject",
  bodyLabel: "Email",
  copy: "Copy email",
  open: "Open in my email app",
  changeTone: "Change tone",
  back: "Back",
  copied: "Copied. Paste it into your email.",
  copiedWithPlaceholders: "Copied. Remember to replace the highlighted parts first.",
  copyFailed: "Couldn't copy automatically. Select the text and copy it yourself.",
  draftLong: "Draft is long. We copied it, paste it into your email.",
  placeholderWarning: "Replace the highlighted parts, like [Your name], before you send.",
  edited: "You edited the draft. Numbers are no longer auto-checked.",
  strayWarning: (tokens: string) =>
    `Check these before sending. They are not figures from your calculation: ${tokens}`,
  disclaimer: "Not legal advice. Review before sending. You send this yourself from your own email.",
  notOverdue: "This invoice isn't overdue today, so there is nothing to draft.",
} as const;
