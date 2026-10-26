import { createUser, listUsers } from "@/features/users/service";
import { createUserSchema, listUsersQuerySchema } from "@/features/users/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listUsers(auth, parseQuery(req, listUsersQuerySchema)));
});

export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createUserSchema);
  return created(await createUser(auth, input, getClientInfo(req)));
});
