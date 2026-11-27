import { createTenantWithUsers } from "@/features/tenants/service";
import { createTenantWithUsersSchema } from "@/features/tenants/validators";
import { authedRoute, created, getClientInfo } from "@/lib/http";
import { parseBody } from "@/lib/validation";

/** One-step website creation: website + GP Admin + optional Data Entry Operators, all or nothing. */
export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createTenantWithUsersSchema);
  return created(await createTenantWithUsers(auth, input, getClientInfo(req)));
});
