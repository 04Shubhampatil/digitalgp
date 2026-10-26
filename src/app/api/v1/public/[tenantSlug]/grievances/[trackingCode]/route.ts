import { getPublicGrievanceStatus } from "@/features/grievances/service";
import { trackingCodeSchema } from "@/features/grievances/validators";
import { ok, publicRoute } from "@/lib/http";
import { parseValue } from "@/lib/validation";

type Params = { tenantSlug: string; trackingCode: string };

/** Status lookup by tracking code — never returns citizen contact details. */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  const code = parseValue(params.trackingCode, trackingCodeSchema);
  return ok(await getPublicGrievanceStatus(params.tenantSlug, code));
});
