import { ApiError, FinishReason, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { checkEmail, type Email } from "@/lib/email/check";
import type { Facts } from "@/lib/email/facts";
import { buildDraftPrompt, DRAFT_SYSTEM_PROMPT, feedbackFrom } from "@/lib/email/prompt";
import { buildTemplate } from "@/lib/email/template";
import type { Tone } from "@/lib/email/tones";
import { getClient, getModels, SWITCH_STATUSES } from "./client";

export type DraftResult = Email & { source: "ai" | "template"; redrafts: number };

const DraftSchema = z.object({ subject: z.string().min(1), body: z.string().min(1) });

const MAX_ATTEMPTS = 3; // first draft + up to 2 redrafts
const BUDGET_MS = 50_000; // all attempts together, under the route's maxDuration of 60 s
const PER_CALL_MS = 40_000; // thinking models can take 15-30 s on a first call
const MIN_CALL_MS = 8_000; // not worth starting a call with less time than this
const MAX_TRANSIENT_RETRIES = 2; // overloaded model (503 etc.): short pause, then try again
const TRANSIENT_PAUSE_MS = 1_500;
const TRANSIENT_STATUSES = [500, 503, 504];

class CallError extends Error {
  constructor(
    public kind: "api" | "bad_output",
    public transient = false,
    public status?: number,
  ) {
    super(kind);
  }
}

/** Untrusted model text: one-line subject, control characters stripped, lengths capped. */
function sanitize(e: Email): Email {
  return {
    subject: e.subject.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200),
    body: e.body
      .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, " ")
      .trim()
      .slice(0, 6000),
  };
}

async function callOnce(model: string, prompt: string, timeoutMs: number, capThinking: boolean): Promise<Email> {
  let res;
  try {
    res = await getClient().models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: DRAFT_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        // Thinking models spend maxOutputTokens on reasoning too. Seen live with no cap: every draft
        // took 26-33 s and most ended in MAX_TOKENS even at 8192, because the model deliberates over
        // the "no stray digits" rule. A short email needs little reasoning, and the number check
        // (plus redraft) is the real safeguard, so cap thinking at LOW.
        maxOutputTokens: 8192,
        ...(capThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        abortSignal: AbortSignal.timeout(timeoutMs),
      },
    });
  } catch (e) {
    // Log the HTTP status or error name only: never the prompt, the facts or the email (CLAUDE.md rule 3).
    console.info(`draft model_error ${e instanceof ApiError ? `status=${e.status}` : `name=${e instanceof Error ? e.name : "unknown"}`} model=${model}`);
    // A busy model (503 and friends) is worth a short retry; 429s, timeouts and a missing key are not.
    const status = e instanceof ApiError ? e.status : undefined;
    throw new CallError("api", status !== undefined && TRANSIENT_STATUSES.includes(status), status);
  }
  if (res.promptFeedback?.blockReason) {
    console.info(`draft model_blocked reason=${res.promptFeedback.blockReason}`);
    throw new CallError("api");
  }
  const finish = res.candidates?.[0]?.finishReason;
  if (finish !== undefined && finish !== FinishReason.STOP) {
    console.info(`draft model_finish reason=${finish}`);
    throw new CallError("api");
  }
  const text = res.text;
  if (!text) {
    console.info("draft model_empty");
    throw new CallError("api");
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new CallError("bad_output");
  }
  const parsed = DraftSchema.safeParse(json);
  if (!parsed.success) throw new CallError("bad_output");
  return sanitize(parsed.data);
}

/**
 * Draft -> checkEmail -> redraft (max 2) -> deterministic template. Never throws: any API error,
 * or a draft that still fails the number check, yields the template (CLAUDE.md rule 8).
 */
export async function draftEmail(
  facts: Facts,
  tone: Tone,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<DraftResult> {
  const started = now();
  let feedback: string | undefined;
  let attempts = 0;
  let transientRetries = 0;
  let capThinking = true; // dropped for the rest of this request if the model rejects the setting
  const models = getModels();
  let modelIdx = 0; // advances when a model is out of quota, busy or gone

  while (attempts < MAX_ATTEMPTS) {
    const remaining = BUDGET_MS - (now() - started);
    if (remaining < MIN_CALL_MS) break;
    attempts++;
    let draft: Email;
    try {
      draft = await callOnce(models[modelIdx], buildDraftPrompt(facts, tone, feedback), Math.min(PER_CALL_MS, remaining - 2_000), capThinking);
    } catch (e) {
      if (e instanceof CallError && e.status === 400 && capThinking) {
        capThinking = false; // a model without thinking support rejects thinkingConfig: retry plainly, once
        attempts--;
        continue;
      }
      if (e instanceof CallError && e.kind === "bad_output") {
        feedback = 'Your previous answer was not a valid JSON object of the form {"subject": string, "body": string}.';
        continue;
      }
      if (e instanceof CallError && e.status !== undefined && SWITCH_STATUSES.includes(e.status) && modelIdx < models.length - 1) {
        // Out of quota (429), busy (503/500/504) or gone (404): the next model may work, so go straight there.
        console.info(`draft model_switch to=${models[modelIdx + 1]}`);
        modelIdx++;
        transientRetries = 0;
        attempts--; // no draft was produced, so this does not use up a redraft
        continue;
      }
      if (e instanceof CallError && e.transient && transientRetries < MAX_TRANSIENT_RETRIES) {
        transientRetries++;
        attempts--; // an overloaded model did not produce a draft, so this does not use up a redraft
        await sleep(TRANSIENT_PAUSE_MS);
        continue;
      }
      break; // other API problems: no point retrying inside this request
    }
    const result = checkEmail(draft, facts);
    if (result.ok) return { ...draft, source: "ai", redrafts: attempts - 1 };
    feedback = feedbackFrom(result, facts);
  }

  return { ...buildTemplate(facts, tone), source: "template", redrafts: Math.max(0, attempts - 1) };
}
