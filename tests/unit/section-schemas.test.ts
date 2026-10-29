import { describe, expect, it } from "vitest";
import { findSection, sectionsForPage } from "@/config/sections";
import { MEDIA_REF_PATTERN } from "@/config/section-primitives";

const parses = (page: Parameters<typeof findSection>[0], key: string, data: unknown) => {
  const def = findSection(page, key);
  if (!def) throw new Error(`missing section ${page}/${key}`);
  return def.schema.safeParse(data).success;
};

const MEDIA = "cjld2cjxh0000qzrmn831i7rn";

describe("admin-editor section registry", () => {
  const expected: Record<string, string[]> = {
    infrastructure: ["banner", "top-stats", "infra-map", "map-filters", "status-cards", "latest-announcements", "upcoming-events"],
    finance: ["banner", "top-stats", "income-sources", "expenditure", "budget-visualizer", "documents"],
    services: ["banner", "service-links", "service-categories", "qr-codes", "top-stats", "help"],
    grievance: ["banner", "complaint-form", "support-cards", "track-complaint", "escalation-matrix", "monthly-report"],
    culture: ["banner", "village-intro", "heritage-cards", "culture-cards", "homestay", "training-programs", "leader-cards", "fpo-gallery-voice", "success-stories"],
    employment: ["banner", "support-cards", "local-opportunities", "skill-directory", "assistance-items", "training-programs", "job-portals", "success-stories"],
    education: ["banner", "support-cards", "student-spotlight", "youth-speak-tabs", "youth-posts", "scheme-cards", "success-stories"],
    environment: ["banner", "top-stats", "green-scoreboard", "tree-adoption", "sustainability-initiatives", "market-prices", "weather-update"],
    announcements: ["banner", "top-stats", "announcement-categories", "calendar", "deadline-cards", "download-forms", "support-cards"],
    gallery: ["banner", "photo-gallery", "video-gallery", "press-coverage", "then-and-now", "mini-documentary"],
    contact: ["banner", "contact-cards", "office-location", "feedback-form", "partners", "volunteer-categories", "volunteer-registration"],
  };

  for (const [page, keys] of Object.entries(expected)) {
    it(`${page} registers every section the document lists`, () => {
      const registered = sectionsForPage(page as never).map((s) => s.key);
      for (const k of keys) expect(registered).toContain(k);
    });
  }

  it("banner accepts the Figma layout and rejects unsafe links", () => {
    const ok = { layout: "image-right", ctas: [{ label: { en: "Apply" }, linkType: "page", href: "/services", openInNewTab: false }] };
    expect(parses("services", "banner", ok)).toBe(true);
    const unsafe = { layout: "image-right", ctas: [{ label: { en: "x" }, linkType: "external", href: "javascript:alert(1)", openInNewTab: false }] };
    expect(parses("services", "banner", unsafe)).toBe(false);
    expect(parses("services", "banner", { layout: "sideways" })).toBe(false);
  });

  it("top-stats caps the number of items and rejects bad colours", () => {
    const item = { icon: "users", title: { en: "Population" }, value: "2,857", visible: true };
    expect(parses("environment", "top-stats", { items: [item] })).toBe(true);
    expect(parses("environment", "top-stats", { items: Array.from({ length: 9 }, () => item) })).toBe(false);
    expect(parses("environment", "top-stats", { items: [{ ...item, background: "red" }] })).toBe(false);
  });

  it("amounts must be plain decimal strings", () => {
    const income = (amount: string) => ({ enabled: true, heading: { en: "Income" }, categories: [{ name: { en: "Tax" }, amount, percentage: 40 }] });
    expect(parses("finance", "income-sources", income("12500.00"))).toBe(true);
    expect(parses("finance", "income-sources", income("₹12,500"))).toBe(false);
  });

  it("job portal and QR links must be https", () => {
    const portal = (websiteUrl: string) => ({ items: [{ name: { en: "Naukri" }, websiteUrl, order: 1, active: true }] });
    expect(parses("employment", "job-portals", portal("https://www.naukri.com"))).toBe(true);
    expect(parses("employment", "job-portals", portal("http://www.naukri.com"))).toBe(false);
    const qr = (linkUrl: string) => ({ items: [{ title: { en: "Pay tax" }, serviceIcon: "tax", linkUrl }] });
    expect(parses("services", "qr-codes", qr("https://pay.example.gov.in"))).toBe(true);
    expect(parses("services", "qr-codes", qr("ftp://pay.example.gov.in"))).toBe(false);
  });

  it("youth posts must link to the right provider", () => {
    const post = (type: string, url: string) => ({ items: [{ tabKey: "videos", type, title: { en: "Clip" }, url }] });
    expect(parses("education", "youth-posts", post("youtube", "https://www.youtube.com/watch?v=abc"))).toBe(true);
    expect(parses("education", "youth-posts", post("youtube", "https://evil.example.com/watch"))).toBe(false);
    expect(parses("education", "youth-posts", post("reel", "https://www.instagram.com/reel/abc"))).toBe(true);
    expect(parses("education", "youth-posts", post("reel", "https://tiktok.com/abc"))).toBe(false);
  });

  it("video links are limited to YouTube and Vimeo", () => {
    const video = (videoUrl: string) => ({ items: [{ title: { en: "Story" }, videoUrl, order: 1 }] });
    expect(parses("gallery", "video-gallery", video("https://vimeo.com/123"))).toBe(true);
    expect(parses("gallery", "video-gallery", video("https://example.com/v.mp4"))).toBe(false);
  });

  it("office maps only accept Google Maps or OpenStreetMap embeds", () => {
    expect(parses("contact", "office-location", { title: { en: "Office" }, mapEmbedUrl: "https://www.google.com/maps/embed?pb=abc" })).toBe(true);
    expect(parses("contact", "office-location", { title: { en: "Office" }, mapEmbedUrl: "https://evil.example.com/embed" })).toBe(false);
  });

  it("market prices must be ordered min ≤ modal ≤ max", () => {
    const row = (minPrice: number, modalPrice: number, maxPrice: number) => ({ commodity: { en: "Onion" }, unit: "quintal", minPrice, modalPrice, maxPrice });
    const data = (r: unknown) => ({ title: { en: "Prices" }, lastUpdatedAt: "2026-10-28T10:00:00Z", rows: [r] });
    expect(parses("environment", "market-prices", data(row(10, 12, 15)))).toBe(true);
    expect(parses("environment", "market-prices", data(row(10, 20, 15)))).toBe(false);
  });

  it("mini-documentary needs a video matching its source", () => {
    const base = { heading: { en: "Film" }, title: { en: "Village" }, publishedDate: "2026-10-01", playback: { autoplay: false, controls: true, muted: false, loop: false }, autoThumbnail: true };
    expect(parses("gallery", "mini-documentary", { ...base, source: "upload" })).toBe(false);
    expect(parses("gallery", "mini-documentary", { ...base, source: "upload", videoId: MEDIA })).toBe(true);
    expect(parses("gallery", "mini-documentary", { ...base, source: "link" })).toBe(false);
  });

  it("student spotlight needs guardian consent to be submitted", () => {
    const def = findSection("education", "student-spotlight");
    expect(def?.submitCheck).toBeDefined();
    expect(() => def?.submitCheck?.({ name: { en: "A" } })).toThrow(/Guardian consent/);
    expect(() =>
      def?.submitCheck?.({ name: { en: "A" }, guardianConsent: { confirmed: true, confirmedBy: "Parent", confirmedAt: "2026-10-28T10:00:00Z" } }),
    ).not.toThrow();
  });

  it("media ownership covers the document's id fields, including lists", () => {
    for (const name of ["imageId", "photoId", "fileId", "iconId", "logoId", "videoId", "thumbnailId", "coverImageId", "imageIds", "partnerLogoIds"]) {
      expect(MEDIA_REF_PATTERN.test(name)).toBe(true);
    }
    for (const name of ["title", "icon", "href", "buttonLink", "videoUrl"]) {
      expect(MEDIA_REF_PATTERN.test(name)).toBe(false);
    }
  });
});
