/**
 * Publish the website's design content into the database, so every block the public site shows comes from
 * published sections (editable in the admin) instead of the placeholder files in src/content/.
 *
 *   npx tsx scripts/publish-design-content.ts --tenant savardari            # publish
 *   npx tsx scripts/publish-design-content.ts --tenant savardari --dry-run  # report only, no writes
 *   npx tsx scripts/publish-design-content.ts --tenant savardari --refresh  # also rebuild its own untouched sections
 *
 * What it does, for one website:
 *  1. Registers every design picture (public/images/...) as a shared SITE_ASSET media record owned by the root
 *     unit, so sections reference it by media id and admins can replace it by uploading (idempotent).
 *  2. For every section of every page the admin editor shows, builds the same content the editor would open
 *     with (bannerSeed / sectionSeed / designSeed in src/lib/banner-seed.ts), with the design pictures kept as
 *     media ids, validates it against the section schema, and publishes it.
 *  3. Never overwrites admin work: a section that already has a published revision is left alone. With --refresh,
 *     a section whose live revision was written by this script and has not been edited since is rebuilt and
 *     republished when its content changed (for example after a schema rename).
 *
 * Uses DATABASE_URL (direct connection), like the seed. Run against production only on purpose.
 */
import "dotenv/config";
import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { PAGE_KEYS, type PageKey } from "../src/config/pages";
import { SECTION_REGISTRY } from "../src/config/sections";
import { FALLBACK_SECTIONS } from "../src/content/fallback";
import { isSiteAssetPath, siteAssetKey, siteAssetMime } from "../src/features/media/site-assets";
import { collectMediaIds } from "../src/features/media/references";
import { bannerSeed, designSeed, sectionSeed } from "../src/lib/banner-seed";
import { isEditorCard } from "../src/lib/editor-sections";
import { DESIGN_BRIDGES, designSchemes, patchDesign } from "./design-bridges";
import type { z } from "zod";

/** Stable JSON (sorted keys): Postgres jsonb reorders keys, so plain JSON.stringify would see false changes. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Obj)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

/** Drop fields the section does not have (design-only presentation fields), like the editor does. */
function fit(schema: z.ZodType, input: Obj): Obj {
  const data = JSON.parse(JSON.stringify(input)) as Obj;
  for (let round = 0; round < 30; round++) {
    const r = schema.safeParse(data);
    if (r.success) break;
    let changed = false;
    for (const issue of r.error.issues) {
      if (issue.code !== "unrecognized_keys") continue;
      const at = (issue.path as (string | number)[]).reduce<unknown>((o, k) => (o as Record<string | number, unknown> | undefined)?.[k], data);
      if (at && typeof at === "object") for (const k of (issue as unknown as { keys: string[] }).keys) delete (at as Obj)[k];
      changed = true;
    }
    if (!changed) break;
  }
  return data;
}

type Obj = Record<string, unknown>;

