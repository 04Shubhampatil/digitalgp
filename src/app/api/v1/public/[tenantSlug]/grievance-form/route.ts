import { getPublicComplaintForm } from "@/features/grievances/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string };

/** Public settings of the complaint form (uploads, CAPTCHA, limits). The recipient address is never returned. */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicComplaintForm(params.tenantSlug));
});
