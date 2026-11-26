/**
 * Import a Gram Panchayat content dataset (./gp-dataset.ts) into one website. Backend only; run from
 * scripts/import-gp-dataset.ts. Idempotent: a second run publishes nothing new and creates no duplicates.
 *
 * What it changes on the target website (and nothing else — no other website, unit or user is touched):
 *  1. Pictures and PDFs of the dataset become shared SITE_ASSET media records (no bytes stored; the files ship in
 *     public/). Owned by the root unit like the design pictures, so admins can pick them from the library.
 *  2. Contact settings (email, phone, address, hours) and the weather place.
 *  3. The sections the dataset can fill are published as new revisions (history kept, audited). Presentation
 *     settings the dataset has no value for are kept from the live revision.
 *  4. Schemes and announcements: the dataset's ones are created (or updated when re-run) and published; the
 *     website's other schemes and announcements are ARCHIVED — never deleted, so they can be restored.
 * Sections the dataset has no content for are left exactly as they are.
 */
import { statSync } from "node:fs";
import { basename, join } from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { siteAssetKey, siteAssetKind, siteAssetMime } from "@/features/media/site-assets";
import type { db as appDb } from "@/lib/db";
import { buildSections, collectSitePaths, type GpDataset } from "./gp-dataset";

type Db = typeof appDb;
type Obj = Record<string, unknown>;

export interface ImportOptions {
  tenantSlug: string;
  dataset: GpDataset;
  /** Label stored in audit entries, e.g. "ganeshwadi". */
  datasetName: string;
  dryRun?: boolean;
  /** Folder that holds public/ (default: the working directory). */
  rootDir?: string;
}

export interface ImportReport {
  tenant: string;
  media: { created: number; reused: number; missingFiles: string[] };
  settings: "updated" | "unchanged";
  sections: { published: string[]; unchanged: string[]; invalid: string[] };
  schemes: { created: number; updated: number; archived: number };
  announcements: { created: number; updated: number; archived: number };
}

