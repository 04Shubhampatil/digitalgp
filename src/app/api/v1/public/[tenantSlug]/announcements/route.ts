import { listPublicAnnouncements } from "@/features/announcements/service";
import { publicAnnouncementsQuerySchema } from "@/features/announcements/validators";
import { paginated, publicRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

type Params = { tenantSlug: string };

/** Published announcements for a website (own + shared ones targeted at it). */
export const GET = publicRoute<Params>(async (req, { params }) => {
  return paginated(await listPublicAnnouncements(params.tenantSlug, parseQuery(req, publicAnnouncementsQuerySchema)));
});
