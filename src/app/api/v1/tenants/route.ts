import { createTenant, listTenants } from "@/features/tenants/service";
import { createTenantSchema, listTenantsQuerySchema } from "@/features/tenants/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listTenants(auth, parseQuery(req, listTenantsQuerySchema)));
});

export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createTenantSchema);
  return created(await createTenant(auth, input, getClientInfo(req)));
});
