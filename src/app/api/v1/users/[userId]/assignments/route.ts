import { addAssignment } from "@/features/users/service";
import { assignmentInputSchema } from "@/features/users/validators";
import { authedRoute, created, getClientInfo } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { userId: string };

export const POST = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, assignmentInputSchema);
  return created(await addAssignment(auth, params.userId, input, getClientInfo(req)));
});
