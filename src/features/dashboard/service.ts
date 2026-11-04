import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { OPTIONAL_PAGE_KEYS } from "@/config/pages";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { unitPathScopeFilter } from "@/lib/permissions";
import { idSchema, paginate, paginationQuerySchema } from "@/lib/validation";
import type { DashboardPendingItemDto, DashboardWebsiteDto } from "@/types/api";

/**
 * Admin dashboard (Block / Taluka admin "GP Websites" overview): for every website in the caller's
 * area — pending review items, who changed it last and when, and how much of it is set up — plus a
 * feed of the latest items waiting for review. Read-only and scoped exactly like GET /tenants.
 */

export const dashboardQuerySchema = paginationQuerySchema.extend({ unitId: idSchema.optional() });
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

const PENDING = ["SUBMITTED", "UNDER_REVIEW"] as const;
const PENDING_FEED_SIZE = 20;

type CountRow = { tenantId: string | null; _count: { _all: number } };

function addCounts(target: Map<string, number>, rows: CountRow[]) {
  for (const r of rows) if (r.tenantId) target.set(r.tenantId, (target.get(r.tenantId) ?? 0) + r._count._all);
}

export async function listDashboardWebsites(ctx: AuthContext, query: DashboardQuery) {
  const scope = unitPathScopeFilter(ctx);
  const tenants = await db.tenant.findMany({
    where: { unit: query.unitId ? { AND: [scope, { path: { contains: `/${query.unitId}/` } }] } : scope },
    select: { id: true, slug: true, nameEn: true, nameMr: true, status: true, publishedAt: true, unitId: true },
    orderBy: [{ nameEn: "asc" }, { id: "asc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(tenants, query.limit);
  const ids = page.items.map((t) => t.id);
  if (ids.length === 0) return { ...page, items: [] as DashboardWebsiteDto[] };

  const inPage = { tenantId: { in: ids } };
  const [sections, announcements, schemes, projects, stories, pages, lastChanges] = await Promise.all([
    db.sectionRevision.groupBy({ by: ["tenantId"], where: { ...inPage, status: { in: [...PENDING] }, draftOf: { isNot: null } }, _count: { _all: true } }),
    db.announcement.groupBy({ by: ["tenantId"], where: { ...inPage, deletedAt: null, status: { in: [...PENDING] } }, _count: { _all: true } }),
    db.scheme.groupBy({ by: ["tenantId"], where: { ...inPage, deletedAt: null, status: { in: [...PENDING] } }, _count: { _all: true } }),
    db.project.groupBy({ by: ["tenantId"], where: { ...inPage, deletedAt: null, status: { in: [...PENDING] } }, _count: { _all: true } }),
    db.successStory.groupBy({ by: ["tenantId"], where: { ...inPage, deletedAt: null, status: { in: [...PENDING] } }, _count: { _all: true } }),
    // Setup progress: enabled pages (optional pages count only once enabled) that have at least one published, visible section.
    db.page.findMany({
      where: { ...inPage, isEnabled: true },
      select: { tenantId: true, pageKey: true, _count: { select: { sections: { where: { isVisible: true, publishedId: { not: null } } } } } },
    }),
    // Last staff change per website (sign-ins and public submissions are not "updates").
    Promise.all(
      ids.map((tenantId) =>
        db.auditLog.findFirst({
          where: { tenantId, actorId: { not: null }, result: "SUCCESS", NOT: [{ action: { startsWith: "auth." } }, { action: { startsWith: "form." } }, { action: "grievance.submit" }] },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { tenantId: true, action: true, createdAt: true, actor: { select: { id: true, name: true } } },
        }),
      ),
    ),
  ]);

  const pending = new Map<string, number>();
  for (const rows of [sections, announcements, schemes, projects, stories] as CountRow[][]) addCounts(pending, rows);
  const last = new Map(lastChanges.filter((r): r is NonNullable<typeof r> => !!r).map((r) => [r.tenantId!, r]));

  const items: DashboardWebsiteDto[] = page.items.map((t) => {
    const own = pages.filter((p) => p.tenantId === t.id);
    const required = own.filter((p) => !OPTIONAL_PAGE_KEYS.includes(p.pageKey as (typeof OPTIONAL_PAGE_KEYS)[number]) || p._count.sections > 0);
    const done = required.filter((p) => p._count.sections > 0).length;
    const change = last.get(t.id);
    return {
      tenantId: t.id,
      slug: t.slug,
      nameEn: t.nameEn,
      nameMr: t.nameMr,
      status: t.status,
      publishedAt: t.publishedAt?.toISOString() ?? null,
      pendingItems: pending.get(t.id) ?? 0,
      lastUpdatedAt: change?.createdAt.toISOString() ?? null,
      lastUpdatedBy: change?.actor ? { id: change.actor.id, name: change.actor.name } : null,
      lastAction: change?.action ?? null,
      setupProgress: {
        pagesWithContent: done,
        pagesTotal: required.length,
        percent: required.length ? Math.round((done / required.length) * 100) : 0,
        missingPages: required.filter((p) => p._count.sections === 0).map((p) => p.pageKey),
      },
    };
  });
  return { ...page, items };
}

/** Latest items waiting for review in the caller's area, across sections, announcements, schemes, projects and stories. */
export async function listPendingUpdates(ctx: AuthContext, unitId?: string): Promise<DashboardPendingItemDto[]> {
  const scope = unitPathScopeFilter(ctx);
  const unit: Prisma.AdminUnitWhereInput = unitId ? { AND: [scope, { path: { contains: `/${unitId}/` } }] } : scope;
  const status = { in: [...PENDING] };
  const take = PENDING_FEED_SIZE;
  const order = [{ submittedAt: "desc" as const }, { id: "desc" as const }];
  const tenantSel = { select: { id: true, slug: true, nameEn: true } };

  const [revisions, announcements, schemes, projects, stories] = await Promise.all([
    db.sectionRevision.findMany({
      where: { status, draftOf: { isNot: null }, tenant: { unit } },
      select: { id: true, status: true, submittedAt: true, createdById: true, tenant: tenantSel, section: { select: { sectionKey: true, page: { select: { pageKey: true } } } } },
      orderBy: order,
      take,
    }),
    db.announcement.findMany({
      where: { status, deletedAt: null, ownerUnit: unit },
      select: { id: true, status: true, submittedAt: true, createdById: true, titleEn: true, titleMr: true, tenant: tenantSel },
      orderBy: order,
      take,
    }),
    db.scheme.findMany({
      where: { status, deletedAt: null, ownerUnit: unit },
      select: { id: true, status: true, submittedAt: true, createdById: true, nameEn: true, nameMr: true, tenant: tenantSel },
      orderBy: order,
      take,
    }),
    db.project.findMany({
      where: { status, deletedAt: null, tenant: { unit } },
      select: { id: true, status: true, submittedAt: true, createdById: true, nameEn: true, nameMr: true, tenant: tenantSel },
      orderBy: order,
      take,
    }),
    db.successStory.findMany({
      where: { status, deletedAt: null, tenant: { unit } },
      select: { id: true, status: true, submittedAt: true, createdById: true, titleEn: true, titleMr: true, tenant: tenantSel },
      orderBy: order,
      take,
    }),
  ]);

  type Draft = Omit<DashboardPendingItemDto, "submittedBy"> & { createdById: string };
  const all: Draft[] = [
    ...revisions.map((r) => ({
      type: "SECTION" as const,
      id: r.id,
      titleEn: `${r.section.page.pageKey} / ${r.section.sectionKey}`,
      titleMr: null,
      pageKey: r.section.page.pageKey,
      sectionKey: r.section.sectionKey,
      status: r.status,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      tenant: { id: r.tenant.id, slug: r.tenant.slug, nameEn: r.tenant.nameEn },
      createdById: r.createdById,
    })),
    ...announcements.map((a) => ({ type: "ANNOUNCEMENT" as const, id: a.id, titleEn: a.titleEn, titleMr: a.titleMr, pageKey: null, sectionKey: null, status: a.status, submittedAt: a.submittedAt?.toISOString() ?? null, tenant: a.tenant, createdById: a.createdById })),
    ...schemes.map((s) => ({ type: "SCHEME" as const, id: s.id, titleEn: s.nameEn, titleMr: s.nameMr, pageKey: null, sectionKey: null, status: s.status, submittedAt: s.submittedAt?.toISOString() ?? null, tenant: s.tenant, createdById: s.createdById })),
    ...projects.map((p) => ({ type: "PROJECT" as const, id: p.id, titleEn: p.nameEn, titleMr: p.nameMr, pageKey: null, sectionKey: null, status: p.status, submittedAt: p.submittedAt?.toISOString() ?? null, tenant: p.tenant, createdById: p.createdById })),
    ...stories.map((s) => ({ type: "SUCCESS_STORY" as const, id: s.id, titleEn: s.titleEn, titleMr: s.titleMr, pageKey: null, sectionKey: null, status: s.status, submittedAt: s.submittedAt?.toISOString() ?? null, tenant: s.tenant, createdById: s.createdById })),
  ]
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
    .slice(0, PENDING_FEED_SIZE);

  const users = await db.user.findMany({ where: { id: { in: [...new Set(all.map((x) => x.createdById))] } }, select: { id: true, name: true } });
  const names = new Map(users.map((u) => [u.id, u.name]));
  return all.map(({ createdById, ...rest }) => ({ ...rest, submittedBy: { id: createdById, name: names.get(createdById) ?? null } }));
}
