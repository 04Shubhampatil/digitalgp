import { lookupPublicGrievancesByPhone, submitGrievance } from "@/features/grievances/service";
import { grievanceLookupQuerySchema, submitGrievanceSchema } from "@/features/grievances/validators";
import { created, getClientInfo, ok, publicRoute } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

type Params = { tenantSlug: string };

/**
 * GET ?phone=9876543210 — complaints filed with that mobile number (last 12 months).
 * Minimal fields only (tracking code, type, status, dates); rate limited per IP and per number.
 */
export const GET = publicRoute<Params>(async (req, { params }) => {
  const { phone } = parseQuery(req, grievanceLookupQuerySchema);
  return ok(await lookupPublicGrievancesByPhone(params.tenantSlug, phone, getClientInfo(req)));
});

/** Citizen grievance submission (no auth). Returns the tracking code; 5 per hour per IP. */
export const POST = publicRoute<Params>(async (req, { params }) => {
  const input = await parseBody(req, submitGrievanceSchema);
  return created(await submitGrievance(params.tenantSlug, input, getClientInfo(req)));
});
