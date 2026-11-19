import { describe, expect, it } from "vitest";
import { GET as publicFileRoute } from "@/app/api/v1/public/[tenantSlug]/media/[mediaId]/route";
import { assertUsableMedia } from "@/features/media/ownership";
import { deleteMedia, getPublicMediaFile, listMedia } from "@/features/media/service";
import { isSiteAssetPath, siteAssetKey, siteAssetPath } from "@/features/media/site-assets";
import { saveSectionDraft } from "@/features/pages/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client, params, request } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

async function siteAsset(ownerUnitId: string, path = "/images/figma/pages/gal-p1.png", tenantId: string | null = null) {
  return db.media.create({
    data: { tenantId, ownerUnitId, kind: "IMAGE", source: "SITE_ASSET", storageKey: siteAssetKey(path), originalName: "gal-p1.png", mimeType: "image/png", sizeBytes: 100 },
  });
}

describe("site assets (design pictures registered as media)", () => {
  it("accepts only plain picture paths under /images", () => {
    expect(isSiteAssetPath("/images/figma/pages/gal-p1.png")).toBe(true);
    for (const bad of ["/images/../.env", "https://evil.example/x.png", "/images/x.png?y=1", "//evil.example/x.png", "/api/v1/x.png", "/images/x.js"]) {
      expect(isSiteAssetPath(bad)).toBe(false);
    }
    expect(siteAssetPath("site:/images/a/b.webp")).toBe("/images/a/b.webp");
    expect(siteAssetPath("site:/images/../secret.png")).toBeNull();
    expect(siteAssetPath("2026/11/abc.png")).toBeNull();
  });

  it("are served as a same-site redirect, to websites under the owning unit only", async () => {
    const w = await buildWorld();
    const asset = await siteAsset(w.taluka1.id);
    const file = await getPublicMediaFile("gp-a", asset.id);
    expect(file.redirectTo).toBe("/images/figma/pages/gal-p1.png");
    const res = await publicFileRoute(request(`/api/v1/public/gp-a/media/${asset.id}`), params({ tenantSlug: "gp-a", mediaId: asset.id }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/images/figma/pages/gal-p1.png");
    // gp-c sits under another taluka: not visible there.
    await expectCode(getPublicMediaFile("gp-c", asset.id), "NOT_FOUND");
  });

  it("can be referenced from sections, appear in the library, and deleting one never touches the site file", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const asset = await siteAsset(w.gpA.id, "/images/figma/pages/gal-p2.png", w.tenantA.id);
    await expect(assertUsableMedia(asset.id, { tenantId: w.tenantA.id, unitPath: w.gpA.path })).resolves.toBeUndefined();
    await expect(
      saveSectionDraft(admin.ctx, w.tenantA.id, "gallery", "photo-gallery", { data: { categories: [], photos: [{ imageId: asset.id, categoryKey: "village", order: 1 }] } } as never, client),
    ).resolves.toBeDefined();
    expect((await listMedia(admin.ctx, { tenantId: w.tenantA.id, limit: 20 })).items.map((m) => m.id)).toContain(asset.id);
    await deleteMedia(admin.ctx, asset.id, client);
    expect((await db.media.findUniqueOrThrow({ where: { id: asset.id } })).deletedAt).not.toBeNull();
  });
});
