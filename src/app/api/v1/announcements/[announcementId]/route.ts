import { deleteAnnouncement, getAnnouncement, updateAnnouncement } from "@/features/announcements/service";
import { updateAnnouncementSchema } from "@/features/announcements/validators";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { announcementId: string };

export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getAnnouncement(auth, params.announcementId));
});

export const PATCH = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, updateAnnouncementSchema);
  return ok(await updateAnnouncement(auth, params.announcementId, input, getClientInfo(req)));
});

export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  await deleteAnnouncement(auth, params.announcementId, getClientInfo(req));
  return noContent();
});
