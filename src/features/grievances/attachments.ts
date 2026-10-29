import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { actorFromContext, writeAudit } from "@/lib/audit";
import { verifyCaptcha } from "@/lib/captcha";
import { db, type Tx } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { AppError, Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getStorage } from "@/lib/storage";
import { getPublicTenantBySlug } from "@/lib/tenant";
import { classifyUpload, sanitizeFilename } from "@/features/media/validators";
import type { UploadFile } from "@/features/media/service";
import { complaintFormSettings, type ComplaintFormSettings } from "@/features/grievances/form-settings";
import type { GrievanceAttachmentDto } from "@/types/api";

/**
 * Citizen uploads for complaints.
 *
 * Flow: `POST /public/:slug/grievance-attachments` (one file) → `{ id }` → the id goes into
 * `attachmentIds` of `POST /public/:slug/grievances`. Until attached, the file carries `expiresAt`
 * and is deleted by `purgeExpiredGrievanceUploads` (npm run forms:purge). Attaching clears the expiry.
 *
 * These files are `Media` rows with `source = PUBLIC_GRIEVANCE`: not listed in the media library,
 * not served by the public media route, not referenceable from page sections, visible to staff only
 * through `GET /grievances/:id` + `GET /media/:id/file`.
 */

const UPLOAD_LIMIT_PER_IP = 10;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

/** Section file-type keys → MIME types produced by the signature sniffer. */
export const FILE_TYPE_MIME: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function allowedMimeTypes(form: ComplaintFormSettings): Set<string> {
  return new Set(form.allowedFileTypes.map((t) => FILE_TYPE_MIME[t]).filter((m): m is string => !!m));
}

/** Fail closed: a form that requires CAPTCHA cannot accept anything until TURNSTILE_SECRET_KEY is set. */
export async function requireCaptcha(token: string | undefined, ip: string | null): Promise<void> {
  if (!getEnv().TURNSTILE_SECRET_KEY) throw new AppError("INTERNAL_ERROR", 503, "The security check is not configured for this form");
  await verifyCaptcha(token, ip);
}

export interface UploadAttachmentFields {
  website?: string;
  turnstileToken?: string;
}

/** Store one citizen file for a later complaint. Returns only the id. */
export async function uploadGrievanceAttachment(
  tenantSlug: string,
  fields: UploadAttachmentFields,
  file: UploadFile,
  client: ClientInfo,
): Promise<{ id: string }> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const form = await complaintFormSettings(tenant.id);
  if (!form.allowFileUpload) throw Errors.notFound("Upload");

  await consumeRateLimit(`grievance-upload:ip:${client.ipAddress ?? "unknown"}`, UPLOAD_LIMIT_PER_IP, UPLOAD_WINDOW_MS);
  // Honeypot filled → pretend success; nothing is stored. The fake id can never be attached.
  if (fields.website) return { id: randomBytes(12).toString("hex") };
  if (form.captchaEnabled) await requireCaptcha(fields.turnstileToken, client.ipAddress);

  const maxBytes = Math.min(form.maxFileSizeMb, 10) * 1024 * 1024;
  if (file.bytes.byteLength > maxBytes) {
    throw Errors.badRequest(`File exceeds the ${form.maxFileSizeMb} MB limit`, { maxBytes });
  }
  const { mimeType, kind, ext } = classifyUpload(file.bytes, file.type); // signature-based, never the declared type
  if (!allowedMimeTypes(form).has(mimeType)) {
    throw Errors.badRequest("This file type is not allowed for this form", { allowed: form.allowedFileTypes });
  }

  const env = getEnv();
  const pending = await db.media.count({ where: { tenantId: tenant.id, source: "PUBLIC_GRIEVANCE", deletedAt: null, expiresAt: { not: null } } });
  if (pending >= env.GRIEVANCE_UPLOAD_MAX_PENDING) throw Errors.rateLimited(600);

  const id = randomBytes(12).toString("hex");
  const storageKey = `${tenant.id}/grievance/${id}.${ext}`;
  const storage = getStorage();
  await storage.put(storageKey, file.bytes);
  try {
    await db.$transaction(async (tx) => {
      await tx.media.create({
        data: {
          id,
          tenantId: tenant.id,
          ownerUnitId: tenant.unitId,
          kind,
          storageKey,
          originalName: sanitizeFilename(file.name, ext),
          mimeType,
          sizeBytes: file.bytes.byteLength,
          uploadedById: null,
          source: "PUBLIC_GRIEVANCE",
          expiresAt: new Date(Date.now() + env.GRIEVANCE_UPLOAD_TTL_HOURS * 60 * 60 * 1000),
        },
      });
      await writeAudit(
        actorFromContext(null, client),
        { action: "grievance.attachment_upload", entityType: "Media", entityId: id, tenantId: tenant.id, unitId: tenant.unitId, after: { mimeType, sizeBytes: file.bytes.byteLength } },
        tx,
      );
    });
  } catch (err) {
    await storage.delete(storageKey).catch(() => undefined);
    throw err;
  }
  return { id };
}

