import { createScheme, listSchemes } from "@/features/schemes/service";
import { createSchemeSchema, listSchemesQuerySchema } from "@/features/schemes/validators";
import { authedRoute, created, getClientInfo, paginated } from "@/lib/http";
import { parseBody, parseQuery } from "@/lib/validation";

export const GET = authedRoute(async (req, { auth }) => {
  return paginated(await listSchemes(auth, parseQuery(req, listSchemesQuerySchema)));
});

export const POST = authedRoute(async (req, { auth }) => {
  const input = await parseBody(req, createSchemeSchema);
  return created(await createScheme(auth, input, getClientInfo(req)));
});
