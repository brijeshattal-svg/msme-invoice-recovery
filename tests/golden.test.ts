import { describe, expect, it } from "vitest";
import vectors from "@/docs/golden-vectors.json";
import { compute } from "@/lib/engine";
import type { EngineInput, EngineResult } from "@/lib/engine";

type Vector = { id: string; note: string; input: EngineInput; expected: EngineResult };

describe("golden vectors (docs/golden-vectors.json)", () => {
  const all = vectors as unknown as Vector[];

  it("loads the 13 expected vectors", () => {
    expect(all).toHaveLength(13);
  });

  it.each(all.map((v) => [v.id, v] as const))("%s", (_id, v) => {
    expect(compute(v.input)).toEqual(v.expected);
  });
});
