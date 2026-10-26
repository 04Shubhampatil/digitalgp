import { listAuditLogs, listAuditQuerySchema } from "@/features/audit/service";
import { authedRoute, paginated } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listAuditLogs(auth, parseQuery(req, listAuditQuerySchema)));
});
