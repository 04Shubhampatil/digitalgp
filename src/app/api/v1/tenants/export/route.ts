import { exportTenants } from "@/features/tenants/service";
import { listTenantsQuerySchema } from "@/features/tenants/validators";
import { csvResponse } from "@/lib/csv";
import { authedRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

/** GET /api/v1/tenants/export — the GP websites list (same filters and scope) as CSV. */
export const GET = authedRoute(async (req, { auth }) => {
  const query = parseQuery(req, listTenantsQuerySchema.omit({ limit: true, cursor: true }));
  return csvResponse(`gp-websites-${new Date().toISOString().slice(0, 10)}.csv`, await exportTenants(auth, query));
});
