import { getPublicProject } from "@/features/projects/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string; projectId: string };

/** One published development project ("View Details"). */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicProject(params.tenantSlug, params.projectId));
});
