import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicPageDto } from "@/types/api";
import { editorSpec } from "@/config/section-editors";
import { findSection } from "@/config/sections";
import { toApiData, toFormValues } from "@/lib/section-data";
import { bannerSeed, designSeed, sectionSeed } from "@/lib/banner-seed";
import { isEditorCard } from "@/lib/editor-sections";
import { homeLeadersFromAbout, publicAnchor, withFallback } from "./fallback";

// The tests describe the default (design fallbacks on); a local .env may switch them off.
vi.stubEnv("NEXT_PUBLIC_DESIGN_FALLBACKS", "on");

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
    // Drawn by the design's hero, which shows the Figma photo until a picture is uploaded.
    const out = withFallback("home", page("home", [{ sectionKey: "banner", data: { layout: "image-right", heading: { en: "New banner" } } }]));
    expect(out.sections[0]!.data.designHero).toBe("hero");
    expect(out.sections[0]!.data.backgroundImageId).toBeUndefined();
    const other = withFallback("home", page("home", [{ sectionKey: "banner", data: { layout: "full-background", heading: { en: "New banner" } } }]));
    expect(other.sections[0]!.data.fallbackImageUrl).toBe("/images/figma/home-hero.png");
  });

  it("home: an uploaded banner picture is not replaced", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "banner", data: { layout: "image-right", heading: { en: "New banner" }, imageId: "m1" } }]));
    expect(out.sections[0]!.data.backgroundImageId).toBe("m1");
    expect(out.sections[0]!.data.fallbackImageUrl).toBeUndefined();
  });

  it("home: a banner in the image-right layout keeps the design hero (texts, three buttons, photo to the edge)", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "banner", data: { layout: "image-right", heading: { en: "Welcome to Gram Panchayat X" }, supportingText: { en: "Building a village." } } }]));
    const hero = out.sections[0]!;
    expect(hero.sectionKey).toBe("banner");
    expect(hero.data).toMatchObject({ designHero: "hero", title: { en: "Welcome to Gram Panchayat X" }, subtitle: { en: "Building a village." } });
    // No buttons typed in the banner: the design's three buttons stay.
    expect((hero.data.actions as unknown[]).length).toBe(3);
  });

  it("home: the banner's own buttons replace the design buttons", () => {
    const ctas = [{ label: { en: "One" }, linkType: "page", href: "page:about", openInNewTab: false }];
    const out = withFallback("home", page("home", [{ sectionKey: "banner", data: { layout: "image-right", heading: { en: "H" }, ctas } }]));
    expect(out.sections[0]!.data.actions).toEqual(ctas);
  });

  it("inner page: a filled-in banner replaces the design hero", () => {
    const out = withFallback("finance", page("finance", [{ sectionKey: "banner", data: { layout: "full-background", heading: { en: "Finance" } } }]));
    expect(keys(out)).toContain("banner");
    expect(keys(out)).not.toContain("page-hero");
  });

  it("inner page: a banner in the image-right layout keeps the design hero's look and takes its texts and picture", () => {
    const seed = bannerSeed("finance", null)!;
    const design = withFallback("finance", null).sections.find((s) => s.sectionKey === "page-hero")!.data;
    // As the editor saves it: nothing changed yet.
    const same = withFallback("finance", page("finance", [{ sectionKey: "banner", data: seed }])).sections[0]!;
    expect(same.sectionKey).toBe("banner");
    expect(same.data).toMatchObject({ designHero: "page-hero", titleSmall: true, imageBleed: design.imageBleed, title: design.title, titleAccent: design.titleAccent, imageUrl: design.imageUrl });
    // New heading and an uploaded picture: the heading replaces title and accent, the picture replaces the design photo.
    const edited = withFallback("finance", page("finance", [{ sectionKey: "banner", data: { ...seed, heading: { en: "A new heading", mr: "नवीन शीर्षक" }, imageId: "m1" } }])).sections[0]!;
    expect(edited.data).toMatchObject({ designHero: "page-hero", title: { en: "A new heading" }, imageId: "m1", titleSmall: true });
    expect(edited.data.titleAccent).toBeUndefined();
  });

  it("inner page: other banner layouts are the editor's choice and are not redrawn as the design hero", () => {
    const out = withFallback("finance", page("finance", [{ sectionKey: "banner", data: { layout: "full-background", heading: { en: "Finance" } } }]));
    expect(out.sections[0]!.data.designHero).toBeUndefined();
  });

  it("inner page: without a banner the design hero is shown", () => {
    const out = withFallback("finance", null);
    expect(keys(out)).toContain("page-hero");
  });
});

