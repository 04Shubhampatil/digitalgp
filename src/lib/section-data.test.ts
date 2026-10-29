import { describe, expect, it } from "vitest";
import { editorSpec } from "@/config/section-editors";
import { requiredErrors, toApiData, toFormValues } from "./section-data";

const hero = editorSpec("home", "hero")!;
const stats = editorSpec("home", "quick-stats")!;
const geo = editorSpec("about", "geography")!;
const wards = editorSpec("home", "ward-details")!;

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

  it("round-trips nested ward rows and flags missing nested fields", () => {
    const data = { wards: [{ name: { en: "Ward 1" }, items: [{ label: { en: "Roads" }, valueText: "12 / 15 km" }] }] };
    const form = toFormValues(wards, data);
    expect(toApiData(wards, form)).toEqual(data);
    const bad = toFormValues(wards, { wards: [{ name: { en: "Ward 2" }, items: [{ label: {}, valueText: "" }] }] });
    expect(requiredErrors(wards, bad)).toEqual({ "wards.0.items.0.label": "required", "wards.0.items.0.valueText": "required" });
  });
});
