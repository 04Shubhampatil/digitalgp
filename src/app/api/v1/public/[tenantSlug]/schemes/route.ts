import { listPublicSchemes } from "@/features/schemes/service";
import { publicSchemesQuerySchema } from "@/features/schemes/validators";
import { paginated, publicRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Published schemes for a website (own + shared ones targeted at it). */
export const GET = publicRoute<Params>(async (req, { params }) => {
  return paginated(await listPublicSchemes(params.tenantSlug, parseQuery(req, publicSchemesQuerySchema)));
});
