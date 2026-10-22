# Project context: Overdue Invoice Recovery for Service MSEs (hackathon MVP)

Read these before writing code: `IMPLEMENTATION_PLAN.md`, `docs/LEGAL_RULES_SPEC.md`, `docs/golden-vectors.json`, `reference/msme-engine.reference.mjs`. For any UI work, `REDESIGN.md` is the design spec (product name: FortyFive).

## What it is
A no-login, five-screen Next.js app on Vercel. Founder uploads an unpaid invoice (PDF/photo) -> AI extracts fields -> founder confirms + adds 3 facts -> TypeScript computes legal due date, days overdue and MSMED Act s.16 interest -> founder picks a tone -> AI drafts a payment-chaser email -> code verifies every number -> founder copies it or opens it in their own email app.

## Non-negotiable rules
1. **AI never does arithmetic or legal logic.** All dates, interest, eligibility and number checks are plain TypeScript in `lib/engine` and `lib/email/check.ts`.
2. **The email model receives pre-formatted fact strings and must reuse them verbatim.** The checker rejects any digit not inside an approved string. Do not weaken it.
3. **Nothing is stored, logged or sent automatically.** No database, no file storage, no auth, no analytics that capture invoice content. Never `console.log` file bytes, extracted fields or email bodies.
4. **Secrets only in env vars.** `GEMINI_API_KEY` is read server-side only. No `NEXT_PUBLIC_` secrets. `.env*` is gitignored; `.env.example` has empty values.
5. **All dates are ISO `YYYY-MM-DD` strings; "today" is Asia/Kolkata.** `lib/engine` must not call `new Date()`; `asOf` is passed in.
6. **Treat AI output and uploaded content as untrusted.** Validate with zod; sanitise strings (length cap, strip control characters) before they reach another prompt.
7. **Legal humility.** Every results/email screen shows "Not legal advice". Use "may be owed"; never threaten; never mention lawyers, courts or the ODR portal inside the email.
8. **The journey must never dead-end.** Extraction failure -> manual entry. Draft failing the check twice or API down -> deterministic template.
9. **Golden vectors are law.** `tests/golden.test.ts` must reproduce `docs/golden-vectors.json` exactly. If you believe a vector is wrong, say so and stop; do not edit the vector to make a test pass. The only exception is when the user explicitly asks for a CalcGuru reconciliation, in which case regenerate vectors in a separate, labelled commit and list every vector that changed.

