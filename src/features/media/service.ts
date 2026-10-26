import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { assertCan, assertInScope, unitPathScopeFilter } from "@/lib/permissions";
import { getStorage, type StoredFile } from "@/lib/storage";
import { getPublicTenantBySlug, getTenantForActor, getUnitForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { MediaDto } from "@/types/api";
import { classifyUpload, sanitizeFilename, type ListMediaQuery, type UpdateMediaInput, type UploadMediaFields } from "@/features/media/validators";

const MODULE = "media" as const;

const mediaInclude = { ownerUnit: { select: { id: true, path: true } } } satisfies Prisma.MediaInclude;
type MediaRow = Prisma.MediaGetPayload<{ include: typeof mediaInclude }>;

export function toMediaDto(m: MediaRow): MediaDto {
  return {
    id: m.id,
    tenantId: m.tenantId,
    ownerUnitId: m.ownerUnitId,
    kind: m.kind,
    originalName: m.originalName,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    width: m.width,
    height: m.height,
    altEn: m.altEn,
    altMr: m.altMr,
    uploadedById: m.uploadedById,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export interface UploadFile {
  name: string;
  type: string | null;
  bytes: Uint8Array;
}

export interface MediaFile extends StoredFile {
  mimeType: string;
  filename: string;
  kind: MediaRow["kind"];
}

async function findInScope(ctx: AuthContext, id: string): Promise<MediaRow> {
  const row = await db.media.findFirst({ where: { id, deletedAt: null }, include: mediaInclude });
  if (!row) throw Errors.notFound("Media");
  assertInScope(ctx, row.ownerUnit.path, "Media");
  return row;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listMedia(ctx: AuthContext, query: ListMediaQuery) {
  const rows = await db.media.findMany({
    where: {
      deletedAt: null,
      ownerUnit: unitPathScopeFilter(ctx),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.ownerUnitId ? { ownerUnitId: query.ownerUnitId } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.q ? { OR: [{ originalName: { contains: query.q, mode: "insensitive" } }, { altEn: { contains: query.q, mode: "insensitive" } }, { altMr: { contains: query.q } }] } : {}),
    },
    include: mediaInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toMediaDto) };
}

export async function getMedia(ctx: AuthContext, id: string): Promise<MediaDto> {
  return toMediaDto(await findInScope(ctx, id));
}

/**
 * Store the bytes and the metadata row. The storage key is derived from the owner and a fresh
 * id, never from the client filename. If the DB write fails the file is removed again.
 */
export async function uploadMedia(ctx: AuthContext, fields: UploadMediaFields, file: UploadFile, client: ClientInfo): Promise<MediaDto> {
  let tenantId: string | null = null;
  let ownerUnitId: string;
  let prefix: string;
  if (fields.tenantId) {
    const tenant = await getTenantForActor(ctx, fields.tenantId);
    assertCan(ctx, "media:manage", { unitPath: tenant.unitPath, moduleKey: MODULE });
    tenantId = tenant.id;
    ownerUnitId = tenant.unitId;
    prefix = tenant.id;
  } else {
    const owner = await getUnitForActor(ctx, fields.ownerUnitId!);
    if (owner.level === "GRAM_PANCHAYAT") throw Errors.badRequest("Use tenantId to upload media for a Gram Panchayat website");
    assertCan(ctx, "content:share", { unitPath: owner.path });
    ownerUnitId = owner.id;
    prefix = `shared/${owner.id}`;
  }

  const { mimeType, kind, ext } = classifyUpload(file.bytes, file.type);
  // 24 lowercase hex chars: unique, URL-safe and accepted by `idSchema` like Prisma cuids.
  const id = randomBytes(12).toString("hex");
  const storageKey = `${prefix}/${id}.${ext}`;
  const storage = getStorage();
  await storage.put(storageKey, file.bytes);

  try {
    const created = await db.$transaction(async (tx) => {
      const row = await tx.media.create({
        data: {
          id,
          tenantId,
          ownerUnitId,
          kind,
          storageKey,
          originalName: sanitizeFilename(file.name, ext),
          mimeType,
          sizeBytes: file.bytes.byteLength,
          altEn: fields.altEn ?? null,
          altMr: fields.altMr ?? null,
          uploadedById: ctx.user.id,
        },
        include: mediaInclude,
      });
      await writeAudit(
        actorFromContext(ctx, client),
        { action: "media.upload", entityType: "Media", entityId: row.id, tenantId, unitId: ownerUnitId, after: toMediaDto(row) },
        tx,
      );
      return row;
    });
    return toMediaDto(created);
  } catch (err) {
    await storage.delete(storageKey).catch(() => undefined);
    throw err;
  }
}

export async function updateMedia(ctx: AuthContext, id: string, input: UpdateMediaInput, client: ClientInfo): Promise<MediaDto> {
  const before = await findInScope(ctx, id);
  assertCan(ctx, before.tenantId ? "media:manage" : "content:share", { unitPath: before.ownerUnit.path, moduleKey: MODULE });
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.media.update({
      where: { id },
      data: { ...(input.altEn !== undefined ? { altEn: input.altEn } : {}), ...(input.altMr !== undefined ? { altMr: input.altMr } : {}) },
      include: mediaInclude,
    });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "media.update", entityType: "Media", entityId: id, tenantId: row.tenantId, unitId: row.ownerUnitId, before: toMediaDto(before), after: toMediaDto(row) },
      tx,
    );
    return row;
  });
  return toMediaDto(updated);
}

/** Soft-delete the row (references become SetNull-safe) and remove the bytes afterwards. */
export async function deleteMedia(ctx: AuthContext, id: string, client: ClientInfo): Promise<void> {
  const before = await findInScope(ctx, id);
  assertCan(ctx, before.tenantId ? "media:manage" : "content:share", { unitPath: before.ownerUnit.path, moduleKey: MODULE });
  await db.$transaction(async (tx) => {
    await tx.media.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAudit(
      actorFromContext(ctx, client),
      { action: "media.delete", entityType: "Media", entityId: id, tenantId: before.tenantId, unitId: before.ownerUnitId, before: toMediaDto(before) },
      tx,
    );
  });
  await getStorage().delete(before.storageKey);
}

/** Bytes of an in-scope media item for the admin UI (drafts included). */
export async function getMediaFile(ctx: AuthContext, id: string): Promise<MediaFile> {
  const row = await findInScope(ctx, id);
  return openFile(row);
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Serve a file on a published website: the website's own media, or shared media owned by one of
 * its ancestor units. Media of other tenants is 404 even if the id is guessed.
 */
export async function getPublicMediaFile(tenantSlug: string, id: string): Promise<MediaFile> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const row = await db.media.findFirst({ where: { id, deletedAt: null }, include: mediaInclude });
  if (!row) throw Errors.notFound("Media");
  const visible = row.tenantId === tenant.id || (row.tenantId === null && tenant.unitPath.startsWith(row.ownerUnit.path));
  if (!visible) throw Errors.notFound("Media");
  return openFile(row);
}

async function openFile(row: MediaRow): Promise<MediaFile> {
  const stored = await getStorage().get(row.storageKey);
  if (!stored) throw Errors.notFound("Media file");
  return { ...stored, mimeType: row.mimeType, filename: row.originalName, kind: row.kind };
}
