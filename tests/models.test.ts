import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getModels, isNetworkFailure, NON_LAST_TIMEOUT_MS, SWITCH_STATUSES } from "@/lib/ai/client";

const saved = { primary: process.env.GEMINI_MODEL, fallbacks: process.env.GEMINI_FALLBACK_MODELS };
beforeEach(() => {
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_FALLBACK_MODELS;
});
afterEach(() => {
  for (const [k, v] of [["GEMINI_MODEL", saved.primary], ["GEMINI_FALLBACK_MODELS", saved.fallbacks]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("getModels", () => {
  it("defaults to gemini-3.5-flash with two fallbacks, primary first", () => {
    expect(getModels()).toEqual(["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.7-flash"]);
  });

  it("GEMINI_MODEL changes the primary and keeps the default fallbacks", () => {
    process.env.GEMINI_MODEL = "gemini-9-pro";
    expect(getModels()).toEqual(["gemini-9-pro", "gemini-flash-lite-latest", "gemini-3.7-flash"]);
  });

  it("an empty GEMINI_MODEL line (as in .env.example) falls back to the default", () => {
    process.env.GEMINI_MODEL = "";
    expect(getModels()[0]).toBe("gemini-3.5-flash");
    process.env.GEMINI_MODEL = "   ";
    expect(getModels()[0]).toBe("gemini-3.5-flash");
  });

  it("GEMINI_FALLBACK_MODELS is a trimmed comma list", () => {
    process.env.GEMINI_FALLBACK_MODELS = " model-a , model-b,, ";
    expect(getModels()).toEqual(["gemini-3.5-flash", "model-a", "model-b"]);
  });

  it("an empty GEMINI_FALLBACK_MODELS line uses the defaults", () => {
    process.env.GEMINI_FALLBACK_MODELS = "";
    expect(getModels()).toEqual(["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-3.7-flash"]);
  });

  it('"none" turns fallbacks off, in any case', () => {
    process.env.GEMINI_FALLBACK_MODELS = "none";
    expect(getModels()).toEqual(["gemini-3.5-flash"]);
    process.env.GEMINI_FALLBACK_MODELS = "NONE";
    expect(getModels()).toEqual(["gemini-3.5-flash"]);
  });

  it("drops duplicates, keeping the first position", () => {
    process.env.GEMINI_MODEL = "gemini-3.7-flash";
    expect(getModels()).toEqual(["gemini-3.7-flash", "gemini-flash-lite-latest"]);
    process.env.GEMINI_FALLBACK_MODELS = "x,x,gemini-3.7-flash";
    expect(getModels()).toEqual(["gemini-3.7-flash", "x"]);
  });

  it("is read at call time, not import time", () => {
    const before = getModels();
    process.env.GEMINI_MODEL = "late-model";
    expect(getModels()[0]).toBe("late-model");
    expect(before[0]).toBe("gemini-3.5-flash");
  });
});

describe("SWITCH_STATUSES", () => {
  it("covers quota, outage and missing-model, and nothing a different model would not fix", () => {
    for (const s of [429, 503, 500, 504, 404]) expect(SWITCH_STATUSES).toContain(s);
    for (const s of [400, 401, 403, 413]) expect(SWITCH_STATUSES).not.toContain(s);
  });
});

describe("isNetworkFailure", () => {
  it("is true for timeouts, aborts and fetch failures, false for everything else", () => {
    expect(isNetworkFailure(Object.assign(new Error("t"), { name: "TimeoutError" }))).toBe(true);
    expect(isNetworkFailure(Object.assign(new Error("a"), { name: "AbortError" }))).toBe(true);
    expect(isNetworkFailure(new TypeError("fetch failed"))).toBe(true);
    expect(isNetworkFailure(new Error("GEMINI_API_KEY is not set"))).toBe(false);
    expect(isNetworkFailure("TimeoutError")).toBe(false);
    expect(isNetworkFailure(undefined)).toBe(false);
  });

  it("keeps a 20 s leash for models that are not the last", () => {
    expect(NON_LAST_TIMEOUT_MS).toBe(20_000);
  });
});
