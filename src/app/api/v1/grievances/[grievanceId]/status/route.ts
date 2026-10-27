import { changeGrievanceStatus } from "@/features/grievances/service";
import { changeGrievanceStatusSchema } from "@/features/grievances/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { grievanceId: string };

/** POST { status: IN_PROGRESS | RESOLVED | REJECTED, note? } — `grievance:manage`; note required when closing. */
export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, changeGrievanceStatusSchema);
  return ok(await changeGrievanceStatus(auth, params.grievanceId, input, getClientInfo(req)));
});
