import { getPublicPage } from "@/features/pages/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string; pageKey: string };

/** Published sections of a page on a published website. */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicPage(params.tenantSlug, params.pageKey));
});
