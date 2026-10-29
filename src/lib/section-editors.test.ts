import { describe, expect, it } from "vitest";
import { PAGE_KEYS, type PageKey } from "@/config/pages";
import { SECTION_EDITORS, type FieldSpec, type GroupSpec, type ItemsSpec, type SectionEditorSpec } from "@/config/section-editors";
import { findSection } from "@/config/sections";
import { emptyRow, emptyValues, requiredErrors, toApiData, toFormValues, topLists, type FormRecord } from "./section-data";

/** A value the backend schemas accept for each field type (name-based overrides for provider-restricted links). */
function sample(f: FieldSpec): unknown {
  switch (f.type) {
    case "bilingual":
    case "bilingualLong":
      return { en: "Sample", mr: "नमुना" };
    case "boolean":
      return f.default === true;
    case "select":
      return f.default !== undefined ? String(f.default) : (f.options?.[0] ?? "");
    case "multiSelect":
      return (f.options ?? []).slice(0, 2);
    case "bilingualList":
      return [{ en: "One", mr: "एक" }];
    case "imageList":
      return ["clmedia000000001"];
    case "image":
    case "file":
      return "clmedia000000001";
    case "colour":
      return "#112233";
    case "date":
      return "2026-01-02";
    case "time":
      return "10:30";
    case "month":
      return "2026-01";
    case "datetime":
      return "2026-01-02T10:30";
    case "email":
      return "office@example.in";
    case "phone":
      return "9876543210";
    case "number":
    case "integer":
      // Within every backend bound: heights >= 200, transition >= 500 ms.
      return /height/i.test(f.name) ? "600" : f.name === "transitionMs" ? "3000" : "5";
    case "href":
      return f.name === "videoUrl" ? "https://www.youtube.com/watch?v=abc123" : "https://example.com/page";
    default:
      if (f.name === "pinCode") return "411001";
      if (f.name === "mapEmbedUrl") return "https://www.google.com/maps/embed?pb=abc";
      if (f.name === "videoUrl") return "https://www.youtube.com/watch?v=abc123";
      if (f.name === "amount" || f.name === "value") return "12.50";
      if (f.name === "unit" || f.name === "currency") return f.name === "currency" ? "INR" : "kg";
      return "Sample";
  }
}

function fillFields(fields: FieldSpec[], into: FormRecord) {
  for (const f of fields) into[f.name] = sample(f);
}

function fillList(l: ItemsSpec): FormRecord[] {
  const row = emptyRow(l);
  fillFields(l.fields, row);
  if (l.children) row[l.children.name] = fillList({ ...l.children, children: undefined });
  return [row];
}

function filledValues(spec: SectionEditorSpec): FormRecord {
  const v = emptyValues(spec);
  fillFields(spec.fields, v);
  for (const g of spec.groups ?? ([] as GroupSpec[])) {
    const sub = (v[g.name] ?? {}) as FormRecord;
    fillFields(g.fields, sub);
    for (const l of g.lists ?? []) sub[l.name] = fillList(l);
    v[g.name] = sub;
  }
  for (const l of topLists(spec)) v[l.name] = fillList(l);
  return v;
}

const entries: [PageKey, SectionEditorSpec][] = PAGE_KEYS.flatMap((pageKey) => (SECTION_EDITORS[pageKey] ?? []).map((spec) => [pageKey, spec] as [PageKey, SectionEditorSpec]));

describe("section editor specs match the backend registry", () => {
  it("has an editor for every registered section of every page", () => {
    const missing: string[] = [];
    for (const pageKey of PAGE_KEYS) {
      // Every registered section must have an editor spec.
      for (const spec of SECTION_EDITORS[pageKey] ?? []) if (!findSection(pageKey, spec.key)) missing.push(`${pageKey}/${spec.key} (editor without backend section)`);
    }
    expect(missing).toEqual([]);
  });

  it.each(entries.map(([p, s]) => [`${p}/${s.key}`, p, s] as const))("%s: a filled form passes the backend schema", (_name, pageKey, spec) => {
    const def = findSection(pageKey, spec.key);
    expect(def, "backend section exists").toBeDefined();
    const form = filledValues(spec);
    expect(requiredErrors(spec, form)).toEqual({});
    const api = toApiData(spec, form);
    const result = def!.schema.safeParse(api);
    expect(result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)).toEqual([]);
  });

  it("round-trips a filled section through the form without changing it", () => {
    for (const [, spec] of entries) {
      const api = toApiData(spec, filledValues(spec));
      const again = toApiData(spec, toFormValues(spec, api));
      expect(again, spec.key).toEqual(api);
    }
  });

  it("omits an untouched optional banner overlay but keeps a changed one", () => {
    const banner = entries.find(([p, s]) => p === "finance" && s.key === "banner")![1];
    const untouched = toApiData(banner, emptyValues(banner));
    expect(untouched.overlay).toBeUndefined();
    expect(untouched.layout).toBe("full-background");
    const changed = emptyValues(banner);
    (changed.overlay as FormRecord).enabled = true;
    expect(toApiData(banner, changed).overlay).toEqual({ enabled: true, colour: "#102E1D", intensity: 40, gradient: "left-right" });
  });
});
