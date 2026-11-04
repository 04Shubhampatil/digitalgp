import { getPublicSchemeCoverage, publicCoverageQuerySchema } from "@/features/schemes/coverage";
import { ok, publicRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

type Params = { tenantSlug: string };

/**
 * Per-ward coverage (households, beneficiaries) for one published scheme (`?schemeId=`), or the
 * totals across all published schemes. Aggregates only. Ward shapes come from Home › ward-details.
 */
export const GET = publicRoute<Params>(async (req, { params }) => {
  const { schemeId } = parseQuery(req, publicCoverageQuerySchema);
  return ok(await getPublicSchemeCoverage(params.tenantSlug, schemeId), { headers: { "cache-control": "public, max-age=60, s-maxage=60" } });
});
