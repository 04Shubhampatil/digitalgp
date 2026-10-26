import { fileResponse } from "@/features/media/http";
import { getPublicMediaFile } from "@/features/media/service";
import { publicRoute } from "@/lib/http";

type Params = { tenantSlug: string; mediaId: string };

/** Public file bytes: only for published websites and only their own / shared-from-ancestor media. */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return fileResponse(await getPublicMediaFile(params.tenantSlug, params.mediaId), "public");
});
