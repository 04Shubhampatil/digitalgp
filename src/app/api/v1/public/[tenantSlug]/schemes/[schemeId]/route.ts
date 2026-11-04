import { getPublicScheme } from "@/features/schemes/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string; schemeId: string };

/** One published scheme visible on the website ("Know More"). */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicScheme(params.tenantSlug, params.schemeId));
});
