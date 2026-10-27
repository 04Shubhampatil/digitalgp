import { describe, expect, it } from "vitest";
import { editorSpec } from "@/config/section-editors";
import { requiredErrors, toApiData, toFormValues } from "./section-data";

const hero = editorSpec("home", "hero")!;
const stats = editorSpec("home", "quick-stats")!;
const geo = editorSpec("about", "geography")!;

describe("section-data", () => {
  it("round-trips API data through form values", () => {
    const data = { title: { en: "Welcome", mr: "स्वागत" }, cta: { label: { en: "Explore" }, href: "/x" }, backgroundImageId: "clmediaid0001" };
    const form = toFormValues(hero, data);
    expect(form.subtitle).toEqual({ en: "", mr: "" });
    expect(toApiData(hero, form)).toEqual(data);
  });

  it("drops empty bilingual objects, groups and strings", () => {
    const form = toFormValues(hero, null);
    expect(toApiData(hero, form)).toEqual({});
  });

  it("parses numbers and integers", () => {
    const form = toFormValues(geo, { population: 2857, areaSqKm: 12.5 });
    expect(form.population).toBe("2857");
    const api = toApiData(geo, { ...form, wards: "7", pinCode: "" });
    expect(api).toEqual({ population: 2857, areaSqKm: 12.5, wards: 7 });
  });

  it("keeps item arrays and reports required fields per row", () => {
    const form = toFormValues(stats, { items: [{ label: { en: "Population" }, value: "2,857" }, { label: {}, value: "" }] });
    expect(requiredErrors(stats, form)).toEqual({ "items.1.label": "required", "items.1.value": "required" });
    expect(toApiData(stats, form).items).toEqual([{ label: { en: "Population" }, value: "2,857" }, {}]);
  });
});
