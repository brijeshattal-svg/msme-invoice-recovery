import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SendScreen } from "@/components/Send";
import { ToneScreen } from "@/components/Tone";
import { buildTemplate } from "@/lib/email/template";
import { TONE_IDS, TONES } from "@/lib/email/tones";
import { initialState, reducer, type DraftState } from "@/lib/wizard";
import { factsFor } from "./helpers";

const facts = factsFor();
const email = buildTemplate(facts, "friendly");
const noop = () => {};

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const ready = (over: Partial<DraftState> = {}): DraftState => ({
  status: "ready",
  subject: email.subject,
  body: email.body,
  source: "ai",
  edited: false,
  ...over,
});
const send = (draft: DraftState) =>
  text(renderToStaticMarkup(<SendScreen draft={draft} facts={facts} onEdit={noop} onChangeTone={noop} onBack={noop} />));

describe("Tone screen", () => {
  it("shows six cards in two groups with the exact one-line guidance, the selected state and the button", () => {
    const html = renderToStaticMarkup(<ToneScreen tone="firm" onSelect={noop} onDraft={noop} onBack={noop} />);
    const t = text(html);
    expect(t).toContain("Friendly Good relationship, first gentle nudge.");
    expect(t).toContain("Firm You've already reminded them once.");
    expect(t).toContain("Formal Large company, finance team, you want a clear paper trail.");
    expect(t).toContain("Draft my email");
    expect(t).toContain("Relationship-first Retainer or repeat clients");
    expect(t).toContain("Finance-team ready");
    expect(t).toContain("Last friendly reminder");
    expect(html.match(/type="radio"/g)).toHaveLength(6);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toMatch(/value="firm"[^>]*checked=""|checked=""[^>]*value="firm"/);
  });

  it("every tone has a label, a 'when to use' line and a style", () => {
    for (const id of TONE_IDS) {
      expect(TONES[id].label.length).toBeGreaterThan(0);
      expect(TONES[id].when.length).toBeGreaterThan(10);
      expect(TONES[id].style.length).toBeGreaterThan(20);
    }
  });
});

describe("Send screen", () => {
  it("loading: shows 'Writing your email...' and no buttons to copy yet", () => {
    const t = send({ status: "loading", subject: "", body: "", source: null, edited: false });
    expect(t).toContain("Writing your email...");
    expect(t).not.toContain("Copy email");
  });

  it("AI draft that passed the check: green chip, subject, body, both actions, disclaimer", () => {
    const t = send(ready());
    expect(t).toContain("Numbers checked against your calculation");
    expect(t).toContain("Subject");
    const html = renderToStaticMarkup(<SendScreen draft={ready()} facts={facts} onEdit={noop} onChangeTone={noop} onBack={noop} />);
    expect(html).toContain(`value="${email.subject}"`); // the subject is an input value, not visible text
    expect(t).toContain(facts.strings.totalDue);
    expect(t).toContain("Copy email");
    expect(t).toContain("Open in my email app");
    expect(t).toContain("Change tone");
    expect(t).toContain("Back");
    expect(t).toContain("Not legal advice. Review before sending. You send this yourself from your own email.");
  });

  it("template draft: grey 'Standard draft' chip and no 'checked' claim", () => {
    const t = send(ready({ source: "template" }));
    expect(t).toContain("Standard draft (AI was unavailable)");
    expect(t).not.toContain("Numbers checked against your calculation");
  });

  it("warns while [Your name] / [Your business] placeholders remain, and highlights them", () => {
    const html = renderToStaticMarkup(<SendScreen draft={ready()} facts={facts} onEdit={noop} onChangeTone={noop} onBack={noop} />);
    expect(text(html)).toContain("Replace the highlighted parts, like [Your name], before you send.");
    expect(html).toContain("<mark");
    expect([...html.matchAll(/<mark[^>]*>([^<]*)<\/mark>/g)].map((m) => m[1]).sort()).toEqual(["[Your business]", "[Your name]"]);
  });

  it("no placeholder warning once they are replaced", () => {
    const body = email.body.replace("[Your name]", "Priya").replace("[Your business]", "Brightline Digital Studio");
    const t = send(ready({ body, edited: true }));
    expect(t).not.toContain("Replace the highlighted parts");
  });

  it("after an edit: shows the 'no longer auto-checked' note instead of the chip", () => {
    const t = send(ready({ edited: true }));
    expect(t).toContain("You edited the draft. Numbers are no longer auto-checked.");
    expect(t).not.toContain("Numbers checked against your calculation");
  });

  it("after an edit that adds a stray number: warns (does not block) and lists it", () => {
    const t = send(ready({ edited: true, body: `${email.body}\n\nPlease pay within 7 days.` }));
    expect(t).toContain("Check these before sending");
    expect(t).toContain("7");
    expect(t).toContain("Copy email"); // never blocked
  });

  it("after an edit that only changes wording: no stray-number warning", () => {
    const t = send(ready({ edited: true, body: email.body.replace("Thank you", "Many thanks") }));
    expect(t).not.toContain("Check these before sending");
  });
});

describe("wizard draft state", () => {
  it("draftLoading moves to Send with a loading draft; drafted fills it; editing marks it edited", () => {
    let s = reducer({ ...initialState, step: "tone" }, { type: "draftLoading" });
    expect(s.step).toBe("send");
    expect(s.draft.status).toBe("loading");
    s = reducer(s, { type: "drafted", subject: "S", body: "B", source: "template" });
    expect(s.draft).toEqual({ status: "ready", subject: "S", body: "B", source: "template", edited: false });
    s = reducer(s, { type: "editDraft", field: "body", value: "B2" });
    expect(s.draft).toMatchObject({ body: "B2", subject: "S", edited: true, source: "template" });
  });

  it("setTone keeps the form and draft; a new draftLoading clears the previous text", () => {
    let s = reducer(initialState, { type: "drafted", subject: "S", body: "B", source: "ai" });
    s = reducer(s, { type: "setTone", tone: "formal" });
    expect(s.tone).toBe("formal");
    expect(s.draft.body).toBe("B");
    s = reducer(s, { type: "draftLoading" });
    expect(s.draft).toMatchObject({ status: "loading", body: "", edited: false });
  });

  it("a new invoice resets the tone and draft", () => {
    let s = reducer(initialState, { type: "setTone", tone: "formal" });
    s = reducer(s, { type: "drafted", subject: "S", body: "B", source: "ai" });
    s = reducer(s, { type: "manual" });
    expect(s.tone).toBe("friendly");
    expect(s.draft.status).toBe("idle");
  });
});
