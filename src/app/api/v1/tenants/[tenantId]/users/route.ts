import { listTenantUsers } from "@/features/tenants/service";
import { authedRoute, ok } from "@/lib/http";

type Params = { tenantId: string };

/** GP Admins and Data Entry Operators of a website, with status (needs user:read on the website's unit). */
export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await listTenantUsers(auth, params.tenantId));
});
