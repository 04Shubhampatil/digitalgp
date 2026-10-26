import { setTenantStatus } from "@/features/tenants/service";
import { tenantStatusSchema } from "@/features/tenants/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantId: string };

/** Publish, unpublish (DRAFT) or suspend a website. */
export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  const { status } = await parseBody(req, tenantStatusSchema);
  return ok(await setTenantStatus(auth, params.tenantId, status, getClientInfo(req)));
});
