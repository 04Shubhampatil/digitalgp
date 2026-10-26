import { getCurrentUser } from "@/features/auth/service";
import { authedRoute, ok } from "@/lib/http";

export const GET = authedRoute(async (_req, { auth }) => {
  return ok(await getCurrentUser(auth));
});
