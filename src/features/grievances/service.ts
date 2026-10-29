import { randomInt } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { ROLE_CAPABILITIES, assertCan, can, isWithinScope } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import { publishedSectionData } from "@/lib/published-section";
import { verifyCaptcha } from "@/lib/captcha";
import { sendMail } from "@/lib/mailer";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getPublicTenantBySlug } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { GrievanceDto, GrievanceEventDto, PublicGrievanceReceiptDto, PublicGrievanceStatusDto } from "@/types/api";
import {
  GRIEVANCE_TRANSITIONS,
  type AssignGrievanceInput,
  type ChangeGrievanceStatusInput,
  type ListGrievancesQuery,
  type SubmitGrievanceInput,
} from "@/features/grievances/validators";

const MODULE = "grievances" as const;

const grievanceInclude = {
  tenant: { select: { id: true, unitId: true, unit: { select: { path: true } } } },
  assignedTo: { select: { id: true, name: true } },
  events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { id: true, name: true } } } },
} satisfies Prisma.GrievanceInclude;

type GrievanceRow = Prisma.GrievanceGetPayload<{ include: typeof grievanceInclude }>;

function toEventDto(e: GrievanceRow["events"][number]): GrievanceEventDto {
  return {
    id: e.id,
    actorId: e.actorId,
    actorName: e.actor?.name ?? null,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    createdAt: e.createdAt.toISOString(),
  };
}

export function toGrievanceDto(g: GrievanceRow): GrievanceDto {
  return {
    id: g.id,
    tenantId: g.tenantId,
    trackingCode: g.trackingCode,
    category: g.category,
    citizenName: g.citizenName,
    citizenPhone: g.citizenPhone,
    citizenEmail: g.citizenEmail,
    description: g.description,
    status: g.status,
    assignedToId: g.assignedToId,
    assignedToName: g.assignedTo?.name ?? null,
    resolutionNote: g.resolutionNote,
    resolvedAt: g.resolvedAt?.toISOString() ?? null,
    events: g.events.map(toEventDto),
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

/** Audit payload without citizen contact details. */
function auditSnapshot(g: GrievanceRow) {
  return { trackingCode: g.trackingCode, status: g.status, assignedToId: g.assignedToId, category: g.category };
}

// ---------------------------------------------------------------------------
// Scope: admins with grievance:manage, or operators granted the `grievances` module (read-only)
// ---------------------------------------------------------------------------

function readablePaths(ctx: AuthContext): string[] {
  return ctx.assignments
    .filter((a) => ROLE_CAPABILITIES[a.role].has("grievance:manage") || (a.role === Role.DATA_ENTRY_OPERATOR && a.modules.has(MODULE)))
    .map((a) => a.unitPath);
}

function readScopeFilter(ctx: AuthContext): Prisma.AdminUnitWhereInput {
  const paths = readablePaths(ctx);
  return { OR: (paths.length ? paths : ["/__no-scope__/"]).map((p) => ({ path: { startsWith: p } })) };
}

async function findReadable(ctx: AuthContext, id: string): Promise<GrievanceRow> {
  const row = await db.grievance.findUnique({ where: { id }, include: grievanceInclude });
  if (!row || !readablePaths(ctx).some((p) => isWithinScope(p, row.tenant.unit.path))) throw Errors.notFound("Grievance");
  return row;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listGrievances(ctx: AuthContext, query: ListGrievancesQuery) {
  const rows = await db.grievance.findMany({
    where: {
      tenant: { unit: readScopeFilter(ctx) },
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.q ? { OR: [{ trackingCode: { contains: query.q.toUpperCase() } }, { citizenName: { contains: query.q, mode: "insensitive" } }, { description: { contains: query.q, mode: "insensitive" } }] } : {}),
    },
    include: grievanceInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toGrievanceDto) };
}

export async function getGrievance(ctx: AuthContext, id: string): Promise<GrievanceDto> {
  return toGrievanceDto(await findReadable(ctx, id));
}

/** Assign to a staff member whose active assignment covers the website (or clear the assignment). */
export async function assignGrievance(ctx: AuthContext, id: string, input: AssignGrievanceInput, client: ClientInfo): Promise<GrievanceDto> {
  const before = await findReadable(ctx, id);
  assertCan(ctx, "grievance:manage", { unitPath: before.tenant.unit.path });

  if (input.assignedToId) {
    const assignee = await db.user.findFirst({
      where: { id: input.assignedToId, status: "ACTIVE", roleAssignments: { some: { revokedAt: null } } },
      select: { id: true, roleAssignments: { where: { revokedAt: null }, select: { unit: { select: { path: true } } } } },
    });
    const covers = assignee?.roleAssignments.some((a) => isWithinScope(a.unit.path, before.tenant.unit.path));
    if (!assignee || !covers) throw Errors.badRequest("The assignee must be an active staff member of this website");
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.grievance.update({ where: { id }, data: { assignedToId: input.assignedToId }, include: grievanceInclude });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "grievance.assign", entityType: "Grievance", entityId: id, tenantId: row.tenantId, unitId: row.tenant.unitId, before: auditSnapshot(before), after: auditSnapshot(row) },
      tx,
    );
    return row;
  });
  return toGrievanceDto(updated);
}

