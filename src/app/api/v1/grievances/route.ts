import { listGrievances } from "@/features/grievances/service";
import { listGrievancesQuerySchema } from "@/features/grievances/validators";
import { authedRoute, paginated } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

/** Grievances of websites in scope (admins, or operators granted the `grievances` module). */
export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listGrievances(auth, parseQuery(req, listGrievancesQuerySchema)));
});
