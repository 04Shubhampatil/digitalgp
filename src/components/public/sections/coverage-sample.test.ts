import { describe, expect, it } from "vitest";
import { DEMO_WARDS, sampleWardsFor } from "./coverage-sample";

describe("sample coverage wards", () => {
  it("has three wards with details", () => {
    expect(DEMO_WARDS.map((w) => w.wardNo)).toEqual(["1", "2", "3"]);
    for (const w of DEMO_WARDS) expect(w.households).toBeGreaterThan(0);
  });

  it("is stable for the same scheme and keeps the ward numbers", () => {
    const a = sampleWardsFor(DEMO_WARDS, "scheme-a");
    expect(sampleWardsFor(DEMO_WARDS, "scheme-a")).toEqual(a);
    expect(a.map((w) => w.wardNo)).toEqual(["1", "2", "3"]);
  });

  it("changes the figures between schemes, so the map colours change", () => {
    const ids = ["a1", "b2", "c3", "d4", "e5", "f6"];
    const sets = new Set(ids.map((id) => JSON.stringify(sampleWardsFor(DEMO_WARDS, id).map((w) => w.households))));
    expect(sets.size).toBeGreaterThan(1);
  });

  it("'All schemes' shows the base figures", () => {
    expect(sampleWardsFor(DEMO_WARDS, "").map((w) => w.households)).toEqual(DEMO_WARDS.map((w) => w.households));
  });
});
