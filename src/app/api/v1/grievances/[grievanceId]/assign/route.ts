import { assignGrievance } from "@/features/grievances/service";
import { assignGrievanceSchema } from "@/features/grievances/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { grievanceId: string };

/** POST { assignedToId: userId | null } — `grievance:manage`. */
export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, assignGrievanceSchema);
  return ok(await assignGrievance(auth, params.grievanceId, input, getClientInfo(req)));
});
