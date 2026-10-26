import { createProject, listProjects } from "@/features/projects/service";
import { createProjectSchema, listProjectsQuerySchema } from "@/features/projects/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listProjects(auth, parseQuery(req, listProjectsQuerySchema)));
});

export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createProjectSchema);
  return created(await createProject(auth, input, getClientInfo(req)));
});
