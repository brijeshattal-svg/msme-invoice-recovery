export type Tone = "relationship" | "checkin" | "friendly" | "firm" | "finance" | "formal" | "lastReminder";
export const TONE_IDS: Tone[] = ["relationship", "checkin", "friendly", "firm", "finance", "formal", "lastReminder"];

// Two groups of three on the tone screen (F2). Ids friendly/firm/formal are unchanged.
export const TONE_GROUPS: { title: string; ids: Tone[] }[] = [
  { title: "Keep the relationship warm", ids: ["relationship", "checkin", "friendly", "firm"] },
  { title: "For finance teams and later reminders", ids: ["finance", "formal", "lastReminder"] },
];

/**
 * `when` and `preview` are shown on the tone cards; `style` steers the model
 * (IMPLEMENTATION_PLAN.md section 5.4). Previews contain no digits.
 */
export const TONES: Record<Tone, { label: string; when: string; preview: string; style: string }> = {
  relationship: {
    label: "Relationship-first",
    when: "Retainer or repeat clients you want to keep close.",
    preview: "“Thank you for the work we've done together. This has probably slipped through…”",
    style:
      "Warm and grateful, written by a founder to a long-standing or retainer client. Thank them for the work together, assume an honest oversight on their side, and ask simply for an expected payment date. Short, personal sentences. Greet the team; no individual's name is known.",
  },
  checkin: {
    label: "Gentle check-in",
    when: "You'd rather not mention interest yet, just find out where things stand.",
    preview: "“Just checking in on where this stands…”",
    style:
      "A light, low-pressure check-in from a founder who simply wants to know where the payment stands and whether anything is holding it up. State the invoice number, invoice date, amount, due date and how many days overdue, and ask when the payment can be expected. Do NOT mention interest, the interest basis, the total now due, or any concession. No pressure and no deadline. Greet the finance team; no individual's name is known.",
  },
  friendly: {
    label: "Friendly",
    when: "Good relationship, first gentle nudge.",
    preview: "“A quick heads-up that may be useful on your side…”",
    style:
      "Warm and appreciative of the working relationship. A gentle first nudge. Short, plain sentences. Greet the finance team; no individual's name is known.",
  },
  firm: {
    label: "Firm",
    when: "You've already reminded them once.",
    preview: "“I'm following up on my earlier reminder…”",
    style:
      "Courteous but direct. Says plainly that this follows an earlier reminder and asks for a firm payment date. No apologising for asking. Still respectful, never threatening.",
  },
  finance: {
    label: "Finance-team ready",
    when: "Large companies and procurement teams that process by reference.",
    preview: "“Requesting the payment status of the invoice below…”",
    style:
      "Crisp and structured for an accounts payable or procurement desk that processes payments by reference. Lead with the invoice number, set out invoice date, amount, due date, days overdue, interest and total one per line, and ask for two things: the current payment status and the scheduled payment date. Neutral, efficient, a clean paper trail. No small talk.",
  },
  formal: {
    label: "Formal",
    when: "Large company, finance team, you want a clear paper trail.",
    preview: "“Dear Accounts Payable team, for your information…”",
    style:
      "Formal business English for a large company's accounts payable team. Structured and neutral, with a clear reference line and the figures set out one per line.",
  },
  lastReminder: {
    label: "Last friendly reminder",
    when: "Several reminders sent and no reply. Still polite.",
    preview: "“We'd much rather settle this directly with you…”",
    style:
      "Calm, polite and clear that this is a final friendly reminder after earlier ones. Ask for payment or a confirmed payment date by the reply-by date in FACTS (replyByDate), copied verbatim. Say the founder would much rather settle this directly and keep working together. No threats, no consequences, and no mention of any outside body, authority or process.",
  },
};
