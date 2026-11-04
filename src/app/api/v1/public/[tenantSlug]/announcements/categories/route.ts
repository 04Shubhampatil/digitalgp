import { listPublicAnnouncementCategories } from "@/features/announcements/service";
import { publicAnnouncementCategoriesQuerySchema } from "@/features/announcements/validators";
import { ok, publicRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Live announcement counts per category (category tiles). Optional `?page=announcements`. */
export const GET = publicRoute<Params>(async (req, { params }) => {
  const { page } = parseQuery(req, publicAnnouncementCategoriesQuerySchema);
  return ok(await listPublicAnnouncementCategories(params.tenantSlug, page), { headers: { "cache-control": "public, max-age=60, s-maxage=60" } });
});
