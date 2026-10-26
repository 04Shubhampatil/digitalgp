import { z } from "zod";
import { Errors } from "@/lib/errors";
import { idSchema, optionalShortText, paginationQuerySchema } from "@/lib/validation";

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024; // 10 MB (requirements)

export const mediaKindSchema = z.enum(["IMAGE", "VIDEO", "DOCUMENT"]);
export type MediaKind = z.infer<typeof mediaKindSchema>;

/** Allowed content types, the kind they map to, and the extension used for the storage key. */
export const MIME_ALLOWLIST: Readonly<Record<string, { kind: MediaKind; ext: string }>> = {
  "image/jpeg": { kind: "IMAGE", ext: "jpg" },
  "image/png": { kind: "IMAGE", ext: "png" },
  "image/webp": { kind: "IMAGE", ext: "webp" },
  "image/gif": { kind: "IMAGE", ext: "gif" },
  "video/mp4": { kind: "VIDEO", ext: "mp4" },
  "video/webm": { kind: "VIDEO", ext: "webm" },
  "application/pdf": { kind: "DOCUMENT", ext: "pdf" },
};

/**
 * Sniff the real content type from the file signature. The client-declared type is never
 * trusted: a renamed executable or HTML file must not be stored as an image.
 */
export function sniffMimeType(bytes: Uint8Array): string | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  const ascii = (s: string, offset = 0) => startsWith([...s].map((c) => c.charCodeAt(0)), offset);
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii("GIF87a") || ascii("GIF89a")) return "image/gif";
  if (ascii("RIFF") && ascii("WEBP", 8)) return "image/webp";
  if (ascii("%PDF-")) return "application/pdf";
  if (ascii("ftyp", 4)) return "video/mp4";
  if (startsWith([0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";
  return null;
}

/** Validate an upload's size and signature; returns the trusted type and kind. */
export function classifyUpload(bytes: Uint8Array, declaredType: string | null) {
  if (bytes.byteLength === 0) throw Errors.badRequest("The uploaded file is empty");
  if (bytes.byteLength > MEDIA_MAX_BYTES) throw Errors.badRequest("File exceeds the 10 MB limit", { maxBytes: MEDIA_MAX_BYTES });
  const sniffed = sniffMimeType(bytes);
  const entry = sniffed ? MIME_ALLOWLIST[sniffed] : undefined;
  if (!sniffed || !entry) {
    throw Errors.badRequest("Unsupported file type", { allowed: Object.keys(MIME_ALLOWLIST), declaredType });
  }
  return { mimeType: sniffed, kind: entry.kind, ext: entry.ext };
}

/**
 * Multipart fields accompanying the file. Either `tenantId` (website media) or `ownerUnitId`
 * (shared media owned by a higher-level unit, usable by every website below it).
 */
export const uploadMediaFieldsSchema = z
  .object({
    tenantId: idSchema.optional(),
    ownerUnitId: idSchema.optional(),
    altEn: optionalShortText,
    altMr: optionalShortText,
  })
  .refine((v) => (v.tenantId ? !v.ownerUnitId : !!v.ownerUnitId), { message: "Provide tenantId or ownerUnitId (not both)", path: ["tenantId"] });
export type UploadMediaFields = z.infer<typeof uploadMediaFieldsSchema>;

export const updateMediaSchema = z
  .object({ altEn: optionalShortText, altMr: optionalShortText })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export const listMediaQuerySchema = paginationQuerySchema.extend({
  tenantId: idSchema.optional(),
  ownerUnitId: idSchema.optional(),
  kind: mediaKindSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;

/** Safe original filename for Content-Disposition: strip paths and control characters. */
export function sanitizeFilename(name: string, fallbackExt: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^\w.\- ]+/g, "_").replace(/^\.+/, "").slice(0, 120);
  return cleaned || `file.${fallbackExt}`;
}
