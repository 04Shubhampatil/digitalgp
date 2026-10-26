import { getUnitWithAncestors, updateUnit } from "@/features/hierarchy/service";
import { updateUnitSchema } from "@/features/hierarchy/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { unitId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getUnitWithAncestors(auth, params.unitId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateUnitSchema);
  return ok(await updateUnit(auth, params.unitId, input, getClientInfo(req)));
});
