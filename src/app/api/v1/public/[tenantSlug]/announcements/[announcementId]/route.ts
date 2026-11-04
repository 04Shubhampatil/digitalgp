import { getPublicAnnouncement } from "@/features/announcements/service";
import { ok, publicRoute } from "@/lib/http";

type Params = { tenantSlug: string; announcementId: string };

/** One live announcement ("View Details"). 404 for drafts, scheduled, expired or untargeted ones. */
export const GET = publicRoute<Params>(async (_req, { params }) => {
  return ok(await getPublicAnnouncement(params.tenantSlug, params.announcementId));
});
