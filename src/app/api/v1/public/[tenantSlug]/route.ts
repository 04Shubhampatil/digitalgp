import { getPublicTenant } from "@/features/tenants/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string };

/** Public profile of a published Gram Panchayat website. */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicTenant(params.tenantSlug));
});
