import { getPublicGrievanceStats } from "@/features/stats/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string };

/** Aggregate numbers only; cached about 60 s (in-process memo + Cache-Control). */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicGrievanceStats(params.tenantSlug), { headers: { "cache-control": "public, max-age=60, s-maxage=60" } });
});