/** Move the grievance through OPEN → IN_PROGRESS → RESOLVED/REJECTED (closing needs a note). */
export async function changeGrievanceStatus(ctx: AuthContext, id: string, input: ChangeGrievanceStatusInput, client: ClientInfo): Promise<GrievanceDto> {
  const before = await findReadable(ctx, id);
  assertCan(ctx, "grievance:manage", { unitPath: before.tenant.unit.path });
  if (!GRIEVANCE_TRANSITIONS[before.status].includes(input.status)) throw Errors.invalidTransition(before.status, input.status);
  const closing = input.status === "RESOLVED" || input.status === "REJECTED";
  if (closing && !input.note?.trim()) throw Errors.badRequest("A note is required when resolving or rejecting a grievance");
  const now = new Date();

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.grievance.update({
      where: { id },
      data: {
        status: input.status,
        resolutionNote: closing ? (input.note ?? null) : null,
        resolvedAt: closing ? now : null,
        events: { create: { actorId: ctx.user.id, fromStatus: before.status, toStatus: input.status, note: input.note ?? null } },
      },
      include: grievanceInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: `grievance.status.${input.status.toLowerCase()}`, entityType: "Grievance", entityId: id, tenantId: row.tenantId, unitId: row.tenant.unitId, before: { status: before.status }, after: { status: input.status, note: input.note ?? null } },
      tx,
    );
    return row;
  });
  return toGrievanceDto(updated);
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