/**
 * Ids a citizen may attach: uploaded through the public endpoint for this website, still pending
 * (not expired, not attached elsewhere), within the form's current size and type rules.
 */
export async function validateAttachments(tenantId: string, ids: string[], form: ComplaintFormSettings): Promise<string[]> {
  if (ids.length === 0) return [];
  if (!form.allowFileUpload) throw Errors.badRequest("File uploads are not enabled for this form");
  if (new Set(ids).size !== ids.length) throw Errors.validation([{ path: "attachmentIds", message: "Each file can be attached once" }]);

  const files = await db.media.findMany({
    where: { id: { in: ids }, tenantId, source: "PUBLIC_GRIEVANCE", deletedAt: null, expiresAt: { gt: new Date() }, grievanceAttachments: { none: {} } },
    select: { id: true, mimeType: true, sizeBytes: true },
  });
  if (files.length !== ids.length) {
    throw Errors.validation([{ path: "attachmentIds", message: "One or more files were not uploaded for this form, have expired or are already attached" }]);
  }
  const allowed = allowedMimeTypes(form);
  const maxBytes = form.maxFileSizeMb * 1024 * 1024;
  for (const f of files) {
    if (f.sizeBytes > maxBytes) throw Errors.validation([{ path: "attachmentIds", message: `Files must be ${form.maxFileSizeMb} MB or smaller` }]);
    if (!allowed.has(f.mimeType)) throw Errors.validation([{ path: "attachmentIds", message: "This file type is not allowed for this form" }]);
  }
  return ids;
}

/** Inside the submit transaction: link the files and stop their expiry clock. */
export async function attachToGrievance(tx: Tx, grievanceId: string, mediaIds: string[]): Promise<void> {
  if (mediaIds.length === 0) return;
  await tx.grievanceAttachment.createMany({ data: mediaIds.map((mediaId) => ({ grievanceId, mediaId })) });
  await tx.media.updateMany({ where: { id: { in: mediaIds } }, data: { expiresAt: null } });
}

type AttachmentRow = Prisma.GrievanceAttachmentGetPayload<{ include: { media: true } }>;

export function toAttachmentDto(a: AttachmentRow): GrievanceAttachmentDto {
  return { id: a.media.id, originalName: a.media.originalName, sizeBytes: a.media.sizeBytes, mimeType: a.media.mimeType, kind: a.media.kind, uploadedAt: a.media.createdAt.toISOString() };
}

/** Delete citizen uploads that were never attached before their expiry. Returns the number removed. */
export async function purgeExpiredGrievanceUploads(now: Date = new Date()): Promise<number> {
  const rows = await db.media.findMany({
    where: { source: "PUBLIC_GRIEVANCE", expiresAt: { lt: now }, grievanceAttachments: { none: {} } },
    select: { id: true, storageKey: true },
  });
  const storage = getStorage();
  let removed = 0;
  for (const row of rows) {
    await db.media.delete({ where: { id: row.id } });
    await storage.delete(row.storageKey).catch(() => undefined);
    removed++;
  }
  return removed;
}
