import { submitTreeAdoption } from "@/features/forms/service";
import { treeAdoptionSchema } from "@/features/forms/validators";
import { created, getClientInfo, publicRoute } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantSlug: string };

/** "Adopt a Tree" request (public). Open only while the Environment tree-adoption section is enabled. */
export const POST = publicRoute<Params>(async (req, { params }) => {
  const input = await parseBody(req, treeAdoptionSchema);
  return created(await submitTreeAdoption(params.tenantSlug, input, getClientInfo(req)));
});
