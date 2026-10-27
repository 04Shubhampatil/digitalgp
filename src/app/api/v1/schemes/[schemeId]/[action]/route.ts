import { transitionSchema } from "@/features/announcements/validators";
import { isWorkflowAction } from "@/features/content/workflow";
import { transitionScheme } from "@/features/schemes/service";
import { Errors } from "@/lib/errors";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { schemeId: string; action: string };

/** POST /api/v1/schemes/:id/{submit|start_review|approve|reject|publish|unpublish|archive} */
export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  if (!isWorkflowAction(params.action)) throw Errors.notFound("Action");
  const body = req.headers.get("content-length") === "0" || !req.headers.get("content-type") ? { note: null } : await parseBody(req, transitionSchema);
  return ok(await transitionScheme(auth, params.schemeId, params.action, body.note, getClientInfo(req)));
});
