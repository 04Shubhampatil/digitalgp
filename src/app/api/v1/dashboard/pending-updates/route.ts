import { z } from "zod";
import { listPendingUpdates } from "@/features/dashboard/service";
import { authedRoute, ok } from "@/lib/http";
import { idSchema, parseQuery } from "@/lib/validation";

const querySchema = z.object({ unitId: idSchema.optional() });

/** GET /api/v1/dashboard/pending-updates?unitId= — latest 20 items waiting for review in the caller's area. */
export const GET = authedRoute(async (req, { auth }) => {
  const { unitId } = parseQuery(req, querySchema);
  return ok(await listPendingUpdates(auth, unitId));
});
