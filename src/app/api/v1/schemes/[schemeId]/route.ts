import { deleteScheme, getScheme, updateScheme } from "@/features/schemes/service";
import { updateSchemeSchema } from "@/features/schemes/validators";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { schemeId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getScheme(auth, params.schemeId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateSchemeSchema);
  return ok(await updateScheme(auth, params.schemeId, input, getClientInfo(req)));
});

export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  await deleteScheme(auth, params.schemeId, getClientInfo(req));
  return noContent();
});
