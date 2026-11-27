import { deleteTenant, getTenant, updateTenant } from "@/features/tenants/service";
import { deleteTenantSchema, updateTenantSchema } from "@/features/tenants/validators";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getTenant(auth, params.tenantId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateTenantSchema);
  return ok(await updateTenant(auth, params.tenantId, input, getClientInfo(req)));
});

/** DELETE { confirmSlug } — delete an unpublished website and its content (Super Admin). */
export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  const { confirmSlug } = await parseBody(req, deleteTenantSchema);
  await deleteTenant(auth, params.tenantId, confirmSlug, getClientInfo(req));
  return noContent();
});
