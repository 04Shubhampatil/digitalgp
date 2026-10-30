import { describe, expect, it } from "vitest";
import { findSection, sectionsForPage } from "@/config/sections";

const ok = (page: Parameters<typeof findSection>[0], key: string, data: unknown) => {
  const def = findSection(page, key);
  if (!def) throw new Error(`missing ${page}/${key}`);
  return def.schema.safeParse(data).success;
};

const banner = { layout: "image-right", heading: { en: "Projects" } };
const MEDIA = "cjld2cjxh0000qzrmn831i7rn";

describe("registry: projects, schemes and extra home / about blocks", () => {
  const expected: Record<string, string[]> = {
    projects: ["banner", "top-stats", "before-after-gallery", "village-resolution-tracker", "impact-dashboard", "financial-overview", "success-stories", "development-suggestions"],
    schemes: ["banner", "category-strip", "coverage-map", "statistics", "success-stories", "quick-actions"],
    home: ["banner", "weather", "whats-new", "achievements", "about-cards", "notice-categories", "notices"],
    about: ["banner", "leaders-profile-grid", "roles-cards", "emergency-services"],
  };
  for (const [page, keys] of Object.entries(expected)) {
    it(`${page} registers every listed section`, () => {
      const registered = sectionsForPage(page as never).map((s) => s.key);
      for (const k of keys) expect(registered).toContain(k);
    });
  }

  it("projects: before/after images need media ids and the tracker accepts known statuses only", () => {
    expect(ok("projects", "before-after-gallery", { items: [{ beforeImageId: MEDIA, afterImageId: MEDIA, title: { en: "Road" }, order: 1 }] })).toBe(true);
    expect(ok("projects", "before-after-gallery", { items: [{ beforeImageId: "not valid!", afterImageId: MEDIA, title: { en: "Road" }, order: 1 }] })).toBe(false);
    expect(ok("projects", "village-resolution-tracker", { items: [{ title: { en: "Drain" }, status: "stuck" }] })).toBe(false);
    expect(ok("projects", "village-resolution-tracker", { items: [{ title: { en: "Drain" }, status: "resolved" }] })).toBe(true);
  });

  it("schemes: coverage counts must be non-negative whole numbers", () => {
    const coverage = (households: number) => ({ wards: [{ wardNo: "1", households, beneficiaries: 10 }] });
    expect(ok("schemes", "coverage-map", coverage(120))).toBe(true);
    expect(ok("schemes", "coverage-map", coverage(-1))).toBe(false);
    expect(ok("schemes", "coverage-map", coverage(1.5))).toBe(false);
  });

  it("schemes: quick action links must be absolute https or site paths", () => {
    const action = (buttonLink: string) => ({ items: [{ icon: "form", title: { en: "Apply" }, buttonText: { en: "Apply" }, buttonLink, active: true }] });
    expect(ok("schemes", "quick-actions", action("/schemes/apply"))).toBe(true);
    expect(ok("schemes", "quick-actions", action("javascript:alert(1)"))).toBe(false);
  });

  it("home weather: the manual fallback needs the current block and up to seven forecast days", () => {
    const current = { temperature: "31°C", humidity: "82%", wind: "18 km/h", feelsLike: "36°C", condition: "Partly cloudy" };
    expect(ok("home", "weather", { current, forecast: [{ date: "2026-10-30", icon: "01d", maxTemp: "33°C", minTemp: "18°C" }] })).toBe(true);
    expect(ok("home", "weather", { forecast: [] })).toBe(false);
  });

  it("about: emergency numbers accept digits and reject letters", () => {
    const numbers = (number: string) => ({ items: [{ title: { en: "Ambulance" }, number, category: "health", icon: "ambulance", active: true }] });
    expect(ok("about", "emergency-services", numbers("108"))).toBe(true);
    expect(ok("about", "emergency-services", numbers("call us"))).toBe(false);
  });

  it("banner blocks registered on the new pages keep the shared rules", () => {
    expect(ok("projects", "banner", { ...banner, ctas: [{ label: { en: "x" }, linkType: "external", href: "http://insecure.example", openInNewTab: true }] })).toBe(false);
    expect(ok("projects", "banner", { ...banner, ctas: [{ label: { en: "x" }, linkType: "external", href: "https://example.gov.in", openInNewTab: true }] })).toBe(true);
  });
});