describe("bannerSeed (what the Banner card shows before it is saved)", () => {
  it("home: takes the heading, picture and the buttons (up to three, as in the design) of the hero", () => {
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
    expect(seed.ctas).toHaveLength(3);
    expect((seed.ctas as { linkType: string }[]).map((c) => c.linkType)).toEqual(["page", "external", "page"]);
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

  it("final home design: Our Leaders follows the stats; Citizen Services and the gallery are not on the home page", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "home-gallery", data: { photos: [{ imageId: "media000001" }] } }, { sectionKey: "quick-links", data: { items: [{ label: { en: "Property Tax" }, href: "page:services" }] } }]));
    const keys = out.sections.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.sectionKey);
    expect(keys).not.toContain("home-gallery");
    expect(keys).not.toContain("quick-links");
    expect(keys.indexOf("leaders")).toBe(keys.indexOf("quick-stats") + 1);
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

describe("Schemes: category strip edits the scheme levels strip", () => {
  const out = withFallback("schemes", page("schemes", [
    { sectionKey: "category-strip", data: { items: [
      { icon: "landmark", label: { en: "Union schemes" }, key: "central", active: true },
      { icon: "map", label: { en: "State" }, key: "state", active: false },
    ] } },
  ]));
  it("is not drawn as a second strip", () => {
    expect(keys(out)).not.toContain("category-strip");
    expect(keys(out)).toContain("scheme-levels");
  });
  it("renames a level and hides one that is switched off", () => {
    const items = out.sections.find((s) => s.sectionKey === "scheme-levels")!.data.items as { level: string; label: { en: string } }[];
    expect(items.map((i) => i.level)).toEqual(["CENTRAL", "DISTRICT"]);
    expect(items[0]!.label).toEqual({ en: "Union schemes" });
  });
});

describe("inner pages: section by section", () => {
  const cultureDesign = withFallback("culture", null);
  const heritage = cultureDesign.sections.find((s) => s.sectionKey === "heritage-cards")!.data as { items: { title: { en: string }; imageId: string }[] };

  it("publishing one section keeps the design content of every other block", () => {
    const out = withFallback("culture", page("culture", [{ sectionKey: "heritage-cards", data: { items: [{ title: { en: "New temple" } }] } }]));
    expect(keys(out).sort()).toEqual(keys(cultureDesign).sort());
    expect(keys(out)).toEqual(keys(cultureDesign));
  });

  it("an item that keeps its design title keeps the design picture; a retitled item does not get one", () => {
    const first = heritage.items[0]!;
    const out = withFallback("culture", page("culture", [{ sectionKey: "heritage-cards", data: { items: [{ title: first.title }, { title: { en: "Some other place" } }] } }]));
    const items = out.sections.find((s) => s.sectionKey === "heritage-cards")!.data.items as { imageId?: string }[];
    expect(items[0]!.imageId).toBe(first.imageId);
    expect(items[1]!.imageId).toBeUndefined();
  });

  it("an uploaded picture is never replaced by the design picture", () => {
    const first = heritage.items[0]!;
    const out = withFallback("culture", page("culture", [{ sectionKey: "heritage-cards", data: { items: [{ title: first.title, imageId: "media000021" }] } }]));
    expect((out.sections.find((s) => s.sectionKey === "heritage-cards")!.data.items as { imageId: string }[])[0]!.imageId).toBe("media000021");
  });

  it("a section switched off in the editor hides its block, also while it has only design content", () => {
    const out = withFallback("culture", { ...page("culture", []), hiddenSections: ["homestay"] });
    expect(keys(out)).not.toContain("homestay");
    expect(keys(out)).toContain("heritage-cards");
  });

  it("a section with another key replaces its design block (Services links, Contact cards)", () => {
    const services = withFallback("services", page("services", [{ sectionKey: "service-links", data: { items: [] } }]));
    expect(keys(services)).not.toContain("rts-grid");
    expect(keys(services)).toContain("action-cards");
    const hiddenContact = withFallback("contact", { ...page("contact", []), hiddenSections: ["contact-cards"] });
    expect(keys(hiddenContact)).not.toContain("contact-cards-figma");
  });

  it("Infrastructure stats are drawn in the design's facility tiles", () => {
    const out = withFallback("infrastructure", page("infrastructure", [{ sectionKey: "top-stats", data: { items: [{ icon: "droplet", title: { en: "Water" }, value: "100%", unit: { en: "Coverage" }, visible: true }, { icon: "x", title: { en: "Hidden" }, value: "1", visible: false }] } }]));
    expect(keys(out)).not.toContain("top-stats");
    const grid = out.sections.find((s) => s.sectionKey === "facility-grid")!.data as { items: { label: unknown; value: { en: string } }[] };
    expect(grid.items).toHaveLength(1);
    expect(grid.items[0]!.value.en).toBe("100% Coverage");
  });

  it("published sections sit where their design block was", () => {
    const out = withFallback("culture", page("culture", [{ sectionKey: "success-stories", data: { items: [] } }, { sectionKey: "heritage-cards", data: { items: [] } }]));
    expect(keys(out)).toEqual(keys(cultureDesign));
  });
});

