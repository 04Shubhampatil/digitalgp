import { getPage, updatePage } from "@/features/pages/service";
import { updatePageSchema } from "@/features/pages/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantId: string; pageKey: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getPage(auth, params.tenantId, params.pageKey));
});

/** Page settings: enabled flag and SEO fields (`tenant:update`). */
export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updatePageSchema);
  return ok(await updatePage(auth, params.tenantId, params.pageKey, input, getClientInfo(req)));
});
