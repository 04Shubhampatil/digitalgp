import { parseUpload } from "@/features/media/http";
import { listMedia, uploadMedia } from "@/features/media/service";
import { listMediaQuerySchema } from "@/features/media/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listMedia(auth, parseQuery(req, listMediaQuerySchema)));
});

/** POST multipart/form-data: `file` + `tenantId` | `ownerUnitId` + `altEn?` + `altMr?`. */
export const POST = authedRoute(async (req, { auth }) => {
  const { fields, file } = await parseUpload(req);
  return created(await uploadMedia(auth, fields, file, getClientInfo(req)));
});