/** Stable JSON (sorted keys) — jsonb reorders keys, so plain JSON.stringify would see false changes. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Obj)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

export async function importGpDataset(db: Db, opts: ImportOptions): Promise<ImportReport> {
  const { dataset: d, dryRun = false } = opts;
  const rootDir = opts.rootDir ?? process.cwd();
  const tenant = await db.tenant.findUnique({ where: { slug: opts.tenantSlug }, include: { unit: true } });
  if (!tenant) throw new Error(`No website with slug "${opts.tenantSlug}"`);
  const rootUnitId = tenant.unit.path.split("/").filter(Boolean)[0] ?? tenant.unitId;
  const source = `gp-dataset:${opts.datasetName}`;

  // Author of revisions and records: the website's GP admin, else a super admin.
  const author =
    (await db.user.findFirst({ where: { status: "ACTIVE", deletedAt: null, roleAssignments: { some: { revokedAt: null, role: "GP_ADMIN", unitId: tenant.unitId } } } })) ??
    (await db.user.findFirst({ where: { status: "ACTIVE", deletedAt: null, roleAssignments: { some: { revokedAt: null, role: "SUPER_ADMIN" } } } }));
  if (!author) throw new Error("No active GP admin or super admin to author the content");

  const report: ImportReport = {
    tenant: tenant.slug,
    media: { created: 0, reused: 0, missingFiles: [] },
    settings: "unchanged",
    sections: { published: [], unchanged: [], invalid: [] },
    schemes: { created: 0, updated: 0, archived: 0 },
    announcements: { created: 0, updated: 0, archived: 0 },
  };

  // 1. Media ------------------------------------------------------------------------------------------------
  const ids = new Map<string, string>();
  for (const path of collectSitePaths(d)) {
    let size: number;
    try {
      size = statSync(join(rootDir, "public", path)).size;
    } catch {
      report.media.missingFiles.push(path);
      continue;
    }
    const storageKey = siteAssetKey(path);
    const existing = await db.media.findUnique({ where: { storageKey } });
    if (existing) {
      ids.set(path, existing.id);
      report.media.reused++;
      continue;
    }
    report.media.created++;
    if (dryRun) {
      ids.set(path, `dryrun${ids.size.toString().padStart(8, "0")}`);
      continue;
    }
    const alt = altFor(d, path);
    const row = await db.media.create({
      data: {
        tenantId: null,
        ownerUnitId: rootUnitId,
        kind: siteAssetKind(path),
        source: "SITE_ASSET",
        storageKey,
        originalName: basename(path),
        mimeType: siteAssetMime(path),
        sizeBytes: size,
        altEn: alt?.en.slice(0, 300) ?? null,
        altMr: alt?.mr.slice(0, 300) ?? null,
        uploadedById: author.id,
      },
    });
    ids.set(path, row.id);
  }
  if (report.media.missingFiles.length) {
    throw new Error(`Files missing under public/ (copy them first): ${report.media.missingFiles.join(", ")}`);
  }
  const media = (path: string) => {
    const id = ids.get(path);
    if (!id) throw new Error(`No media for ${path}`);
    return id;
  };

  // 2. Settings ---------------------------------------------------------------------------------------------
  const settings = (tenant.settings ?? {}) as Obj;
  const nextSettings: Obj = {
    ...settings,
    contact: {
      ...((settings.contact as Obj | undefined) ?? {}),
      email: d.contact.email,
      phone: d.contact.phone,
      address: d.contact.address.en.slice(0, 500),
      hours: d.contact.hours.en.slice(0, 200),
    },
    weather: { location: d.contact.weatherLocation },
  };
  if (canonical(nextSettings) !== canonical(settings)) {
    report.settings = "updated";
    if (!dryRun) await db.tenant.update({ where: { id: tenant.id }, data: { settings: nextSettings as Prisma.InputJsonValue } });
  }

  // 3. Sections ---------------------------------------------------------------------------------------------
  const live = await db.section.findMany({
    where: { tenantId: tenant.id },
    include: { page: { select: { pageKey: true } }, published: { select: { data: true } } },
  });
  const liveData = (pageKey: string, sectionKey: string) => live.find((s) => s.page.pageKey === pageKey && s.sectionKey === sectionKey)?.published?.data as Obj | undefined;
  const built = buildSections(d, media, liveData);
  report.sections.invalid = built.invalid;

  for (const s of built.sections) {
    const label = `${s.pageKey}/${s.sectionKey}`;
    const current = liveData(s.pageKey, s.sectionKey);
    if (current && canonical(current) === canonical(s.data)) {
      report.sections.unchanged.push(label);
      continue;
    }
    report.sections.published.push(label);
    if (dryRun) continue;
    await db.$transaction(async (tx) => {
      const page = await tx.page.upsert({
        where: { tenantId_pageKey: { tenantId: tenant.id, pageKey: s.pageKey } },
        create: { tenantId: tenant.id, pageKey: s.pageKey },
        update: {},
      });
      const existing = live.find((x) => x.page.pageKey === s.pageKey && x.sectionKey === s.sectionKey);
      const section = existing
        ? await tx.section.findUniqueOrThrow({ where: { id: existing.id } })
        : await tx.section.create({ data: { tenantId: tenant.id, pageId: page.id, sectionKey: s.sectionKey, sortOrder: 0 } });
      const version = (await tx.sectionRevision.count({ where: { sectionId: section.id } })) + 1;
      const now = new Date();
      const rev = await tx.sectionRevision.create({
        data: {
          tenantId: tenant.id,
          sectionId: section.id,
          version,
          status: "PUBLISHED",
          data: s.data as Prisma.InputJsonValue,
          createdById: author.id,
          submittedAt: now,
          reviewedById: author.id,
          reviewedAt: now,
          publishedById: author.id,
          publishedAt: now,
        },
      });
      await tx.section.update({ where: { id: section.id }, data: { publishedId: rev.id } });
      await tx.auditLog.create({
        data: { actorId: author.id, tenantId: tenant.id, action: "section.publish", entityType: "SectionRevision", entityId: rev.id, after: { sectionKey: s.sectionKey, pageKey: s.pageKey, version, source } },
      });
    });
  }

  // 4. Records ----------------------------------------------------------------------------------------------
  const now = new Date();
  const published = { status: "PUBLISHED" as const, createdById: author.id, submittedAt: now, reviewedById: author.id, reviewedAt: now, publishedById: author.id, publishedAt: now };

  // Schemes: matched by Marathi name on this website.
  const schemeNames = new Set(d.schemes.map((s) => s.name.mr));
  const liveSchemes = await db.scheme.findMany({ where: { tenantId: tenant.id, deletedAt: null } });
  for (const s of d.schemes) {
    const fields = {
      level: s.level,
      nameEn: s.name.en,
      nameMr: s.name.mr,
      descriptionEn: s.description.en,
      descriptionMr: s.description.mr,
      externalUrl: s.externalUrl ?? null,
      category: s.category ?? null,
      benefitValueEn: s.benefitValue?.en ?? null,
      benefitValueMr: s.benefitValue?.mr ?? null,
    };
    const match = liveSchemes.find((x) => x.nameMr === s.name.mr);
    if (match) {
      const same = Object.entries(fields).every(([k, v]) => (match as unknown as Obj)[k] === v) && match.status === "PUBLISHED";
      if (same) continue;
      report.schemes.updated++;
      if (!dryRun) await db.scheme.update({ where: { id: match.id }, data: { ...fields, ...published } });
    } else {
      report.schemes.created++;
      if (!dryRun) await db.scheme.create({ data: { ...fields, ...published, tenantId: tenant.id, ownerUnitId: tenant.unitId } });
    }
  }
  const staleSchemes = liveSchemes.filter((x) => !schemeNames.has(x.nameMr ?? "") && x.status !== "ARCHIVED");
  report.schemes.archived = staleSchemes.length;
  if (!dryRun && staleSchemes.length) await db.scheme.updateMany({ where: { id: { in: staleSchemes.map((x) => x.id) } }, data: { status: "ARCHIVED" } });

  // Announcements: events and campaign activities, matched by Marathi title on this website.
  type Ann = { category: string; title: { en: string; mr: string }; body: { en: string; mr: string }; date?: string; location?: { en: string; mr: string }; photo?: string };
  const anns: Ann[] = [
    ...d.events.map((e) => ({ category: "Event", ...e })),
    ...d.campaigns.map((c) => ({ category: "Completed", ...c, body: d.campaignName ? { en: `${d.campaignName.en}: ${c.body.en}`, mr: `${d.campaignName.mr}: ${c.body.mr}` } : c.body })),
  ];
  const annTitles = new Set(anns.map((a) => a.title.mr));
  const liveAnns = await db.announcement.findMany({ where: { tenantId: tenant.id, deletedAt: null } });
  for (const a of anns) {
    const day = a.date ? new Date(`${a.date}T10:00:00+05:30`) : null;
    const fields = {
      category: a.category,
      titleEn: a.title.en,
      titleMr: a.title.mr,
      bodyEn: a.body.en,
      bodyMr: a.body.mr,
      attachmentId: a.photo ? media(a.photo) : null,
      eventStartAt: day,
      eventLocationEn: a.location?.en ?? null,
      eventLocationMr: a.location?.mr ?? null,
      displayPages: ["home", "announcements"],
    };
    const match = liveAnns.find((x) => x.titleMr === a.title.mr);
    if (match) {
      const same =
        match.status === "PUBLISHED" &&
        Object.entries(fields).every(([k, v]) => canonical((match as unknown as Obj)[k] instanceof Date ? ((match as unknown as Obj)[k] as Date).toISOString() : (match as unknown as Obj)[k]) === canonical(v instanceof Date ? v.toISOString() : v));
      if (same) continue;
      report.announcements.updated++;
      if (!dryRun) await db.announcement.update({ where: { id: match.id }, data: { ...fields, ...published, publishedAt: day ?? now } });
    } else {
      report.announcements.created++;
      if (!dryRun) await db.announcement.create({ data: { ...fields, ...published, publishedAt: day ?? now, tenantId: tenant.id, ownerUnitId: tenant.unitId } });
    }
  }
  const staleAnns = liveAnns.filter((x) => !annTitles.has(x.titleMr ?? "") && x.status !== "ARCHIVED");
  report.announcements.archived = staleAnns.length;
  if (!dryRun && staleAnns.length) await db.announcement.updateMany({ where: { id: { in: staleAnns.map((x) => x.id) } }, data: { status: "ARCHIVED" } });

  if (!dryRun) {
    await db.auditLog.create({
      data: {
        actorId: author.id,
        tenantId: tenant.id,
        action: "content.import",
        entityType: "Tenant",
        entityId: tenant.id,
        after: { source, sections: report.sections.published.length, schemes: report.schemes, announcements: report.announcements, media: report.media.created } as Prisma.InputJsonValue,
      },
    });
  }
  return report;
}

/** Alt text for a picture: the caption or person it shows in the dataset. */
function altFor(d: GpDataset, path: string): { en: string; mr: string } | undefined {
  for (const p of d.gallery.photos) if (p.photo === path) return p.title;
  for (const p of [...d.leaders, ...d.members]) if (p.photo === path) return p.name;
  for (const e of [...d.events, ...d.campaigns]) if (e.photo === path) return e.title;
  for (const doc of d.documents) if (doc.file === path) return doc.name;
  return undefined;
}
