import { uploadGrievanceAttachment } from "@/features/grievances/attachments";
import { MEDIA_MAX_BYTES } from "@/features/media/validators";
import { Errors } from "@/lib/errors";
import { created, getClientInfo, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string };

/**
 * POST multipart/form-data: `file` (one), `website` (honeypot, must be empty), `turnstileToken?`.
 * Works only while the published complaint form allows uploads. Returns `{ id }` only.
 */
export const POST = publicRoute<Params>(async (req, { params }) => {
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
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" && v !== "" ? v.slice(0, 2048) : undefined;
  };
  const result = await uploadGrievanceAttachment(
    params.tenantSlug,
    { website: text("website"), turnstileToken: text("turnstileToken") },
    { name: file.name, type: file.type || null, bytes: new Uint8Array(await file.arrayBuffer()) },
    getClientInfo(req),
  );
  return created(result);
});