describe("designSeed (what a section card shows before it is saved)", () => {
  it("lists the five Finance documents without a file, ready to be published", () => {
    const seed = designSeed("finance", "documents", "savardari")!;
    const items = seed.items as { title: unknown; fileId?: string; fileSize?: string }[];
    expect(items).toHaveLength(5);
    expect(items.every((i) => !i.fileId && !!i.fileSize)).toBe(true);
    expect(findSection("finance", "documents")!.schema.safeParse(seed).success).toBe(true);
  });

  it("leaves out site picture files and fills Marathi", () => {
    const seed = designSeed("culture", "heritage-cards", "savardari")!;
    const items = seed.items as { title: { en: string; mr: string }; imageId?: string }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]!.imageId).toBeUndefined();
    expect(items[0]!.title.mr).toBeTruthy();
  });

  it("drops rows whose required picture is a site file, and stores list links as addresses", () => {
    expect((designSeed("gallery", "photo-gallery", "savardari")!.photos as unknown[]).length).toBe(0);
    expect(JSON.stringify(designSeed("culture", "success-stories", "savardari"))).toContain("/savardari/success-stories");
  });
});

describe("designSeed: cards whose design block has another key", () => {
  const ok = (page: Parameters<typeof designSeed>[0], key: string, email?: string) => {
    const seed = designSeed(page, key, "savardari", email);
    expect(seed, key).toBeDefined();
    // As the editor saves it: through the form, which fills the empty lists and drops blank fields.
    const spec = editorSpec(page, key)!;
    const r = findSection(page, key)!.schema.safeParse(toApiData(spec, toFormValues(spec, seed)));
    expect(r.success, `${page}:${key} ${r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3))}`).toBe(true);
    return seed!;
  };

  it("opens every card that used to open empty with the content the website shows, valid for its schema", () => {
    const cards: [Parameters<typeof designSeed>[0], string][] = [
      ["infrastructure", "top-stats"],
      ["projects", "top-stats"],
      ["services", "service-links"],
      ["services", "service-categories"],
      ["services", "qr-codes"],
      ["services", "top-stats"],
      ["services", "help"],
      ["announcements", "announcement-categories"],
      ["announcements", "calendar"],
      ["announcements", "deadline-cards"],
      ["announcements", "support-cards"],
      ["contact", "contact-cards"],
      ["contact", "feedback-form"],
      ["contact", "volunteer-registration"],
      ["grievance", "track-complaint"],
      ["grievance", "monthly-report"],
      ["projects", "village-resolution-tracker"],
      ["projects", "financial-overview"],
      ["projects", "success-stories"],
      ["projects", "impact-dashboard"],
      ["schemes", "category-strip"],
    ];
    for (const [page, key] of cards) ok(page, key);
  });

  it("splits facility values into value and unit, and calendar times into HH:MM", () => {
    const first = (ok("infrastructure", "top-stats").items as { value: string; unit?: { en: string } }[])[0]!;
    expect(first.value).toBe("100%");
    expect(first.unit?.en).toBe("Coverage");
    const ev = (ok("announcements", "calendar").events as { startTime?: string; endTime?: string }[])[0]!;
    expect(ev.startTime).toBe("10:00");
    expect(ev.endTime).toBe("12:00");
  });

  it("keeps the website's own pages as QR links and fills the texts the website words itself", () => {
    expect(JSON.stringify(ok("services", "qr-codes"))).toContain("page:grievance");
    expect(ok("grievance", "monthly-report").cardLabels).toMatchObject({ total: { en: "Total Complaints" } });
    expect((ok("contact", "feedback-form").successMessage as { mr: string }).mr).toBeTruthy();
  });

  it("sends complaints to the office's own address and never to an address from the design", () => {
    expect(designSeed("grievance", "complaint-form", "savardari")?.recipientEmail).toBeUndefined();
    expect(ok("grievance", "complaint-form", "office@example.org").recipientEmail).toBe("office@example.org");
  });
});

