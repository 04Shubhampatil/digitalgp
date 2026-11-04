import { getPublicStory } from "@/features/success-stories/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string; storyId: string };

/** One published success story ("Read Story"). */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicStory(params.tenantSlug, params.storyId));
});
