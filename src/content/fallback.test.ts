import { describe, expect, it } from "vitest";
import type { PublicPageDto } from "@/types/api";
import { bannerSeed, sectionSeed } from "@/lib/banner-seed";
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

describe("home About block (about-cards)", () => {
  const about = (out: PublicPageDto) => out.sections.find((s) => s.sectionKey === "about-cards")!.data as Record<string, unknown>;

  it("published cards keep the design heading, address and Read More until the editor sets them", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "about-cards", data: { items: [{ icon: "leaf", title: { en: "My card" }, description: { en: "Text" } }] } }]));
    expect((about(out).items as unknown[]).length).toBe(1);
    expect(about(out).heading).toEqual({ en: "About" });
    expect(about(out).readMore).toBeDefined();
  });

  it("a published heading and picture replace the design values", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "about-cards", data: { heading: { en: "Our village" }, mainImageId: "media000001", items: [] } }]));
    expect(about(out).heading).toEqual({ en: "Our village" });
    expect(about(out).mainImageId).toBe("media000001");
    // No published cards: the design's three cards stay.
    expect((about(out).cards as unknown[]).length).toBe(3);
  });
});

describe("home Gallery strip, Welcome video and What's New", () => {
  const sec = (out: PublicPageDto, key: string) => out.sections.find((s) => s.sectionKey === key)!.data as Record<string, unknown>;

  it("gallery: uploaded photos replace the design photos; an empty list keeps them", () => {
    const withPhotos = withFallback("home", page("home", [{ sectionKey: "home-gallery", data: { photos: [{ imageId: "media000001" }] } }]));
    expect(sec(withPhotos, "home-gallery").photos).toEqual([{ imageId: "media000001" }]);
    const empty = withFallback("home", page("home", [{ sectionKey: "home-gallery", data: { photos: [] } }]));
    expect((sec(empty, "home-gallery").photos as unknown[]).length).toBeGreaterThan(2);
  });

  it("welcome video: a published link and thumbnail are used, the design text stays", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "welcome-video", data: { videoUrl: "https://youtu.be/abc", imageId: "media000002" } }]));
    expect(sec(out, "welcome-video")).toMatchObject({ videoUrl: "https://youtu.be/abc", imageId: "media000002", watchLabel: { en: "Watch Village Story" } });
  });

  it("what's new: typed rows are shown as they are; with no rows the announcements list stays", () => {
    const rows = withFallback("home", page("home", [{ sectionKey: "whats-new", data: { items: [{ title: { en: "Row" }, date: "1 Jan", status: "event" }] } }]));
    expect(sec(rows, "whats-new").source).toBeUndefined();
    expect(sec(rows, "whats-new").viewAll).toBeDefined();
    const none = withFallback("home", page("home", [{ sectionKey: "whats-new", data: { heading: { en: "News" }, items: [] } }]));
    expect(sec(none, "whats-new")).toMatchObject({ source: "announcements", heading: { en: "News" } });
  });
});

describe("home About block: one block from the welcome section and the About cards", () => {
  it("only welcome published: the welcome section draws the block", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "welcome", data: { heading: { en: "About" }, body: { en: "Intro" } } }]));
    expect(keys(out)).toContain("welcome");
    expect(keys(out)).not.toContain("about-cards");
  });

  it("both published: one About block, with the welcome text and photo as defaults", () => {
    const out = withFallback("home", page("home", [
      { sectionKey: "welcome", data: { heading: { en: "About" }, body: { en: "Intro" }, imageId: "media000009" } },
      { sectionKey: "about-cards", data: { items: [{ icon: "leaf", title: { en: "Card" } }] } },
    ]));
    expect(keys(out)).not.toContain("welcome");
    const d = out.sections.find((s) => s.sectionKey === "about-cards")!.data;
    expect(d).toMatchObject({ subheading: { en: "Intro" }, mainImageId: "media000009" });
  });
});

describe("About page: published sections inside the design blocks", () => {
  const out = withFallback("about", page("about", [
    { sectionKey: "overview", data: { heading: { en: "About us" }, body: { en: "Text" }, imageId: "media000011" } },
    { sectionKey: "history", data: { heading: { en: "Our story" }, body: { en: "Long ago" }, mainImageId: "media000012" } },
    { sectionKey: "members", data: { items: [{ name: { en: "Asha Patil" }, designation: { en: "Sarpanch" }, photoId: "media000013" }] } },
    { sectionKey: "office", data: { address: { en: "Main road" }, hours: { en: "10 to 5" }, phone: "9999999999", email: "gp@example.org" } },
    { sectionKey: "vision-mission", data: { vision: { body: { en: "Vision" } }, mission: {}, imageId: "media000014" } },
  ]));
  const sec = (key: string) => out.sections.find((s) => s.sectionKey === key)!.data as Record<string, unknown>;

  it("uses the uploaded hero, history, member and vision pictures", () => {
    expect(sec("about-hero").imageId).toBe("media000011");
    expect(sec("about-history")).toMatchObject({ heading: { en: "Our story" }, mainImageId: "media000012" });
    expect((sec("about-structure").members as { photoId?: string }[])[0]!.photoId).toBe("media000013");
    expect(sec("about-vision").imageId).toBe("media000014");
  });

  it("shows the published office hours and contact details in the history cards", () => {
    const cards = sec("about-history").cards as { body: { en: string } }[];
    expect(cards[0]!.body).toEqual({ en: "10 to 5" });
    expect(cards[1]!.body.en).toContain("9999999999");
    expect(cards[1]!.body.en).toContain("gp@example.org");
  });

  it("does not draw the published sections a second time", () => {
    for (const k of ["overview", "history", "members", "office", "vision-mission"]) expect(keys(out)).not.toContain(k);
  });
});

describe("inner pages in published mode", () => {
  it("keeps the design hero when a section further down is published and there is no banner", () => {
    const out = withFallback("projects", page("projects", [{ sectionKey: "top-stats", data: { items: [] } }]));
    expect(keys(out)).toContain("page-hero");
    expect(keys(out)).not.toContain("quick-stats");
  });

  it("a filled-in banner still replaces the design hero in published mode", () => {
    const out = withFallback("projects", page("projects", [
      { sectionKey: "banner", data: { layout: "full-background", heading: { en: "Projects" } } },
      { sectionKey: "top-stats", data: { items: [] } },
    ]));
    expect(keys(out)).toContain("banner");
    expect(keys(out)).not.toContain("page-hero");
  });

  it("the timeline card opens with the design steps", () => {
    const seed = sectionSeed("projects", "dev-timeline")!;
    expect((seed.steps as { year: string; done: boolean }[]).map((s) => s.year)).toContain("2025");
    expect((seed.steps as { year: string; done: boolean }[]).find((s) => s.year === "2025")!.done).toBe(false);
  });
});
