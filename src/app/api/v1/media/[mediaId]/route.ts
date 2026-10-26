import { deleteMedia, getMedia, updateMedia } from "@/features/media/service";
import { updateMediaSchema } from "@/features/media/validators";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { mediaId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getMedia(auth, params.mediaId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateMediaSchema);
  return ok(await updateMedia(auth, params.mediaId, input, getClientInfo(req)));
});

export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  await deleteMedia(auth, params.mediaId, getClientInfo(req));
  return noContent();
});
