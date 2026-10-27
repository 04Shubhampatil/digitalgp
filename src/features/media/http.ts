import { NextResponse } from "next/server";
import { Errors } from "@/lib/errors";
import { parseValue } from "@/lib/validation";
import type { MediaFile, UploadFile } from "@/features/media/service";
import { MEDIA_MAX_BYTES, uploadMediaFieldsSchema, type UploadMediaFields } from "@/features/media/validators";

/** Parse a `multipart/form-data` upload: one `file` part plus text fields. */
export async function parseUpload(req: Request): Promise<{ fields: UploadMediaFields; file: UploadFile }> {
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MEDIA_MAX_BYTES + 64 * 1024) throw Errors.badRequest("File exceeds the 10 MB limit", { maxBytes: MEDIA_MAX_BYTES });
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    throw Errors.badRequest("Expected a multipart/form-data upload");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw Errors.badRequest("Malformed multipart body");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw Errors.validation([{ path: "file", message: "A file part is required" }]);
  if (file.size > MEDIA_MAX_BYTES) throw Errors.badRequest("File exceeds the 10 MB limit", { maxBytes: MEDIA_MAX_BYTES });

  const raw: Record<string, string> = {};
  for (const key of ["tenantId", "ownerUnitId", "altEn", "altMr"]) {
    const v = form.get(key);
    if (typeof v === "string" && v !== "") raw[key] = v;
  }
  const fields = parseValue(raw, uploadMediaFieldsSchema);
  return { fields, file: { name: file.name, type: file.type || null, bytes: new Uint8Array(await file.arrayBuffer()) } };
}

/** Stream a stored file. Inline for images/videos/PDF; `nosniff` so the browser trusts our type. */
export function fileResponse(file: MediaFile, cache: "public" | "private") {
  const disposition = `inline; filename="${file.filename.replace(/"/g, "")}"`;
  return new NextResponse(file.stream, {
    headers: {
      "content-type": file.mimeType,
      "content-length": String(file.sizeBytes),
      "content-disposition": disposition,
      "x-content-type-options": "nosniff",
      "cache-control": cache === "public" ? "public, max-age=3600" : "private, no-store",
    },
  });
}
