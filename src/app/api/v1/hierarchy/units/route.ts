import { createUnit, listUnits } from "@/features/hierarchy/service";
import { createUnitSchema, listUnitsQuerySchema } from "@/features/hierarchy/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listUnits(auth, parseQuery(req, listUnitsQuerySchema)));
});

export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createUnitSchema);
  return created(await createUnit(auth, input, getClientInfo(req)));
});
