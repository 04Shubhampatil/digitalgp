import { listPages } from "@/features/pages/service";
import { authedRoute, ok } from "@/lib/http";

type Params = { tenantId: string };

/** All pages of a website with their registered sections and draft/published revisions. */
export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await listPages(auth, params.tenantId));
});
