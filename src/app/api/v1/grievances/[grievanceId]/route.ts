import { getGrievance } from "@/features/grievances/service";
import { authedRoute, ok } from "@/lib/http";

type Params = { grievanceId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getGrievance(auth, params.grievanceId));
});
