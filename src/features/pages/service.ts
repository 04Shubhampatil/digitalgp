import type { Prisma } from "@/generated/prisma/client";
import { isPageKey, type PageKey } from "@/config/pages";
import { MEDIA_REF_PATTERN, findSection, sectionsForPage, type SectionDefinition } from "@/config/sections";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db, type Tx } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan } from "@/lib/permissions";
import { getPublicTenantBySlug, getTenantForActor, type ResolvedTenant } from "@/lib/tenant";
import { parseValue } from "@/lib/validation";
import { pageTag, revalidatePublicTags, tenantTag } from "@/lib/revalidate";
import type { PageDto, PageSectionDto, PublicPageDto, SectionRevisionDto } from "@/types/api";
import { nextStatus, transitionCapability } from "@/features/content/workflow";
import type { SaveSectionDraftInput, SectionAction, UpdatePageInput } from "@/features/pages/validators";

const MODULE = "pages" as const;

const sectionInclude = { draft: true, published: true } satisfies Prisma.SectionInclude;
type SectionRow = Prisma.SectionGetPayload<{ include: typeof sectionInclude }>;
type RevisionRow = Prisma.SectionRevisionGetPayload<Record<string, never>>;
const pageInclude = { sections: { include: sectionInclude } } satisfies Prisma.PageInclude;
type PageRow = Prisma.PageGetPayload<{ include: typeof pageInclude }>;

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

