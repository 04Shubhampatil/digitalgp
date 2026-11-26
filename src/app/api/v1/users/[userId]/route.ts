import { deleteUser, getUser, updateUser } from "@/features/users/service";
import { updateUserSchema } from "@/features/users/validators";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { userId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getUser(auth, params.userId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateUserSchema);
  return ok(await updateUser(auth, params.userId, input, getClientInfo(req)));
});

/** Soft-delete the account: roles revoked, sessions ended, hidden from user management; audit keeps the name. */
export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  await deleteUser(auth, params.userId, getClientInfo(req));
  return noContent();
});
