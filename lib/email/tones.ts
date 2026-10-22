export type Tone = "friendly" | "firm" | "formal";
export const TONE_IDS: Tone[] = ["friendly", "firm", "formal"];

// `when` is shown on the tone cards; `style` steers the model (IMPLEMENTATION_PLAN.md section 5.4).
export const TONES: Record<Tone, { label: string; when: string; style: string }> = {
  friendly: {
    label: "Friendly",
    when: "Good relationship, first gentle nudge.",
    style:
      "Warm and appreciative of the working relationship. A gentle first nudge. Short, plain sentences. Greet the finance team; no individual's name is known.",
  },
  firm: {
    label: "Firm",
    when: "You've already reminded them once.",
    style:
      "Courteous but direct. Says plainly that this follows an earlier reminder and asks for a firm payment date. No apologising for asking. Still respectful, never threatening.",
  },
  formal: {
    label: "Formal",
    when: "Large company, finance team, you want a clear paper trail.",
    style:
      "Formal business English for a large company's accounts payable team. Structured and neutral, with a clear reference line and the figures set out one per line.",
  },
};
