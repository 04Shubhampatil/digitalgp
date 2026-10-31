import { describe, expect, it } from "vitest";
import { PAGE_KEYS } from "@/config/pages";
import { SECTION_EDITORS } from "@/config/section-editors";
import { SECTION_REGISTRY } from "@/config/sections";
import { toApiData, toFormValues } from "@/lib/section-data";

describe("admin editor coverage", () => {
  it("has an editor for every section the backend registers, and no editor without a section", () => {
    const problems: string[] = [];
    for (const page of PAGE_KEYS) {
      const reg = SECTION_REGISTRY[page] ?? [];
      const eds = SECTION_EDITORS[page] ?? [];
      const have = new Set(eds.map((e) => e.key));
      const known = new Set(reg.map((r) => r.key));
      for (const r of reg) if (!have.has(r.key)) problems.push(`no editor: ${page}/${r.key}`);
      for (const e of eds) if (!known.has(e.key)) problems.push(`no section: ${page}/${e.key}`);
    }
    expect(problems).toEqual([]);
  });
});

describe("json fields", () => {
  const spec = { key: "x", labelKey: "x", fields: [{ name: "geometry", type: "json" as const, labelKey: "geometry" }] };

  it("shows stored data as formatted text and sends it back as data", () => {
    const geometry = { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    const form = toFormValues(spec, { geometry });
    expect(typeof form.geometry).toBe("string");
    expect(toApiData(spec, form)).toEqual({ geometry });
  });

  it("omits an empty field and passes invalid text through for the backend to reject", () => {
    expect(toApiData(spec, { geometry: "" })).toEqual({});
    expect(toApiData(spec, { geometry: "{ not json" })).toEqual({ geometry: "{ not json" });
  });
});