describe("weather cards: live figures, the place typed in the editor", () => {
  it("home: a published place keeps the design card (shown with the typed place) until live figures arrive", () => {
    const out = withFallback("home", page("home", [{ sectionKey: "weather", data: { location: "Khed, Maharashtra", place: "Khed,IN" } }]));
    const w = out.sections.find((s) => s.sectionKey === "weather")!;
    expect(w.data.temperature).toBeDefined();
    expect(w.data.location).toEqual({ en: "Khed, Maharashtra", mr: "Khed, Maharashtra" });
  });

  it("home: old manual figures are used as they are", () => {
    const current = { temperature: "29°C", humidity: "60%", wind: "10 km/h", feelsLike: "30°C", condition: "Clear" };
    const w = withFallback("home", page("home", [{ sectionKey: "weather", data: { current } }])).sections.find((s) => s.sectionKey === "weather")!;
    expect(w.data.current).toEqual(current);
  });

  it("environment: the weather card keeps the design figures until the provider answers", () => {
    const w = withFallback("environment", page("environment", [{ sectionKey: "weather-update", data: { title: { en: "Weather" } } }])).sections.find((s) => s.sectionKey === "weather-update")!;
    expect(w.data.current).toBeDefined();
  });

  it("editor: the weather card opens with the shown place and the lookup place, and no figures to type", () => {
    const seed = designSeed("home", "weather", "savardari", undefined, "Khed,IN")!;
    expect(seed).toMatchObject({ location: "Savardari, Maharashtra", place: "Khed,IN" });
    expect(seed.current).toBeUndefined();
    const env = designSeed("environment", "weather-update", "savardari")!;
    expect(env.title).toBeDefined();
    expect(env.current).toBeUndefined();
    const spec = editorSpec("home", "weather")!;
    expect(spec.fields.map((f) => f.name)).toEqual(["location", "place"]);
    expect(spec.groups ?? []).toHaveLength(0);
    expect(spec.items ?? []).toHaveLength(0);
  });
});

describe("View on website: the banner link finds the hero, published or not", () => {
  it("names the banner block first and the design hero blocks after it", () => {
    for (const page of ["home", "finance", "about"] as const) {
      const keys = publicAnchor(page, "banner", false).split(",");
      expect(keys[0]).toBe("banner");
      // The first block of the design page that is a hero is among them, so the link works before the banner is published.
      const heroKey = withFallback(page, null).sections.find((s) => ["hero", "page-hero", "about-hero"].includes(s.sectionKey))!.sectionKey;
      expect(keys).toContain(heroKey);
    }
  });
});

describe("which cards the editor and the CMS overview count", () => {
  const sec = (sectionKey: string, extra: { draft?: unknown; published?: unknown } = {}) => ({ sectionKey, ...extra });

  it("leaves out registry sections that another card replaces or that the website has no place for", () => {
    const home = ["banner", "hero", "welcome", "about-cards", "leaders", "quick-stats"].map((k) => sec(k));
    const shown = home.filter((s) => isEditorCard("home", s, home)).map((s) => s.sectionKey);
    expect(shown).toEqual(["banner", "about-cards", "quick-stats"]);
    const about = ["banner", "overview", "geography", "history"].map((k) => sec(k));
    expect(about.filter((s) => isEditorCard("about", s, about)).map((s) => s.sectionKey)).toEqual(["banner", "history"]);
  });

  it("keeps the older hero and welcome cards when there is no banner / about cards to replace them", () => {
    const home = ["hero", "welcome"].map((k) => sec(k));
    expect(home.every((s) => isEditorCard("home", s, home))).toBe(true);
  });

  it("hides cards with no block on the site until they hold something, never after", () => {
    const env = [sec("banner"), sec("top-stats"), sec("weather-update")];
    expect(isEditorCard("environment", env[1]!, env)).toBe(false);
    const saved = [sec("banner"), sec("top-stats", { draft: {} })];
    expect(isEditorCard("environment", saved[1]!, saved)).toBe(true);
    const live = [sec("banner"), sec("top-stats", { published: {} })];
    expect(isEditorCard("environment", live[1]!, live)).toBe(true);
    const culture = [sec("training-programs")];
    expect(isEditorCard("culture", culture[0]!, culture)).toBe(false);
  });
});

