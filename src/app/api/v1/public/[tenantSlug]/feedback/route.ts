import { submitFeedback } from "@/features/forms/service";
import { feedbackSchema } from "@/features/forms/validators";
import { created, getClientInfo, publicRoute } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Contact-page feedback (public). Open only while the feedback form is published on the website. */
export const POST = publicRoute<Params>(async (req, { params }) => {
  const input = await parseBody(req, feedbackSchema);
  return created(await submitFeedback(params.tenantSlug, input, getClientInfo(req)));
});