export function generateTrackingCode(): string {
  let code = "GRV-";
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

const SUBMIT_LIMIT_PER_IP = 5;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;

/** Citizen submission on a published website. Rate-limited per IP; the code is the only handle returned. */
/** Published complaint-form settings, with safe defaults when the section is missing or unpublished. */
type ComplaintFormSettings = {
  captchaEnabled: boolean;
  allowFileUpload: boolean;
  maxFileSizeMb: number;
  allowedFileTypes: string[];
  recipientEmail?: string;
};

const FILE_TYPE_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

async function complaintFormSettings(tenantId: string): Promise<ComplaintFormSettings> {
  const data = (await publishedSectionData(tenantId, "grievance", "complaint-form")) as Partial<ComplaintFormSettings> | null;
  return {
    captchaEnabled: data?.captchaEnabled === true,
    allowFileUpload: data?.allowFileUpload === true,
    maxFileSizeMb: data?.maxFileSizeMb ?? 10,
    allowedFileTypes: data?.allowedFileTypes ?? [],
    recipientEmail: data?.recipientEmail,
  };
}

/** Fail closed: a form that requires CAPTCHA cannot accept submissions until TURNSTILE_SECRET_KEY is set. */
async function requireCaptcha(token: string | undefined, ip: string | null): Promise<void> {
  if (!getEnv().TURNSTILE_SECRET_KEY) throw new AppError("INTERNAL_ERROR", 503, "The security check is not configured for this form");
  await verifyCaptcha(token, ip);
}

/** Attached files must be this website's own, not deleted, within the size limit and allowed types. */
async function validateAttachments(tenantId: string, ids: string[], form: ComplaintFormSettings): Promise<string[]> {
  if (ids.length === 0) return [];
  if (!form.allowFileUpload) throw Errors.badRequest("File uploads are not enabled for this form");
  if (new Set(ids).size !== ids.length) throw Errors.validation([{ path: "attachmentIds", message: "Each file can be attached once" }]);

  const allowedMime = new Set(form.allowedFileTypes.map((t) => FILE_TYPE_MIME[t]).filter((m): m is string => !!m));
  const files = await db.media.findMany({
    where: { id: { in: ids }, tenantId, deletedAt: null },
    select: { id: true, mimeType: true, sizeBytes: true },
  });
  if (files.length !== ids.length) {
    throw Errors.validation([{ path: "attachmentIds", message: "One or more files do not belong to this website" }]);
  }
  const maxBytes = form.maxFileSizeMb * 1024 * 1024;
  for (const f of files) {
    if (f.sizeBytes > maxBytes) throw Errors.validation([{ path: "attachmentIds", message: `Files must be ${form.maxFileSizeMb} MB or smaller` }]);
    if (!allowedMime.has(f.mimeType)) throw Errors.validation([{ path: "attachmentIds", message: "This file type is not allowed for this form" }]);
  }
  return ids;
}

export async function submitGrievance(tenantSlug: string, input: SubmitGrievanceInput, client: ClientInfo): Promise<PublicGrievanceReceiptDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const form = await complaintFormSettings(tenant.id);
  await consumeRateLimit(`grievance:ip:${client.ipAddress ?? "unknown"}`, SUBMIT_LIMIT_PER_IP, SUBMIT_WINDOW_MS);
  if (form.captchaEnabled) await requireCaptcha(input.turnstileToken, client.ipAddress);
  const attachmentIds = await validateAttachments(tenant.id, input.attachmentIds ?? [], form);

  for (let attempt = 0; attempt < 5; attempt++) {
    const trackingCode = generateTrackingCode();
    const exists = await db.grievance.findUnique({ where: { trackingCode }, select: { id: true } });
    if (exists) continue;
    const row = await db.$transaction(async (tx) => {
      const created = await tx.grievance.create({
        data: {
          tenantId: tenant.id,
          trackingCode,
          category: input.category,
          citizenName: input.citizenName,
          citizenPhone: input.citizenPhone ?? null,
          citizenEmail: input.citizenEmail ?? null,
          description: input.description,
          events: { create: { fromStatus: null, toStatus: "OPEN", note: null } },
          attachments: attachmentIds.length ? { create: attachmentIds.map((mediaId) => ({ mediaId })) } : undefined,
        },
      });
      await writeAudit(
        actorFromContext(null, client),
        { action: "grievance.submit", entityType: "Grievance", entityId: created.id, tenantId: tenant.id, unitId: tenant.unitId, after: { trackingCode, category: input.category, attachments: attachmentIds.length } },
        tx,
      );
      return created;
    });
    // The notification carries the tracking code and category only, never the citizen's details.
    if (form.recipientEmail) {
      await sendMail({
        to: form.recipientEmail,
        subject: `${tenant.slug}: new complaint ${row.trackingCode}`,
        text: `A new complaint was submitted.
Tracking code: ${row.trackingCode}
Category: ${input.category}
Attachments: ${attachmentIds.length}

Open the admin panel to review it.`,
      });
    }
    return { trackingCode: row.trackingCode, status: row.status, createdAt: row.createdAt.toISOString() };
  }
  throw Errors.conflict("Could not allocate a tracking code, please retry");
}

/** Public view of the complaint form: what the page needs to adapt. The recipient address is never exposed. */
export async function getPublicComplaintForm(tenantSlug: string) {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const data = (await publishedSectionData(tenant.id, "grievance", "complaint-form")) as Record<string, unknown> | null;
  const form = await complaintFormSettings(tenant.id);
  return {
    captchaEnabled: form.captchaEnabled,
    allowFileUpload: form.allowFileUpload,
    maxFileSizeMb: form.maxFileSizeMb,
    allowedFileTypes: form.allowedFileTypes,
    heading: data?.heading ?? null,
    description: data?.description ?? null,
    successMessage: data?.successMessage ?? null,
    submitButtonText: data?.submitButtonText ?? null,
  };
}

/** Status by tracking code — no citizen contact details, no internal notes, no staff identities. */
export async function getPublicGrievanceStatus(tenantSlug: string, trackingCode: string): Promise<PublicGrievanceStatusDto> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const row = await db.grievance.findFirst({
    where: { trackingCode, tenantId: tenant.id },
    include: { events: { orderBy: { createdAt: "asc" }, select: { toStatus: true, createdAt: true } } },
  });
  if (!row) throw Errors.notFound("Grievance");
  return {
    trackingCode: row.trackingCode,
    category: row.category,
    status: row.status,
    resolutionNote: row.status === "RESOLVED" || row.status === "REJECTED" ? row.resolutionNote : null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    timeline: row.events.map((e) => ({ status: e.toStatus, at: e.createdAt.toISOString() })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Exposed for tests / future UI hints. */
export function canReadGrievances(ctx: AuthContext, unitPath: string): boolean {
  return can(ctx, "grievance:manage", { unitPath }) || readablePaths(ctx).some((p) => isWithinScope(p, unitPath));
}
