import { createStory, listStories } from "@/features/success-stories/service";
import { createStorySchema, listStoriesQuerySchema } from "@/features/success-stories/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listStories(auth, parseQuery(req, listStoriesQuerySchema)));
});

export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createStorySchema);
  return created(await createStory(auth, input, getClientInfo(req)));
});
