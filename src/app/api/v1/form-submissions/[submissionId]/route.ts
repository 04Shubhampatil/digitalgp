import { getFormSubmission } from "@/features/forms/service";
import { authedRoute, ok } from "@/lib/http";

type Params = { submissionId: string };

/** Admin read of one submission: GET /form-submissions/:submissionId */
export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getFormSubmission(auth, params.submissionId));
});
