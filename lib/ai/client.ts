import { GoogleGenAI } from "@google/genai";

// Model ids change often. GEMINI_MODEL overrides the default without a code change.
// `||` (not `??`) so an empty GEMINI_MODEL= line in .env falls back to the default.
export const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

let client: GoogleGenAI | null = null;

/** Server-side only. Throws if the key is missing; callers map that to ai_failed. */
export function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}
