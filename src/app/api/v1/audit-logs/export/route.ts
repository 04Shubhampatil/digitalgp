import { exportAuditLogs, exportAuditQuerySchema } from "@/features/audit/service";
import { csvResponse } from "@/lib/csv";
import { authedRoute } from "@/lib/http";
import { parseQuery } from "@/lib/validation";

/** GET /api/v1/audit-logs/export — CSV with the list's filters and visibility (at most 5000 rows). */
export const GET = authedRoute(async (req, { auth }) => {
  const csv = await exportAuditLogs(auth, parseQuery(req, exportAuditQuerySchema));
  return csvResponse(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, csv);
});
