import { getPublicMediaMeta } from "@/features/media/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string; mediaId: string };

/** Public metadata (kind, type, size) of a file referenced by published content, e.g. for "PDF · 2.4 MB". */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicMediaMeta(params.tenantSlug, params.mediaId));
});
