import { notFound } from "next/navigation";
import { cache } from "react";
import { isApiError } from "./api/client";
import { getPublicTenant } from "./api/public";

/** Tenant slugs are lowercase letters, digits and hyphens — anything else (favicon.ico, …) is not a site. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** Resolve the published website once per request (layout + pages); 404 for unknown/unpublished slugs. */
export const loadTenant = cache(async (slug: string) => {
  if (!SLUG_RE.test(slug)) notFound();
  try {
    return await getPublicTenant(slug);
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
});
