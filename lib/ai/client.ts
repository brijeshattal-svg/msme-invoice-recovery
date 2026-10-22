import { GoogleGenAI } from "@google/genai";

// Model ids change often. Env vars override these without a code change.
// `||` (not `??`) so an empty GEMINI_MODEL= line in .env falls back to the default.
const DEFAULT_PRIMARY = "gemini-3.5-flash";
// Tried in order when the primary is out of quota (429), busy (503/500/504) or gone (404).
// Free-tier quota is counted per model, so each fallback adds its own daily allowance.
// Checked live on 22 Oct 2026: 3.7 answered (with a 503 at times), 3.6 answered but slowly.
const DEFAULT_FALLBACKS = ["gemini-3.7-flash", "gemini-3.6-flash"];

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
