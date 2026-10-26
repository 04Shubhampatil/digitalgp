import { createAnnouncement, listAnnouncements } from "@/features/announcements/service";
import { createAnnouncementSchema, listAnnouncementsQuerySchema } from "@/features/announcements/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listAnnouncements(auth, parseQuery(req, listAnnouncementsQuerySchema)));
});

export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createAnnouncementSchema);
  return created(await createAnnouncement(auth, input, getClientInfo(req)));
});
