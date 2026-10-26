import { transitionSchema } from "@/features/announcements/validators";
import { isWorkflowAction } from "@/features/content/workflow";
import { transitionProject } from "@/features/projects/service";
import { Errors } from "@/lib/errors";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { projectId: string; action: string };

/** POST /api/v1/projects/:id/{submit|start_review|approve|reject|publish|unpublish|archive} */
export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  if (!isWorkflowAction(params.action)) throw Errors.notFound("Action");
  const body = req.headers.get("content-length") === "0" || !req.headers.get("content-type") ? { note: null } : await parseBody(req, transitionSchema);
  return ok(await transitionProject(auth, params.projectId, params.action, body.note, getClientInfo(req)));
});
