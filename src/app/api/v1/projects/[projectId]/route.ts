import { deleteProject, getProject, updateProject } from "@/features/projects/service";
import { updateProjectSchema } from "@/features/projects/validators";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { projectId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getProject(auth, params.projectId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateProjectSchema);
  return ok(await updateProject(auth, params.projectId, input, getClientInfo(req)));
});

export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  await deleteProject(auth, params.projectId, getClientInfo(req));
  return noContent();
});
