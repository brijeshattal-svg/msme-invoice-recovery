import { describe, expect, it } from "vitest";
import { envExampleProblems, findSecrets, isForbiddenPath, scanTrackedFiles } from "../scripts/check-secrets.mjs";

// Fake keys are assembled at runtime so this file never contains a key-shaped literal itself.
const fake = (prefix: string, n: number, ch = "x") => prefix + ch.repeat(n);

describe("findSecrets", () => {
  it.each([
    ["Anthropic", fake("sk-" + "ant-", 30)],
    ["Google AIza", fake("AI" + "za", 35)],
    ["Google AQ.", fake("AQ" + ".", 40)],
    ["GitHub", fake("gh" + "o_", 36)],
    ["private key", "-----BEGIN " + "RSA PRIVATE KEY-----"],
  ])("flags a %s key, masked", (_n, key) => {
    const found = findSecrets(`const k = "${key}";`);
    expect(found).toHaveLength(1);
    expect(found[0].line).toBe(1);
    expect(found[0].preview).toMatch(/…$/);
    expect(found[0].preview.length).toBeLessThan(10); // never echoes the whole key
  });

  it("does not flag the plain words the docs use", () => {
    expect(findSecrets('Run git grep -i "sk-ant" and check AIza keys.')).toEqual([]);
  });
});

describe("env files", () => {
  it("forbids real env files anywhere but allows the template", () => {
    expect(isForbiddenPath(".env")).toBe(true);
    expect(isForbiddenPath(".env.local")).toBe(true);
    expect(isForbiddenPath("app/.env.production")).toBe(true);
    expect(isForbiddenPath(".env.example")).toBe(false);
    expect(isForbiddenPath("lib/envelope.ts")).toBe(false);
  });

  it("requires every .env.example value to be empty", () => {
    expect(envExampleProblems("GEMINI_API_KEY=\nGEMINI_MODEL=\n")).toEqual([]);
    expect(envExampleProblems("# comment\nGEMINI_API_KEY=abc\n")).toEqual([{ line: 2, key: "GEMINI_API_KEY" }]);
  });
});

describe("this repository", () => {
  it("has no secrets or env files tracked", () => {
    const { files, problems } = scanTrackedFiles();
    expect(files).toBeGreaterThan(50);
    expect(problems).toEqual([]);
  });
});
