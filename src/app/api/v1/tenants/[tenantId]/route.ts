import { getTenant, updateTenant } from "@/features/tenants/service";
import { updateTenantSchema } from "@/features/tenants/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getTenant(auth, params.tenantId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateTenantSchema);
  return ok(await updateTenant(auth, params.tenantId, input, getClientInfo(req)));
});
