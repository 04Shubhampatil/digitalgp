import { deleteStory, getStory, updateStory } from "@/features/success-stories/service";
import { updateStorySchema } from "@/features/success-stories/validators";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { storyId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getStory(auth, params.storyId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateStorySchema);
  return ok(await updateStory(auth, params.storyId, input, getClientInfo(req)));
});

export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  await deleteStory(auth, params.storyId, getClientInfo(req));
  return noContent();
});