describe("About Banner card opens with the About hero the website shows", () => {
  it("takes the texts, buttons and picture of the published overview section", () => {
    const seed = bannerSeed("about", {
      eyebrow: { en: "Our Gram Panchayat" },
      heading: { en: "A heading" },
      body: { en: "Some words about the village." },
      imageId: "abcdefghij1",
      actions: [{ label: { en: "Know our leaders" }, href: "page:about#members" }],
    })!;
    expect(seed).toMatchObject({ heading: { en: "A heading" }, supportingText: { en: "Our Gram Panchayat" }, description: { en: "Some words about the village." }, imageId: "abcdefghij1" });
    expect((seed.ctas as unknown[]).length).toBe(1);
  });

  it("falls back to the design hero when nothing is published", () => {
    expect(bannerSeed("about", undefined)?.heading).toBeDefined();
  });
});

describe("Projects blocks and the Schemes level strip are driven by their cards", () => {
  it("tracker: the card opens with the ten design commitments and their percentages", () => {
    const seed = designSeed("projects", "village-resolution-tracker", "savardari")!;
    const items = seed.items as { title: { en: string }; percent: number }[];
    expect(items).toHaveLength(10);
    expect(items[0]).toMatchObject({ title: { en: "Clean Village" }, percent: 92 });
  });

  it("tracker: typed commitments keep the design's progress bars (percent), the pill only without percent", () => {
    const out = withFallback("projects", page("projects", [{ sectionKey: "village-resolution-tracker", data: { heading: { en: "Our promises" }, items: [{ title: { en: "Roads" }, percent: 40 }] } }]));
    // Drawn by the design's own tracker block, so it keeps its row with the Impact Dashboard.
    const t = out.sections.find((s) => s.sectionKey === "progress-tracker")!;
    expect((t.data.items as { percent?: number }[])[0]!.percent).toBe(40);
    expect(t.data.title).toEqual({ en: "Our promises" });
    expect(keys(out)).not.toContain("village-resolution-tracker");
    // Statuses only (no percent): the older status look is kept.
    const legacy = withFallback("projects", page("projects", [{ sectionKey: "village-resolution-tracker", data: { items: [{ title: { en: "Roads" }, status: "open" }] } }]));
    expect(keys(legacy)).toContain("village-resolution-tracker");
  });

  it("impact dashboard: the card opens with the design tiles and typed tiles are drawn in the design block", () => {
    const seed = designSeed("projects", "impact-dashboard", "savardari")!;
    expect((seed.items as { title: { en: string }; value: string }[])[0]).toMatchObject({ title: { en: "Toilets Constructed" }, value: "100%" });
    const out = withFallback("projects", page("projects", [{ sectionKey: "impact-dashboard", data: { heading: { en: "Impact" }, items: [{ title: { en: "Wells" }, value: "12" }] } }]));
    const g = out.sections.find((s) => s.sectionKey === "impact-grid")!;
    expect(g.data.items).toEqual([{ label: { en: "Wells" }, value: "12" }]);
    expect(keys(out)).not.toContain("impact-dashboard");
  });

  it("financial overview: typed budget heads and funding sources fill the design block; old item lists still work", () => {
    const seed = designSeed("projects", "financial-overview", "savardari")!;
    expect((seed.allocation as unknown[]).length).toBe(6);
    expect((seed.sources as unknown[]).length).toBe(4);
    const typed = withFallback("projects", page("projects", [{ sectionKey: "financial-overview", data: { heading: { en: "Money" }, allocation: [{ label: { en: "Roads" }, percent: 50 }], sources: [{ label: { en: "State" }, amount: "₹1 Cr", value: 1 }] } }]));
    const fin = typed.sections.find((s) => s.sectionKey === "financial-overview")!;
    expect(fin.data).toMatchObject({ title: { en: "Money" }, allocation: [{ percent: 50 }], sources: [{ value: 1 }] });
    // The labels the editor left empty keep the design's.
    expect(fin.data.budgetLabel).toBeDefined();
    const legacy = withFallback("projects", page("projects", [{ sectionKey: "financial-overview", data: { heading: { en: "Old" }, items: [] } }])).sections.find((s) => s.sectionKey === "financial-overview")!;
    expect(legacy.data.items).toEqual([]);
  });

  it("success stories: typed stories are drawn by the design's quote cards and keep the design photo under the design name", () => {
    const seed = designSeed("projects", "success-stories", "savardari")!;
    expect((seed.items as { personName: { en: string } }[])[0]!.personName.en).toBe("Sunil Pawar");
    const out = withFallback("projects", page("projects", [{ sectionKey: "success-stories", data: { heading: { en: "Voices" }, items: [
      { title: { en: "Sunil Pawar" }, quote: { en: "A quote" }, personName: { en: "Sunil Pawar" }, personRole: { en: "Resident Ward 2" }, order: 0 },
      { title: { en: "New person" }, quote: { en: "Another" }, personName: { en: "New person" }, imageId: "abcdefghij1", order: 1 },
    ] } }]));
    const s = out.sections.find((x) => x.sectionKey === "stories-figma")!;
    expect(keys(out)).not.toContain("success-stories");
    const items = s.data.items as { name: { en: string }; photoUrl?: string; photoId?: string }[];
    expect(items[0]!.photoUrl).toContain("prj-story-1");
    expect(items[1]!.photoId).toBe("abcdefghij1");
    expect(items[1]!.photoUrl).toBeUndefined();
    expect(s.data.title).toEqual({ en: "Voices" });
  });

  it("schemes: the level strip card opens with the three levels and takes an uploaded picture", () => {
    const seed = designSeed("schemes", "category-strip", "savardari")!;
    expect((seed.items as { key: string }[]).map((i) => i.key)).toEqual(["CENTRAL", "STATE", "DISTRICT"]);
    const out = withFallback("schemes", page("schemes", [{ sectionKey: "category-strip", data: { items: [{ key: "STATE", label: { en: "State schemes" }, iconImageId: "abcdefghij1", active: true }] } }]));
    const levels = out.sections.find((s) => s.sectionKey === "scheme-levels")!;
    const state = (levels.data.items as { level: string; label: { en: string }; iconImageId?: string }[]).find((i) => i.level === "STATE")!;
    expect(state).toMatchObject({ label: { en: "State schemes" }, iconImageId: "abcdefghij1" });
  });
});

