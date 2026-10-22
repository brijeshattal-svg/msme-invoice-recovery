import { GoogleGenAI } from "@google/genai";

// Model ids change often. Env vars override these without a code change.
// `||` (not `??`) so an empty GEMINI_MODEL= line in .env falls back to the default.
const DEFAULT_PRIMARY = "gemini-3.5-flash";
// Tried in order when the primary is out of quota (429), busy (503/500/504) or gone (404).
// Free-tier quota is counted per model, so each fallback adds its own daily allowance.
// Timed live on 22 Oct 2026 with the real sample PDF: flash-lite-latest answered in 6.5 s;
// 3.7-flash hung past 45 s; 3.6-flash and 3.5-flash-lite had network errors; 3.8-flash and
// 3.1-flash-lite returned 503. Preview models are flaky, so re-time these before relying on them.
const DEFAULT_FALLBACKS = ["gemini-flash-lite-latest", "gemini-3.7-flash"];

export const MODEL = process.env.GEMINI_MODEL || DEFAULT_PRIMARY;

/**
 * The models to try, in order, primary first. Read at call time so tests and deployments can
 * change the environment. GEMINI_FALLBACK_MODELS is a comma list; unset or empty uses the
 * defaults; the single word "none" turns fallbacks off. Duplicates are dropped.
 */
export function getModels(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY;
  const raw = process.env.GEMINI_FALLBACK_MODELS?.trim();
  const fallbacks =
    !raw ? DEFAULT_FALLBACKS : raw.toLowerCase() === "none" ? [] : raw.split(",").map((m) => m.trim()).filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

let client: GoogleGenAI | null = null;

/** Server-side only. Throws if the key is missing; callers map that to ai_failed. */
export function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** HTTP statuses that mean "this model can't serve you right now": move on to the next model. */
export const SWITCH_STATUSES = [429, 404, 500, 503, 504];

/**
 * A call that timed out or never reached the API ("fetch failed") says nothing about the request:
 * a different model may well answer, so it also moves the chain on. A missing key is a plain Error
 * and does not.
 */
export const isNetworkFailure = (e: unknown): boolean =>
  e instanceof Error && ["AbortError", "TimeoutError", "TypeError"].includes(e.name);

/** A model that is not the last one gets a short leash so a hung model cannot eat the whole budget. */
export const NON_LAST_TIMEOUT_MS = 20_000;
