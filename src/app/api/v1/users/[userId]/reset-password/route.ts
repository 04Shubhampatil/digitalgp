import { resetUserPassword } from "@/features/users/service";
import { authedRoute, getClientInfo, ok } from "@/lib/http";

type Params = { userId: string };

/**
 * POST /api/v1/users/:id/reset-password — new temporary password for a managed user, returned once.
 * The user is logged out everywhere and must change it at the next sign-in.
 */
export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  return ok(await resetUserPassword(auth, params.userId, getClientInfo(req)));
});