function toRevisionDto(r: RevisionRow, withData: boolean): SectionRevisionDto {
  return {
    id: r.id,
    version: r.version,
    status: r.status,
    data: withData ? (r.data as Record<string, unknown>) : null,
    createdById: r.createdById,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    reviewedById: r.reviewedById,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNote: r.reviewNote,
    publishedById: r.publishedById,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Registry-driven: every registered section appears, whether or not a row exists yet. */
function toSectionDtos(pageKey: PageKey, rows: SectionRow[]): PageSectionDto[] {
  const byKey = new Map(rows.map((s) => [s.sectionKey, s]));
  return sectionsForPage(pageKey)
    .map((def) => {
      const row = byKey.get(def.key);
      return {
        sectionKey: def.key,
        sortOrder: row?.sortOrder ?? def.sortOrder,
        isVisible: row?.isVisible ?? true,
        draft: row?.draft ? toRevisionDto(row.draft, true) : null,
        published: row?.published ? toRevisionDto(row.published, true) : null,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function toSectionDto(pageKey: string, row: SectionRow): PageSectionDto {
  return toSectionDtos(pageKey as PageKey, [row]).find((s) => s.sectionKey === row.sectionKey)!;
}

function toPageDto(p: PageRow): PageDto {
  const pageKey = p.pageKey as PageKey;
  return {
    id: p.id,
    tenantId: p.tenantId,
    pageKey,
    isEnabled: p.isEnabled,
    seoTitleEn: p.seoTitleEn,
    seoTitleMr: p.seoTitleMr,
    seoDescriptionEn: p.seoDescriptionEn,
    seoDescriptionMr: p.seoDescriptionMr,
    shareImageId: p.shareImageId,
    sections: toSectionDtos(pageKey, p.sections),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Loading helpers
// ---------------------------------------------------------------------------

async function loadPage(tenantId: string, pageKey: string, tx: Tx | typeof db = db): Promise<PageRow> {
  if (!isPageKey(pageKey)) throw Errors.notFound("Page");
  const page = await tx.page.findUnique({ where: { tenantId_pageKey: { tenantId, pageKey } }, include: pageInclude });
  if (!page) throw Errors.notFound("Page");
  return page;
}

function requireDefinition(pageKey: string, sectionKey: string): SectionDefinition {
  if (!isPageKey(pageKey)) throw Errors.notFound("Page");
  const def = findSection(pageKey, sectionKey);
  if (!def) throw Errors.notFound("Section");
  return def;
}

/** Collect every media id held under a `...Id` / `...Ids` field anywhere in the data. */
function collectMediaRefs(value: unknown, out: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collectMediaRefs(v, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (MEDIA_REF_PATTERN.test(k) && typeof v === "string") out.add(v);
      else if (MEDIA_REF_PATTERN.test(k) && Array.isArray(v)) {
        for (const id of v) if (typeof id === "string") out.add(id);
      } else collectMediaRefs(v, out);
    }
  }
}

/** Media referenced by a section must belong to the website or be shared by an ancestor unit. */
async function assertMediaOwnership(tenant: ResolvedTenant, data: unknown): Promise<void> {
  const refs = new Set<string>();
  collectMediaRefs(data, refs);
  if (refs.size === 0) return;
  const ids = [...refs];
  const media = await db.media.findMany({ where: { id: { in: ids }, deletedAt: null, source: "ADMIN" }, select: { id: true, tenantId: true, ownerUnit: { select: { path: true } } } });
  const ok = new Set(media.filter((m) => m.tenantId === tenant.id || (m.tenantId === null && tenant.unitPath.startsWith(m.ownerUnit.path))).map((m) => m.id));
  const bad = ids.filter((id) => !ok.has(id));
  if (bad.length) throw Errors.badRequest("Referenced media does not belong to this website", { mediaIds: bad });
}

// ---------------------------------------------------------------------------
// Admin: pages
// ---------------------------------------------------------------------------

export async function listPages(ctx: AuthContext, tenantId: string): Promise<PageDto[]> {
  const tenant = await getTenantForActor(ctx, tenantId);
  const pages = await db.page.findMany({ where: { tenantId: tenant.id }, include: pageInclude, orderBy: { createdAt: "asc" } });
  return pages.map(toPageDto);
}

export async function getPage(ctx: AuthContext, tenantId: string, pageKey: string): Promise<PageDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  return toPageDto(await loadPage(tenant.id, pageKey));
}

/** Page-level settings (enabled flag, SEO). Admin only — `tenant:update`. */
export async function updatePage(ctx: AuthContext, tenantId: string, pageKey: string, input: UpdatePageInput, client: ClientInfo): Promise<PageDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "tenant:update", { unitPath: tenant.unitPath });
  const before = await loadPage(tenant.id, pageKey);
  if (input.shareImageId) await assertMediaOwnership(tenant, { shareImageId: input.shareImageId });

  const data: Prisma.PageUncheckedUpdateInput = {};
  if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;
  if (input.seoTitleEn !== undefined) data.seoTitleEn = input.seoTitleEn;
  if (input.seoTitleMr !== undefined) data.seoTitleMr = input.seoTitleMr;
  if (input.seoDescriptionEn !== undefined) data.seoDescriptionEn = input.seoDescriptionEn;
  if (input.seoDescriptionMr !== undefined) data.seoDescriptionMr = input.seoDescriptionMr;
  if (input.shareImageId !== undefined) data.shareImageId = input.shareImageId;

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.page.update({ where: { id: before.id }, data, include: pageInclude });
    const strip = (p: PageRow) => ({ isEnabled: p.isEnabled, seoTitleEn: p.seoTitleEn, seoTitleMr: p.seoTitleMr, seoDescriptionEn: p.seoDescriptionEn, seoDescriptionMr: p.seoDescriptionMr, shareImageId: p.shareImageId });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "page.update", entityType: "Page", entityId: row.id, tenantId: tenant.id, unitId: tenant.unitId, before: strip(before), after: strip(row) },
      tx,
    );
    return row;
  });
  revalidatePublicTags([tenantTag(tenant.slug), pageTag(tenant.slug, pageKey)]);
  return toPageDto(updated);
}

// ---------------------------------------------------------------------------
// Admin: section drafts
// ---------------------------------------------------------------------------

async function loadSection(tx: Tx | typeof db, pageId: string, sectionKey: string): Promise<SectionRow | null> {
  return tx.section.findUnique({ where: { pageId_sectionKey: { pageId, sectionKey } }, include: sectionInclude });
}

/**
 * Save the working draft of a section. Creates the Section row on first use. While the draft is
 * DRAFT/REJECTED it is updated in place; once submitted it is frozen until reviewed. Publishing
 * never touches the draft of a *different* revision, so the public site keeps serving the
 * published snapshot while a new draft is edited.
 */
