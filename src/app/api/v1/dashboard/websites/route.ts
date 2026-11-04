import { dashboardQuerySchema, listDashboardWebsites } from "@/features/dashboard/service";
import { authedRoute, paginated } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

/** GET /api/v1/dashboard/websites?unitId= — per-website pending items, last update and setup progress (caller's area only). */
export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listDashboardWebsites(auth, parseQuery(req, dashboardQuerySchema)));
});
