import { transitionSchema } from "@/features/announcements/validators";
import { transitionSection } from "@/features/pages/service";
import { sectionActionSchema } from "@/features/pages/validators";
import { Errors } from "@/lib/errors";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantId: string; pageKey: string; sectionKey: string; action: string };

/** POST .../sections/:sectionKey/{submit|start_review|approve|reject|publish|unpublish} */
export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  const action = sectionActionSchema.safeParse(params.action);
  if (!action.success) throw Errors.notFound("Action");
  const body = req.headers.get("content-length") === "0" || !req.headers.get("content-type") ? { note: null } : await parseBody(req, transitionSchema);
  return ok(await transitionSection(auth, params.tenantId, params.pageKey, params.sectionKey, action.data, body.note, getClientInfo(req)));
});