describe("design fallbacks switch (NEXT_PUBLIC_DESIGN_FALLBACKS)", () => {
  afterEach(() => vi.stubEnv("NEXT_PUBLIC_DESIGN_FALLBACKS", "on"));

  it("on (default): a block nobody has published shows its design content", () => {
    expect(keys(withFallback("culture", null))).toContain("village-intro");
  });

  it("off: only published sections and record-fed blocks are drawn", () => {
    vi.stubEnv("NEXT_PUBLIC_DESIGN_FALLBACKS", "off");
    expect(keys(withFallback("culture", null))).toEqual([]);
    const projects = keys(withFallback("projects", null));
    // Blocks fed by projects stay (their sample rows are dropped); the design's other blocks do not.
    expect(projects).toEqual(expect.arrayContaining(["project-showcase", "before-after"]));
    expect(projects).not.toContain("dev-timeline");
    const before = withFallback("projects", null).sections.find((s) => s.sectionKey === "before-after")!;
    expect(before.data.items).toEqual([]);
  });

  it("off: Home keeps What's New and the notices (built from the announcements), without sample tabs", () => {
    vi.stubEnv("NEXT_PUBLIC_DESIGN_FALLBACKS", "off");
    const home = withFallback("home", null);
    expect(keys(home)).toEqual(expect.arrayContaining(["whats-new", "notices"]));
    expect(keys(home)).not.toContain("sarpanch-message");
    expect(home.sections.find((s) => s.sectionKey === "notices")!.data.tabs).toEqual([]);
    expect(home.sections.find((s) => s.sectionKey === "whats-new")!.data.items).toEqual([]);
  });

  it("off: a published section is still drawn in the design's block", () => {
    vi.stubEnv("NEXT_PUBLIC_DESIGN_FALLBACKS", "off");
    const out = withFallback("services", page("services", [{ sectionKey: "service-links", data: { items: [{ title: { en: "Birth Certificate" }, description: { en: "Apply" }, href: "https://example.org", visible: true }] } }]));
    expect(keys(out)).toContain("rts-grid");
    expect(keys(out)).not.toContain("service-links");
  });
});