export async function saveSectionDraft(
  ctx: AuthContext,
  tenantId: string,
  pageKey: string,
  sectionKey: string,
  input: SaveSectionDraftInput,
  client: ClientInfo,
): Promise<PageSectionDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "content:edit", { unitPath: tenant.unitPath, moduleKey: MODULE });
  const def = requireDefinition(pageKey, sectionKey);
  const page = await loadPage(tenant.id, pageKey);
  const data = parseValue(input.data, def.schema) as Prisma.InputJsonValue;
  await assertMediaOwnership(tenant, data);

  const section = await db.$transaction(async (tx) => {
    let row = await loadSection(tx, page.id, sectionKey);
    if (!row) {
      await tx.section.create({ data: { tenantId: tenant.id, pageId: page.id, sectionKey, sortOrder: input.sortOrder ?? def.sortOrder, isVisible: input.isVisible ?? true } });
      row = (await loadSection(tx, page.id, sectionKey))!;
    }
    const draft = row.draft;
    if (draft && draft.status !== "DRAFT" && draft.status !== "REJECTED") {
      throw Errors.conflict(`The draft is ${draft.status}; it must be reviewed before it can be edited again`);
    }
    let revisionId: string;
    if (draft) {
      await tx.sectionRevision.update({ where: { id: draft.id }, data: { data, status: "DRAFT", reviewNote: null, submittedAt: null, reviewedAt: null, reviewedById: null } });
      revisionId = draft.id;
    } else {
      const last = await tx.sectionRevision.aggregate({ where: { sectionId: row.id }, _max: { version: true } });
      const created = await tx.sectionRevision.create({
        data: { tenantId: tenant.id, sectionId: row.id, version: (last._max.version ?? 0) + 1, status: "DRAFT", data, createdById: ctx.user.id },
      });
      revisionId = created.id;
    }
    const updated = await tx.section.update({
      where: { id: row.id },
      data: {
        draftId: revisionId,
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isVisible !== undefined ? { isVisible: input.isVisible } : {}),
      },
      include: sectionInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "section.save", entityType: "SectionRevision", entityId: revisionId, tenantId: tenant.id, unitId: tenant.unitId, after: { pageKey, sectionKey, version: updated.draft?.version, sortOrder: updated.sortOrder, isVisible: updated.isVisible } },
      tx,
    );
    return updated;
  });
  return toSectionDto(pageKey, section);
}

/** Drop an unsubmitted draft (DRAFT/REJECTED). The published revision is untouched. */
export async function discardSectionDraft(ctx: AuthContext, tenantId: string, pageKey: string, sectionKey: string, client: ClientInfo): Promise<PageSectionDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "content:edit", { unitPath: tenant.unitPath, moduleKey: MODULE });
  requireDefinition(pageKey, sectionKey);
  const page = await loadPage(tenant.id, pageKey);
  const row = await loadSection(db, page.id, sectionKey);
  if (!row?.draft) throw Errors.notFound("Draft");
  if (row.draft.status !== "DRAFT" && row.draft.status !== "REJECTED") throw Errors.conflict(`A ${row.draft.status} draft cannot be discarded`);
  const draftId = row.draft.id;
  const updated = await db.$transaction(async (tx) => {
    await tx.section.update({ where: { id: row.id }, data: { draftId: null } });
    await tx.sectionRevision.delete({ where: { id: draftId } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "section.discard", entityType: "SectionRevision", entityId: draftId, tenantId: tenant.id, unitId: tenant.unitId, before: { pageKey, sectionKey, version: row.draft!.version } },
      tx,
    );
    return (await loadSection(tx, row.pageId, sectionKey))!;
  });
  return toSectionDto(pageKey, updated);
}

/**
 * Workflow on the section's draft revision. `publish` swaps the approved draft into the
 * published slot (archiving the previous published revision); `unpublish` takes the published
 * revision offline and makes it the draft again (only when no other draft exists).
 */
