import { listPublicStories } from "@/features/success-stories/service";
import { publicStoriesQuerySchema } from "@/features/success-stories/validators";
import { paginated, publicRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Published success stories, optionally for one page (`?page=projects`), project or scheme. */
export const GET = publicRoute<Params>(async (req, { params }) => {
  return paginated(await listPublicStories(params.tenantSlug, parseQuery(req, publicStoriesQuerySchema)));
});
