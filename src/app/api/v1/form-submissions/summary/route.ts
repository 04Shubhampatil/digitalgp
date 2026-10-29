import { formSubmissionSummary } from "@/features/forms/service";
import { formSubmissionSummaryQuerySchema } from "@/features/forms/validators";
import { authedRoute, ok } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

/** Admin counts for "View feedback responses" / "View volunteer applications": GET /form-submissions/summary?tenantId= */
export const GET = authedRoute(async (req, { auth }) => {
  const { tenantId } = parseQuery(req, formSubmissionSummaryQuerySchema);
  return ok(await formSubmissionSummary(auth, tenantId));
});
