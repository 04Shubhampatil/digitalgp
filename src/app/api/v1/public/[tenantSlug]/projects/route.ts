import { listPublicProjects } from "@/features/projects/service";
import { publicProjectsQuerySchema } from "@/features/projects/validators";
import { paginated, publicRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Published development projects of a website. */
export const GET = publicRoute<Params>(async (req, { params }) => {
  return paginated(await listPublicProjects(params.tenantSlug, parseQuery(req, publicProjectsQuerySchema)));
});
