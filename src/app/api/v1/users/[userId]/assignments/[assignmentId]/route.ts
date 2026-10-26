import { revokeAssignment, updateAssignmentModules } from "@/features/users/service";
import { updateModulesSchema } from "@/features/users/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { userId: string; assignmentId: string };

/** Replace the module grants of a Data Entry Operator assignment. */
export const PUT = authedRoute<Params>(async (req, { auth, params }) => {
  const { modules } = await parseBody(req, updateModulesSchema);
  return ok(await updateAssignmentModules(auth, params.userId, params.assignmentId, modules, getClientInfo(req)));
});

/** Revoke the assignment (kept for audit, no longer grants access). */
export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  return ok(await revokeAssignment(auth, params.userId, params.assignmentId, getClientInfo(req)));
});
