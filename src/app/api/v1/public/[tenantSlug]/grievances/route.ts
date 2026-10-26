import { submitGrievance } from "@/features/grievances/service";
import { submitGrievanceSchema } from "@/features/grievances/validators";
import { created, getClientInfo, publicRoute } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Citizen grievance submission (no auth). Returns the tracking code; 5 per hour per IP. */
export const POST = publicRoute<Params>(async (req, { params }) => {
  const input = await parseBody(req, submitGrievanceSchema);
  return created(await submitGrievance(params.tenantSlug, input, getClientInfo(req)));
});
