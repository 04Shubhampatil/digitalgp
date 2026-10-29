import { deleteSchemeCoverage, getSchemeCoverage, putCoverageSchema, putSchemeCoverage } from "@/features/schemes/coverage";
import { authedRoute, getClientInfo, noContent, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantId: string; schemeId: string };

/** Beneficiary households per ward for one scheme on this website (aggregates only). */
export const GET = authedRoute<Params>(async (_req, { auth, params }) => {
  return ok(await getSchemeCoverage(auth, params.tenantId, params.schemeId));
});

/** PUT { wards: [{ wardNo, households }] } — replaces the whole list (`content:edit` + module `schemes`). */
export const PUT = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, putCoverageSchema);
  return ok(await putSchemeCoverage(auth, params.tenantId, params.schemeId, input, getClientInfo(req)));
});

export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  await deleteSchemeCoverage(auth, params.tenantId, params.schemeId, getClientInfo(req));
  return noContent();
});
