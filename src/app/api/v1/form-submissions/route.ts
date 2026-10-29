import { listFormSubmissions } from "@/features/forms/service";
import { listFormSubmissionsQuerySchema } from "@/features/forms/validators";
import { authedRoute, paginated } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

/** Admin list of contact-page submissions for one website: GET /form-submissions?tenantId=&kind=FEEDBACK|VOLUNTEER */
export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listFormSubmissions(auth, parseQuery(req, listFormSubmissionsQuerySchema)));
});