## AI provider: Google Gemini (`@google/genai`), NOT Anthropic
The project owner chose Gemini. Do not add or import `@anthropic-ai/sdk`. Syntax below was read from the installed package's types (`node_modules/@google/genai/dist/genai.d.ts`), not recalled.
```ts
import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });   // see lib/ai/client.ts
const res = await ai.models.generateContent({
  model: MODEL,                                    // process.env.GEMINI_MODEL || default; see lib/ai/client.ts
  contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: base64 } }, { text }] }],  // file part BEFORE text
  config: {
    systemInstruction: "...",
    responseMimeType: "application/json",
    maxOutputTokens: 8192,                         // thinking models may count reasoning tokens in this limit
    abortSignal: AbortSignal.timeout(50_000),      // < route maxDuration of 60 s
  },
});
// res.text is string | undefined. Always check res.promptFeedback?.blockReason and
// res.candidates?.[0]?.finishReason !== FinishReason.STOP (MAX_TOKENS, SAFETY, ...) before trusting it.
```
- Env vars: `GEMINI_API_KEY`, `GEMINI_MODEL` (optional). Model ids change often; the default in `lib/ai/client.ts` is `gemini-3.5-flash` (confirmed working with a live key on 22 Oct 2026; `gemini-3-flash-preview` was free-tier exhausted that day). The owner verifies it once with `curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"` and overrides via `GEMINI_MODEL` if needed.
- **JSON mode + zod, no server-side schema.** We send `responseMimeType: "application/json"` and describe the exact shape in the prompt, then validate with zod and retry once on malformed output only. Whether the model accepts `responseJsonSchema` (nullable types, `anyOf`) was not testable without a key; add it only after trying it live.
- Do **not** set `temperature` (Gemini 3 is tuned for its default). `thinkingConfig` is used **only for email drafting**, as `{ thinkingLevel: ThinkingLevel.LOW }`, with an automatic retry without it on a 400 (models without thinking support). Found live: uncapped, drafts took 26-33 s and most ended in `finishReason: MAX_TOKENS` even at `maxOutputTokens: 8192`, because thinking tokens count against it. Extraction is fast uncapped, so it has no `thinkingConfig`.
- **Free-tier limits (found live, 22 Oct 2026):** the free tier allows **20 requests per day per model** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`); one journey costs at least 2 (read + draft). Exceeding it returns 429 for about 23 h, and the app then serves the standard template draft. Use a billing-enabled key for demos, testing and real invoices. A 503 "high demand" is transient: the draft loop retries it up to twice (1.5 s pause); extraction does not.
- **Model availability (checked live, 22 Oct 2026, one key):** `gemini-3.5-flash` fast and working; `gemini-3.7-flash` working; `gemini-3.6-flash` working but slow; `gemini-3.8-flash` hung past 30 s then 503; `gemini-3.1-flash-lite` 503; `gemini-2.5-flash` and `gemini-2.5-flash-lite` return 404 (gone). Re-check with the models list call before relying on this.
- The number check also rejects internal field names written into prose (`totalDue`, `lastPayableDate`, ... seen in live drafts) and the words lawyer / court / notice / complaint / portal / council (a live draft titled itself "Overdue Payment Notice").
- **Model chain (`getModels()` in `lib/ai/client.ts`):** primary `GEMINI_MODEL` (default `gemini-3.5-flash`) then `GEMINI_FALLBACK_MODELS` (comma list; empty = `gemini-3.7-flash,gemini-3.6-flash`; `none` = no fallbacks). On 429, 503, 500, 504 or 404 (`SWITCH_STATUSES`) extraction and drafting move to the next model: free-tier quota is counted **per model**. Timeouts, 400/401, blocked or truncated answers do NOT switch (another model would not fix them). A malformed answer or a failed number check is retried on the same model. Extraction reports `rate_limited` only if every model was rate limited. The last model keeps the short pause-and-retry for a 503. Logs carry the status and model id only.
- Errors: `e instanceof ApiError && e.status === 429` -> rate limited; everything else -> `ai_failed`. Never string-match messages. Never retry timeouts or 429s on the same model.
- **Privacy:** on Google's free/unpaid API tier, prompts and responses may be used to improve Google products and read by human reviewers (per Google's Gemini API terms as quoted in 2024; re-check the current terms). For real client invoices use a billing-enabled (paid) key, and never put a real invoice through a free-tier key for a demo.
- Route handlers: `export const runtime = "nodejs"; export const maxDuration = 60;`.
- If any SDK call does not compile as written here, fix it from the installed package's types; do not guess new APIs.

## Next.js 16 notes (found while scaffolding)
- `AGENTS.md` (generated by create-next-app) says this Next version differs from older knowledge: check `node_modules/next/dist/docs/` before using a Next API you are unsure about.
- `cacheComponents` / `partialPrefetching` are deliberately OFF in `next.config.ts`. With them on, the `runtime` export is forbidden and `process.env` reads in GET handlers can be prerendered at build time. Do not turn them on.
- The scaffold's `.gitignore` ignores `.env*`; `.env.example` is explicitly re-included. Keep it that way.
- A stray `C:\Users\brije\package-lock.json` makes Next warn about the workspace root; the warning is harmless.

## Conventions
TypeScript strict. Small pure functions. Named exports. Tailwind only. Mobile-first, one column, 16px base text, visible focus states, labels on every input. Commit after each phase with a message naming the phase. Run `npm run build && npm test` before each commit.
