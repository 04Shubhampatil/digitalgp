import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gpDatasetSchema } from "@/features/content-import/gp-dataset";
import { importGpDataset } from "@/features/content-import/import-gp-dataset";
import { getPublicMediaFile } from "@/features/media/service";
import { db } from "@/lib/db";
import { actor, buildWorld } from "../helpers/factories";

const dataset = gpDatasetSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "data/gp-datasets/ganeshwadi.json"), "utf8")));

async function snapshot(tenantId: string) {
  const [sections, revisions, schemes, announcements, tenant] = await Promise.all([
    db.section.count({ where: { tenantId } }),
    db.sectionRevision.count({ where: { tenantId } }),
    db.scheme.findMany({ where: { tenantId }, select: { id: true, status: true }, orderBy: { id: "asc" } }),
    db.announcement.findMany({ where: { tenantId }, select: { id: true, status: true }, orderBy: { id: "asc" } }),
    db.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { settings: true, nameEn: true, nameMr: true } }),
  ]);
  return { sections, revisions, schemes, announcements, tenant };
}

describe("importing a GP dataset into a website", () => {
  it("publishes the dataset on the target website only, archives its old records, and is idempotent", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const author = { createdById: admin.user.id, status: "PUBLISHED" as const, publishedAt: new Date() };
    // Old ("dummy") content on the target website and on another website.
    const oldScheme = await db.scheme.create({ data: { ...author, tenantId: w.tenantA.id, ownerUnitId: w.gpA.id, level: "STATE", nameEn: "Old scheme", nameMr: "जुनी योजना" } });
    const oldNotice = await db.announcement.create({ data: { ...author, tenantId: w.tenantA.id, ownerUnitId: w.gpA.id, category: "Notice", titleEn: "Old notice", titleMr: "जुनी सूचना", displayPages: ["home"] } });
    await db.scheme.create({ data: { ...author, tenantId: w.tenantB.id, ownerUnitId: w.gpB.id, level: "STATE", nameEn: "B scheme", nameMr: "ब योजना" } });
    const otherBefore = await snapshot(w.tenantB.id);

    const report = await importGpDataset(db, { tenantSlug: w.tenantA.slug, dataset, datasetName: "ganeshwadi" });

    expect(report.sections.invalid).toEqual([]);
    expect(report.sections.published.length).toBeGreaterThanOrEqual(15);
    expect(report.schemes).toEqual({ created: 11, updated: 0, archived: 1 });
    expect(report.announcements).toEqual({ created: dataset.events.length + dataset.campaigns.length, updated: 0, archived: 1 });

    // Old records are archived, not deleted.
    expect((await db.scheme.findUniqueOrThrow({ where: { id: oldScheme.id } })).status).toBe("ARCHIVED");
    expect((await db.announcement.findUniqueOrThrow({ where: { id: oldNotice.id } })).status).toBe("ARCHIVED");
    expect(await db.scheme.count({ where: { tenantId: w.tenantA.id, status: "PUBLISHED" } })).toBe(11);

    // Published sections carry the dataset's content; the website's name is unchanged.
    const members = await db.section.findFirstOrThrow({ where: { tenantId: w.tenantA.id, sectionKey: "members" }, include: { published: true } });
    expect(JSON.stringify(members.published?.data)).toContain("बाळासाहेब विठ्ठल माने");
    const tenant = await db.tenant.findUniqueOrThrow({ where: { id: w.tenantA.id } });
    expect((tenant.settings as { contact: { email: string } }).contact.email).toBe(dataset.contact.email);
    expect(tenant.nameEn).not.toBe("Ganeshwadi");

    // Pictures and PDFs are site assets the website can serve (redirect to the committed file).
    const doc = await db.media.findUniqueOrThrow({ where: { storageKey: `site:${dataset.documents[0]!.file}` } });
    expect(doc).toMatchObject({ kind: "DOCUMENT", source: "SITE_ASSET", mimeType: "application/pdf", tenantId: null });
    await expect(getPublicMediaFile(w.tenantA.slug, doc.id)).resolves.toMatchObject({ redirectTo: dataset.documents[0]!.file });

    // Another website is untouched.
    expect(await snapshot(w.tenantB.id)).toEqual(otherBefore);

    // Audited.
    expect(await db.auditLog.count({ where: { tenantId: w.tenantA.id, action: "content.import" } })).toBe(1);

    // Second run: nothing new.
    const before = await snapshot(w.tenantA.id);
    const again = await importGpDataset(db, { tenantSlug: w.tenantA.slug, dataset, datasetName: "ganeshwadi" });
    expect(again.sections.published).toEqual([]);
    expect(again.schemes).toEqual({ created: 0, updated: 0, archived: 0 });
    expect(again.announcements).toEqual({ created: 0, updated: 0, archived: 0 });
    expect(again.media.created).toBe(0);
    expect(await snapshot(w.tenantA.id)).toEqual(before);
  });

  it("a dry run writes nothing", async () => {
    const w = await buildWorld();
    await actor("GP_ADMIN", w.gpA.id);
    const before = await snapshot(w.tenantA.id);
    const mediaBefore = await db.media.count();
    const report = await importGpDataset(db, { tenantSlug: w.tenantA.slug, dataset, datasetName: "ganeshwadi", dryRun: true });
    expect(report.sections.published.length).toBeGreaterThan(0);
    expect(await snapshot(w.tenantA.id)).toEqual(before);
    expect(await db.media.count()).toBe(mediaBefore);
  });
});