const args = process.argv.slice(2);
const slug = args[args.indexOf("--tenant") + 1];
const dryRun = args.includes("--dry-run");
const refresh = args.includes("--refresh");
if (!slug || args.indexOf("--tenant") < 0) {
  console.error("Usage: npx tsx scripts/publish-design-content.ts --tenant <slug> [--dry-run]");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

/**
 * Placeholder field names for pictures -> the section field(s) that hold a media id. Icon pictures are called
 * `iconImageId` on most cards and `iconId` on a few; both are written and the schema fit keeps the one the section has.
 */
const PICTURE_FIELDS: Record<string, string[]> = {
  imageUrl: ["imageId"],
  photoUrl: ["photoId"],
  iconUrl: ["iconImageId", "iconId"],
  iconImage: ["iconImageId", "iconId"],
  logoUrl: ["logoId"],
  thumbnailUrl: ["thumbnailId"],
  beforeUrl: ["beforeImageId"],
  afterUrl: ["afterImageId"],
  headingIconUrl: ["headingIconId"],
};

function collectSitePaths(v: unknown, out: Set<string>): Set<string> {
  if (typeof v === "string" && v.startsWith("/images/")) out.add(v);
  else if (Array.isArray(v)) v.forEach((x) => collectSitePaths(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collectSitePaths(x, out));
  return out;
}

/** Replace site picture paths with media ids, renaming placeholder picture fields to their section field. */
function toMediaRefs(v: unknown, ids: Map<string, string>): unknown {
  if (typeof v === "string") return ids.get(v) ?? v;
  if (Array.isArray(v)) return v.map((x) => toMediaRefs(x, ids));
  if (v && typeof v === "object") {
    const out: Obj = {};
    for (const [k, x] of Object.entries(v as Obj)) {
      const mapped = toMediaRefs(x, ids);
      const targets = PICTURE_FIELDS[k];
      if (targets && typeof x === "string" && ids.has(x)) {
        for (const t of targets) if (!(t in (v as Obj))) out[t] = mapped;
      } else out[k] = mapped;
    }
    return out;
  }
  return v;
}

/** The design picture of the page hero, as a media id (bannerSeed leaves pictures out). */
function heroImage(pageKey: PageKey): string | undefined {
  const hero = (FALLBACK_SECTIONS[pageKey] ?? []).find((s) => ["page-hero", "about-hero", "hero"].includes(s.sectionKey))?.data;
  const id = hero?.imageId ?? hero?.backgroundImageId;
  return typeof id === "string" && /^[a-z0-9]{10,40}$/.test(id) ? id : undefined;
}

/** Pictures of the blocks whose seed (sectionSeed) keeps texts only. */
function withPictures(pageKey: PageKey, key: string, data: Obj): Obj {
  const block = (FALLBACK_SECTIONS[pageKey] ?? []).find((s) => s.sectionKey === key)?.data as Obj | undefined;
  if (!block) return data;
  if (pageKey === "home" && key === "home-gallery" && Array.isArray(block.photos)) {
    const photos = (block.photos as Obj[]).filter((p) => typeof p.imageId === "string").map((p) => ({ imageId: p.imageId, ...(p.caption ? { caption: p.caption } : {}) }));
    return { ...data, photos };
  }
  if (pageKey === "home" && key === "welcome-video" && typeof block.imageId === "string") return { ...data, imageId: block.imageId };
  return data;
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug }, include: { unit: true } });
  if (!tenant) throw new Error(`No website with slug "${slug}"`);
  const rootUnitId = tenant.unit.path.split("/").filter(Boolean)[0]!;
  const settings = (tenant.settings ?? {}) as { contact?: { email?: string }; weather?: { location?: string } };

  // Author of the published revisions: the website's GP admin, else any super admin.
  const author =
    (await prisma.user.findFirst({ where: { status: "ACTIVE", roleAssignments: { some: { revokedAt: null, role: "GP_ADMIN", unitId: tenant.unitId } } } })) ??
    (await prisma.user.findFirst({ where: { status: "ACTIVE", roleAssignments: { some: { revokedAt: null, role: "SUPER_ADMIN" } } } }));
  if (!author) throw new Error("No active GP admin or super admin to author the revisions");

  // 1. Design pictures -> shared SITE_ASSET media (one record per file, reused by every website below the root).
  const paths = [...collectSitePaths(Object.values(FALLBACK_SECTIONS).flatMap((l) => (l ?? []).map((s) => s.data)), new Set())].sort();
  const ids = new Map<string, string>();
  const missing: string[] = [];
  for (const path of paths) {
    const file = join(process.cwd(), "public", path);
    if (!isSiteAssetPath(path) || !existsSync(file)) {
      missing.push(path);
      continue;
    }
    const storageKey = siteAssetKey(path);
    const existing = await prisma.media.findUnique({ where: { storageKey } });
    if (existing) {
      ids.set(path, existing.id);
      continue;
    }
    if (dryRun) {
      ids.set(path, `dryrun${ids.size.toString().padStart(8, "0")}`);
      continue;
    }
    const row = await prisma.media.create({
      data: {
        tenantId: null,
        ownerUnitId: rootUnitId,
        kind: "IMAGE",
        source: "SITE_ASSET",
        storageKey,
        originalName: basename(path),
        mimeType: siteAssetMime(path),
        sizeBytes: statSync(file).size,
      },
    });
    ids.set(path, row.id);
  }
  console.log(`Design pictures: ${ids.size} registered${missing.length ? `, ${missing.length} not found: ${missing.join(", ")}` : ""}`);

  // Swap the placeholder pictures for media ids, so the seeds below keep them.
  for (const list of Object.values(FALLBACK_SECTIONS)) for (const s of list ?? []) s.data = toMediaRefs(s.data, ids) as Obj;

  // 2. Build and publish.
  const report = { published: [] as string[], kept: [] as string[], noDesign: [] as string[], invalid: [] as string[], hidden: [] as string[] };
  for (const pageKey of PAGE_KEYS) {
    const defs = SECTION_REGISTRY[pageKey] ?? [];
    if (!defs.length) continue;
    const page = await prisma.page.findUnique({ where: { tenantId_pageKey: { tenantId: tenant.id, pageKey } }, include: { sections: { include: { published: true } } } });
    if (!page) continue;
    const all = defs.map((d) => ({ sectionKey: d.key }));
    const live = (key: string) => page.sections.find((s) => s.sectionKey === key)?.published?.data as Obj | undefined;

    for (const def of defs) {
      const name = `${pageKey}/${def.key}`;
      const existing = page.sections.find((s) => s.sectionKey === def.key);
      // Rebuildable: written by this script (audited as design-content) and not edited since (no newer revision).
      let rebuild = false;
      if (existing?.publishedId) {
        if (refresh) {
          const mine = await prisma.auditLog.findFirst({ where: { entityId: existing.publishedId, action: "section.publish", after: { path: ["source"], equals: "design-content" } } });
          const newer = await prisma.sectionRevision.count({ where: { sectionId: existing.id, version: { gt: existing.published!.version } } });
          rebuild = !!mine && newer === 0;
        }
        if (!rebuild) {
          report.kept.push(name);
          continue;
        }
      }
      if (!isEditorCard(pageKey, { sectionKey: def.key }, all)) {
        report.hidden.push(name);
        continue;
      }
      let data: Obj | undefined;
      if (def.key === "banner") {
        const heroData = pageKey === "home" ? live("hero") : pageKey === "about" ? live("overview") : undefined;
        data = bannerSeed(pageKey, heroData);
        const image = heroImage(pageKey);
        if (data && image && !data.imageId) data = { ...data, imageId: image };
      } else {
        // The editor's own seeds first (they follow the design blocks the frontend draws), then the script's conversions.
        data =
          sectionSeed(pageKey, def.key, live("welcome")) ??
          designSeed(pageKey, def.key, slug, settings.contact?.email, settings.weather?.location) ??
          DESIGN_BRIDGES[pageKey]?.[def.key]?.();
        if (data) data = withPictures(pageKey, def.key, data);
        // Blocks that miss a required setting get the design's defaults (or are skipped when that cannot be guessed).
        if (data && !def.schema.safeParse(data).success) {
          const patched = patchDesign(pageKey, def.key, data, { officeEmail: settings.contact?.email });
          if (patched) data = patched;
        }
        if (data) data = fit(def.schema, data);
      }
      if (!data) {
        report.noDesign.push(name);
        continue;
      }
      const parsed = def.schema.safeParse(data);
      if (!parsed.success) {
        report.invalid.push(`${name}: ${parsed.error.issues.slice(0, 2).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        continue;
      }
      // Only our own design pictures (or the website's media) may be referenced.
      const known = new Set(ids.values());
      const foreign = [...collectMediaIds(parsed.data)].filter((id) => !known.has(id));
      if (foreign.length && !dryRun) {
        const ok = await prisma.media.count({ where: { id: { in: foreign }, deletedAt: null, OR: [{ tenantId: tenant.id }, { tenantId: null }] } });
        if (ok !== foreign.length) {
          report.invalid.push(`${name}: references media of another website`);
          continue;
        }
      }
      if (rebuild && canonical(existing!.published!.data) === canonical(parsed.data)) {
        report.kept.push(name);
        continue;
      }
      if (!dryRun) await publish(tenant.id, page.id, def.key, def.sortOrder, existing?.id, parsed.data as Obj, author.id);
      report.published.push(rebuild ? `${name} (refreshed)` : name);
    }
  }

  // 3. Records behind list blocks: the design's featured schemes become scheme records of the website.
  const schemes: string[] = [];
  for (const s of designSchemes()) {
    const exists = await prisma.scheme.findFirst({ where: { tenantId: tenant.id, deletedAt: null, nameEn: s.name.en } });
    if (exists) continue;
    schemes.push(s.name.en ?? "");
    if (dryRun) continue;
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const row = await tx.scheme.create({
        data: {
          tenantId: tenant.id,
          ownerUnitId: tenant.unitId,
          level: s.level,
          nameEn: s.name.en || null,
          nameMr: s.name.mr || null,
          descriptionEn: s.description?.en || null,
          descriptionMr: s.description?.mr || null,
          category: s.category ?? null,
          benefitValueEn: s.benefitValue?.en || null,
          benefitValueMr: s.benefitValue?.mr || null,
          benefitCaptionEn: s.benefitCaption?.en || null,
          benefitCaptionMr: s.benefitCaption?.mr || null,
          status: "PUBLISHED",
          createdById: author.id,
          submittedAt: now,
          reviewedById: author.id,
          reviewedAt: now,
          publishedById: author.id,
          publishedAt: now,
        },
      });
      await tx.auditLog.create({ data: { actorId: author.id, tenantId: tenant.id, unitId: tenant.unitId, action: "scheme.publish", entityType: "Scheme", entityId: row.id, after: { source: "design-content" } } });
    });
  }
  console.log(`${dryRun ? "[dry run] would create" : "Created"} ${schemes.length} scheme records: ${schemes.join(", ")}`);

  console.log(`${dryRun ? "[dry run] would publish" : "Published"} ${report.published.length}: ${report.published.join(", ")}`);
  console.log(`Already published (left as they are) ${report.kept.length}: ${report.kept.join(", ")}`);
  console.log(`No design content ${report.noDesign.length}: ${report.noDesign.join(", ")}`);
  console.log(`Not shown by the editor/site ${report.hidden.length}: ${report.hidden.join(", ")}`);
  if (report.invalid.length) console.log(`Could not convert ${report.invalid.length}:\n  ${report.invalid.join("\n  ")}`);
}

async function publish(tenantId: string, pageId: string, sectionKey: string, sortOrder: number, sectionId: string | undefined, data: Obj, authorId: string) {
  await prisma.$transaction(async (tx) => {
    const section = sectionId
      ? await tx.section.findUniqueOrThrow({ where: { id: sectionId } })
      : await tx.section.create({ data: { tenantId, pageId, sectionKey, sortOrder } });
    const version = (await tx.sectionRevision.count({ where: { sectionId: section.id } })) + 1;
    const now = new Date();
    const rev = await tx.sectionRevision.create({
      data: {
        tenantId,
        sectionId: section.id,
        version,
        status: "PUBLISHED",
        data: data as Prisma.InputJsonValue,
        createdById: authorId,
        submittedAt: now,
        reviewedById: authorId,
        reviewedAt: now,
        publishedById: authorId,
        publishedAt: now,
      },
    });
    await tx.section.update({ where: { id: section.id }, data: { publishedId: rev.id } });
    await tx.auditLog.create({
      data: { actorId: authorId, tenantId, action: "section.publish", entityType: "SectionRevision", entityId: rev.id, after: { sectionKey, version, source: "design-content" } },
    });
  });
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
