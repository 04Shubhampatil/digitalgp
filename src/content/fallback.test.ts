import { describe, expect, it } from "vitest";
import type { PublicPageDto } from "@/types/api";
import { bannerSeed } from "@/lib/banner-seed";
import { withFallback } from "./fallback";

const seo = { titleEn: null, titleMr: null, descriptionEn: null, descriptionMr: null, shareImageId: null };
const page = (pageKey: string, sections: { sectionKey: string; data: Record<string, unknown> }[]): PublicPageDto => ({
  pageKey,
  seo,
  sections: sections.map((s, i) => ({ ...s, sortOrder: i, publishedAt: "2026-11-17T00:00:00.000Z" })),
});
const keys = (p: PublicPageDto) => p.sections.map((s) => s.sectionKey);

describe("banner and hero on public pages", () => {
  it("home: a filled-in banner replaces the hero and comes first", () => {
    const out = withFallback("home", page("home", [
      { sectionKey: "hero", data: { title: { en: "Old hero" } } },
      { sectionKey: "banner", data: { layout: "image-right", heading: { en: "New banner" } } },
    ]));
    expect(keys(out)).not.toContain("hero");
    expect(out.sections[0]!.sectionKey).toBe("banner");
    expect(keys(out).filter((k) => k === "banner")).toHaveLength(1);
  });

  it("home: an empty banner is skipped and the hero stays", () => {
    const out = withFallback("home", page("home", [
      { sectionKey: "hero", data: { title: { en: "Hero" } } },
      { sectionKey: "banner", data: { layout: "full-background" } },
    ]));
    expect(keys(out)).toContain("hero");
    expect(keys(out)).not.toContain("banner");
  });

  it("home: a banner without a picture keeps the design photo", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "banner", data: { layout: "image-right", heading: { en: "New banner" } } }]));
    expect(out.sections[0]!.data.fallbackImageUrl).toBe("/images/figma/home-hero.png");
  });

  it("home: an uploaded banner picture is not replaced", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "banner", data: { layout: "image-right", heading: { en: "New banner" }, imageId: "m1" } }]));
    expect(out.sections[0]!.data.fallbackImageUrl).toBeUndefined();
  });

  it("inner page: a filled-in banner replaces the design hero", () => {
    const out = withFallback("finance", page("finance", [{ sectionKey: "banner", data: { layout: "full-background", heading: { en: "Finance" } } }]));
    expect(keys(out)).toContain("banner");
    expect(keys(out)).not.toContain("page-hero");
  });

  it("inner page: without a banner the design hero is shown", () => {
    const out = withFallback("finance", null);
    expect(keys(out)).toContain("page-hero");
  });
});

describe("bannerSeed (what the Banner card shows before it is saved)", () => {
  it("home: takes the heading, picture and at most two buttons of the hero", () => {
    const seed = bannerSeed("home", {
      title: { en: "Welcome", mr: "स्वागत" },
      subtitle: { en: "Sub" },
      backgroundImageId: "m1",
      actions: [
        { label: { en: "A" }, href: "page:about" },
        { label: { en: "B" }, href: "https://example.org" },
        { label: { en: "C" }, href: "page:services" },
      ],
    })!;
    expect(seed.heading).toEqual({ en: "Welcome", mr: "स्वागत" });
    expect(seed.imageId).toBe("m1");
    expect(seed.ctas).toHaveLength(2);
    expect((seed.ctas as { linkType: string }[]).map((c) => c.linkType)).toEqual(["page", "external"]);
  });

  it("home: falls back to the design hero when the website has none", () => {
    expect(bannerSeed("home", undefined)?.heading).toMatchObject({ en: expect.stringContaining("Sustainable") });
  });

  it("inner page: uses the design hero of that page", () => {
    const seed = bannerSeed("finance", undefined)!;
    expect(seed.supportingText).toMatchObject({ en: expect.stringContaining("Financial Information") });
    expect((seed.heading as { en: string }).en).toContain("Accountability");
  });
});
