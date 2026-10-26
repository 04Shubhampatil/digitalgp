import { discardSectionDraft, saveSectionDraft } from "@/features/pages/service";
import { saveSectionDraftSchema } from "@/features/pages/validators";
import { authedRoute, getClientInfo, ok } from "@/lib/http";
import { parseBody } from "@/lib/validation";

type Params = { tenantId: string; pageKey: string; sectionKey: string };

/** PUT { data, isVisible?, sortOrder? } — create or update the working draft (`content:edit` + module `pages`). */
export const PUT = authedRoute<Params>(async (req, { auth, params }) => {
  const input = await parseBody(req, saveSectionDraftSchema);
  return ok(await saveSectionDraft(auth, params.tenantId, params.pageKey, params.sectionKey, input, getClientInfo(req)));
});

/** DELETE — discard an unsubmitted draft. */
export const DELETE = authedRoute<Params>(async (req, { auth, params }) => {
  return ok(await discardSectionDraft(auth, params.tenantId, params.pageKey, params.sectionKey, getClientInfo(req)));
});
