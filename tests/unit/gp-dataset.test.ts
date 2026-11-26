import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSections, collectSitePaths, gpDatasetSchema, mapEmbedFor } from "@/features/content-import/gp-dataset";

const raw = JSON.parse(readFileSync(join(process.cwd(), "data/gp-datasets/ganeshwadi.json"), "utf8")) as unknown;

describe("Ganeshwadi content dataset", () => {
  const d = gpDatasetSchema.parse(raw);

  it("is valid and every picture / PDF it uses is committed under public/ with its source listed", () => {
    const paths = collectSitePaths(d);
    expect(paths.length).toBeGreaterThan(40);
    for (const p of paths) {
      expect(existsSync(join(process.cwd(), "public", p)), p).toBe(true);
      expect(d.assets[p], p).toMatch(/^https:\/\//);
    }
    expect(d.schemes).toHaveLength(11);
    expect(d.documents.every((x) => x.file.startsWith("/documents/") && x.file.endsWith(".pdf"))).toBe(true);
  });

  it("builds valid section data for every mapped section, even without live data to keep", () => {
    const media = (p: string) => `m${p.replace(/[^a-z0-9]/g, "").slice(-20).padStart(12, "x")}`;
    const r = buildSections(d, media, () => undefined);
    expect(r.invalid).toEqual([]);
    const keys = r.sections.map((s) => `${s.pageKey}/${s.sectionKey}`);
    expect(keys).toEqual(expect.arrayContaining(["home/hero", "about/members", "about/leaders-profile-grid", "gallery/photo-gallery", "contact/office-location", "announcements/download-forms"]));
    // Live-only sections (about-cards, vision-mission) are skipped when the website has nothing to extend.
    expect(keys).not.toContain("home/about-cards");
    const members = r.sections.find((s) => s.sectionKey === "members")!.data as { items: { photoId?: string }[] };
    expect(members.items).toHaveLength(d.members.length);
    expect(members.items.filter((m) => m.photoId).length).toBe(d.members.filter((m) => m.photo).length);
  });

  it("keeps presentation settings from the live revision and never copies the old area or households", () => {
    const r = buildSections(gpDatasetSchema.parse(raw), () => "mediaid000001", (page, key) =>
      page === "home" && key === "hero" ? { title: { en: "Old" }, cta: { label: { en: "Explore" }, href: "page:about" } } : page === "about" && key === "geography" ? { areaSqKm: 12.4, households: 2857 } : undefined,
    );
    const hero = r.sections.find((s) => s.sectionKey === "hero")!.data as Record<string, unknown>;
    expect(hero.cta).toEqual({ label: { en: "Explore" }, href: "page:about" });
    expect((hero.title as { en: string }).en).toContain("Ganeshwadi");
    const geo = r.sections.find((s) => s.sectionKey === "geography")!.data as Record<string, unknown>;
    expect(geo.areaSqKm).toBeUndefined();
    expect(geo.households).toBeUndefined();
    expect(geo.pinCode).toBe("415110");
  });

  it("never changes the Home banner (the website's own hero)", () => {
    const banner = { layout: "image-right", heading: { en: "Welcome to Gram Panchayat Savardari" }, imageId: "mediaid000001" };
    const r = buildSections(gpDatasetSchema.parse(raw), () => "mediaid000002", (page, key) => (page === "home" && key === "banner" ? banner : undefined));
    expect(r.sections.some((s) => s.pageKey === "home" && s.sectionKey === "banner")).toBe(false);
  });

  it("rejects datasets that point outside the site or miss a source", () => {
    const bad = structuredClone(raw) as { gallery: { photos: { photo: string }[] }; assets: Record<string, string> };
    bad.gallery.photos[0]!.photo = "https://evil.example/x.jpg";
    expect(gpDatasetSchema.safeParse(bad).success).toBe(false);
    const noSource = structuredClone(raw) as { assets: Record<string, string> };
    delete noSource.assets[Object.keys(noSource.assets)[0]!];
    expect(gpDatasetSchema.safeParse(noSource).success).toBe(false);
    expect(mapEmbedFor("Ganeshwadi, Karad")).toMatch(/^https:\/\/maps\.google\.com\/maps\?q=Ganeshwadi%2C%20Karad&output=embed$/);
  });
});