describe("published sections drawn by the design's own blocks", () => {
  it("announcements: events, deadlines and downloads feed the design blocks (one block for deadlines + downloads)", () => {
    const out = withFallback("announcements", page("announcements", [
      { sectionKey: "calendar", data: { title: { en: "Calendar" }, events: [{ date: "2026-07-15", title: { en: "Gram Sabha" }, colour: "#135130", startTime: "10:00", endTime: "12:00" }] } },
      { sectionKey: "deadline-cards", data: { items: [{ date: "July 31, 2026", title: { en: "Tax" }, subtitle: { en: "Last Date" } }] } },
      { sectionKey: "download-forms", data: { items: [{ name: { en: "Form A" }, fileId: "abcdefghij1" }] } },
    ]));
    const feed = out.sections.find((s) => s.sectionKey === "announce-feed")!;
    expect((feed.data.events as { time: string }[])[0]!.time).toBe("10:00 AM - 12:00 PM");
    expect(feed.data.calendarTitle).toEqual({ en: "Calendar" });
    const dd = out.sections.filter((s) => s.sectionKey === "deadlines-downloads");
    expect(dd).toHaveLength(1);
    expect(dd[0]!.data).toMatchObject({ deadlines: [{ title: { en: "Tax" } }], files: [{ fileId: "abcdefghij1" }] });
    expect(keys(out)).not.toContain("calendar");
  });

  it("announcements: the downloads survive whatever order deadlines and downloads come in (and keep their caption)", () => {
    const deadlines = { sectionKey: "deadline-cards", data: { items: [{ date: "July 31, 2026", title: { en: "Tax" } }] } };
    const downloads = { sectionKey: "download-forms", data: { items: [{ name: { en: "GR 1" }, description: { en: "Government resolution (PDF)" }, fileId: "abcdefghij1" }, { name: { en: "GR 2" }, fileId: "abcdefghij2" }] } };
    for (const order of [[deadlines, downloads], [downloads, deadlines]]) {
      const dd = withFallback("announcements", page("announcements", order)).sections.filter((s) => s.sectionKey === "deadlines-downloads");
      expect(dd).toHaveLength(1);
      expect((dd[0]!.data.files as { fileId: string }[]).map((f) => f.fileId)).toEqual(["abcdefghij1", "abcdefghij2"]);
      expect((dd[0]!.data.files as { caption?: { en: string } }[])[0]!.caption).toEqual({ en: "Government resolution (PDF)" });
      expect(dd[0]!.data.deadlines).toMatchObject([{ title: { en: "Tax" } }]);
    }
  });

  it("home: Our Leaders comes from the About page's leaders; a typed heading is the line under the design title", () => {
    const about = page("about", [{ sectionKey: "leaders-profile-grid", data: { heading: { en: "Hon. ministers and officials", mr: "माननीय मंत्री व पदाधिकारी" }, items: [{ name: { en: "A Leader" }, designation: { en: "Sarpanch" }, photoId: "abcdefghij1" }, { name: { en: "No Photo" }, designation: { en: "Member" } }] } }]);
    const leaders = homeLeadersFromAbout(about)!;
    expect(leaders.sectionKey).toBe("leaders");
    expect((leaders.data.items as { name: { en: string } }[]).map((i) => i.name.en)).toEqual(["A Leader", "No Photo"]);
    expect(leaders.data.subheading).toEqual({ en: "Hon. ministers and officials", mr: "माननीय मंत्री व पदाधिकारी" });
    expect((leaders.data.heading as { en: string }).en).toBe("Our");
    expect((leaders.data.headingAccent as { en: string }).en).toBe("Leaders");
  });

  it("contact: the cards are told apart by their content, in any order (inquiries, address, hours)", () => {
    const items = [
      { title: { en: "General inquiries" }, details: { en: "+91 98765 43210\noffice@example.in" } },
      { title: { en: "Office address" }, details: { en: "Gram Panchayat Office,\nMain Road, 410501" } },
      { title: { en: "Office hours" }, details: { en: "Monday to Friday: 10:00 am to 5:45 pm" } },
    ];
    const d = withFallback("contact", page("contact", [{ sectionKey: "contact-cards", data: { items } }])).sections.find((s) => s.sectionKey === "contact-cards-figma")!.data;
    expect(d.phone).toBe("+91 98765 43210");
    expect(d.email).toBe("office@example.in");
    expect((d.address as { en: string }).en).toContain("Main Road");
    expect((d.hours as { en: string }).en).toContain("Monday");
    expect((d.labels as { address: { en: string }; hours: { en: string } }).address.en).toBe("Office address");
  });

  it("about: a card that shows a real member is marked, so it never gets the design's sample portrait", () => {
    const out = withFallback("about", page("about", [{ sectionKey: "members", data: { items: [{ name: { en: "Real Sarpanch" }, designation: { en: "Sarpanch" } }, { name: { en: "Extra Person" }, designation: { en: "Clerk" }, photoId: "abcdefghij1" }] } }]));
    const members = out.sections.find((s) => s.sectionKey === "about-structure")!.data.members as { title: { en: string }; person?: boolean; photoId?: string }[];
    expect(members.find((m) => m.title.en === "Real Sarpanch")).toMatchObject({ person: true });
    expect(members.find((m) => m.title.en === "Extra Person")).toMatchObject({ person: true, photoId: "abcdefghij1" });
    expect(members.some((m) => !m.person)).toBe(true);
  });

  it("services: help card takes the typed contact (number written as the design writes it) and the uploaded picture", () => {
    const out = withFallback("services", page("services", [{ sectionKey: "help", data: { heading: { en: "Help" }, subtitle: { en: "We assist" }, imageId: "abcdefghij1", contact: [{ phone: "+911234567890", email: "a@b.in", hours: "Mon-Sat" }], faqs: [] } }]));
    const h = out.sections.find((s) => s.sectionKey === "help-card")!;
    expect(h.data).toMatchObject({ phone: "+91 12345 67890", email: "a@b.in", imageId: "abcdefghij1", body: { en: "We assist" } });
  });

  it("grievance: the form and the lookup keep the design blocks (and the how-it-works steps)", () => {
    const out = withFallback("grievance", page("grievance", [{ sectionKey: "track-complaint", data: { heading: { en: "Track it" } } }]));
    const t = out.sections.find((s) => s.sectionKey === "grievance-track")!;
    expect(t.data.heading).toEqual({ en: "Track it" });
    expect(t.data.howSteps).toBeDefined();
  });

  it("about: the leaders block keeps its accent heading while the typed heading is the design's", () => {
    const base = withFallback("about", null).sections.find((s) => s.sectionKey === "leaders")!.data;
    const joined = { en: [base.heading as { en: string }, base.headingAccent as { en: string }].map((h) => h?.en).filter(Boolean).join(" ") };
    const same = withFallback("about", page("about", [{ sectionKey: "leaders-profile-grid", data: { heading: joined, items: [{ name: { en: "A Leader" }, designation: { en: "Sarpanch" } }] } }])).sections.find((s) => s.sectionKey === "leaders")!;
    expect(same.data.headingAccent).toEqual(base.headingAccent);
    const changed = withFallback("about", page("about", [{ sectionKey: "leaders-profile-grid", data: { heading: { en: "Our team" }, items: [{ name: { en: "A Leader" } }] } }])).sections.find((s) => s.sectionKey === "leaders")!;
    expect(changed.data.heading).toEqual({ en: "Our team" });
    expect(changed.data.headingAccent).toBeUndefined();
  });

  it("a published section keeps the look settings of its design block (card style, spacing) that are not stored", () => {
    const design = withFallback("culture", null).sections.find((s) => s.sectionKey === "success-stories")!.data;
    const out = withFallback("culture", page("culture", [{ sectionKey: "success-stories", data: { items: [{ title: { en: "A story" }, order: 1 }] } }]));
    expect(out.sections.find((s) => s.sectionKey === "success-stories")!.data.variant).toBe(design.variant);
  });
});
