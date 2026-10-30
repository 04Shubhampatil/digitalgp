import { getPublicFinanceSummary } from "@/features/finance/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string };

/** Budget Visualizer overview computed from the published income and expenditure categories. */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicFinanceSummary(params.tenantSlug), { headers: { "cache-control": "public, max-age=60, s-maxage=60" } });
});