export async function transitionSection(
  ctx: AuthContext,
  tenantId: string,
  pageKey: string,
  sectionKey: string,
  action: SectionAction,
  note: string | null | undefined,
  client: ClientInfo,
): Promise<PageSectionDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, transitionCapability(action), { unitPath: tenant.unitPath, moduleKey: MODULE });
  const definition = requireDefinition(pageKey, sectionKey);
  const page = await loadPage(tenant.id, pageKey);
  const row = await loadSection(db, page.id, sectionKey);
  if (!row) throw Errors.notFound("Section");
  const now = new Date();

  const updated = await db.$transaction(async (tx) => {
    if (action === "unpublish") {
      if (!row.published) throw Errors.invalidTransition("DRAFT", "APPROVED");
      if (row.draft) throw Errors.conflict("Discard or publish the pending draft before unpublishing");
      nextStatus(row.published.status, "unpublish");
      await tx.sectionRevision.update({ where: { id: row.published.id }, data: { status: "APPROVED" } });
      await tx.section.update({ where: { id: row.id }, data: { publishedId: null, draftId: row.published.id } });
    } else {
      const draft = row.draft;
      if (!draft) throw Errors.notFound("Draft");
      if (action === "submit" && definition.submitCheck) {
        try {
          definition.submitCheck(draft.data);
        } catch (err) {
          throw Errors.badRequest(err instanceof Error ? err.message : "This section cannot be submitted yet");
        }
      }
      const to = nextStatus(draft.status, action, note);
      const data: Prisma.SectionRevisionUncheckedUpdateInput = { status: to };
      switch (action) {
        case "submit":
          data.submittedAt = now;
          data.reviewNote = null;
          break;
        case "approve":
        case "reject":
          data.reviewedById = ctx.user.id;
          data.reviewedAt = now;
          data.reviewNote = note ?? null;
          break;
        case "publish":
          data.publishedById = ctx.user.id;
          data.publishedAt = now;
          break;
        default:
          break;
      }
      await tx.sectionRevision.update({ where: { id: draft.id }, data });
      if (action === "publish") {
        if (row.publishedId) await tx.sectionRevision.update({ where: { id: row.publishedId }, data: { status: "ARCHIVED" } });
        await tx.section.update({ where: { id: row.id }, data: { publishedId: draft.id, draftId: null } });
      }
    }
    await writeAudit(
      actorFromContext(ctx, client),
      {
        action: `section.${action}`,
        entityType: "SectionRevision",
        entityId: action === "unpublish" ? row.published!.id : row.draft!.id,
        tenantId: tenant.id,
        unitId: tenant.unitId,
        before: { pageKey, sectionKey, status: action === "unpublish" ? row.published!.status : row.draft!.status },
        after: { note: note ?? null },
      },
      tx,
    );
    return (await loadSection(tx, row.pageId, sectionKey))!;
  });
  // Publish/unpublish changes what the public page shows; drop the cached fetches right away.
  if (action === "publish" || action === "unpublish") revalidatePublicTags([tenantTag(tenant.slug), pageTag(tenant.slug, pageKey)]);
  return toSectionDto(pageKey, updated);
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Published, visible sections of an enabled page on a published website. Drafts never leak. */
export async function getPublicPage(tenantSlug: string, pageKey: string): Promise<PublicPageDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  if (!isPageKey(pageKey)) throw Errors.notFound("Page");
  const page = await db.page.findUnique({
    where: { tenantId_pageKey: { tenantId: tenant.id, pageKey } },
    include: { sections: { where: { isVisible: true, publishedId: { not: null } }, include: { published: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!page || !page.isEnabled) throw Errors.notFound("Page");
  return {
    pageKey,
    seo: {
      titleEn: page.seoTitleEn,
      titleMr: page.seoTitleMr,
      descriptionEn: page.seoDescriptionEn,
      descriptionMr: page.seoDescriptionMr,
      shareImageId: page.shareImageId,
    },
    sections: page.sections
      .filter((s) => s.published && s.published.status === "PUBLISHED")
      .map((s) => ({ sectionKey: s.sectionKey, sortOrder: s.sortOrder, data: s.published!.data as Record<string, unknown>, publishedAt: s.published!.publishedAt?.toISOString() ?? null })),
  };
}
