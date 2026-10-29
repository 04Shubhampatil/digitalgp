import { submitVolunteer } from "@/features/forms/service";
import { volunteerSchema } from "@/features/forms/validators";
import { created, getClientInfo, publicRoute } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Volunteer application (public). Open only while registration is enabled and before its deadline. */
export const POST = publicRoute<Params>(async (req, { params }) => {
  const input = await parseBody(req, volunteerSchema);
  return created(await submitVolunteer(params.tenantSlug, input, getClientInfo(req)));
});
