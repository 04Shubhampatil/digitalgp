import { fileResponse } from "@/features/media/http";
import { getMediaFile } from "@/features/media/service";
import { authedRoute } from "@/lib/http";

type Params = { mediaId: string };

/** Bytes of an in-scope media item for the admin UI (works for unpublished websites). */
export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return fileResponse(await getMediaFile(auth, params.mediaId), "private");
});
