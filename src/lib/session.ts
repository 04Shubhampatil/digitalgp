import "server-only";

import { cache } from "react";
import type { CurrentUserDto, Role } from "@/types/api";
import { isApiError } from "./api/client";
import { serverApi } from "./api/server";

/**
 * Current admin user for Server Components, resolved once per request (`react.cache`).
 * Returns `null` when there is no valid session; the admin layout redirects in that case.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUserDto | null> => {
  try {
    return await serverApi<CurrentUserDto>("/auth/me");
  } catch (err) {
    if (isApiError(err, "UNAUTHENTICATED")) return null;
    throw err;
  }
});

const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 50,
  TALUKA_ADMIN: 40,
  BLOCK_ADMIN: 30,
  GP_ADMIN: 20,
  DATA_ENTRY_OPERATOR: 10,
};

/** Highest role the user holds across assignments — for display and shell selection only. */
export function primaryRole(user: CurrentUserDto): Role | null {
  let best: Role | null = null;
  for (const a of user.assignments) {
    if (a.revokedAt) continue;
    if (!best || ROLE_RANK[a.role] > ROLE_RANK[best]) best = a.role;
  }
  return best;
}

/** UI hint only — the server re-checks every call. */
export function hasCapability(user: CurrentUserDto, capability: string): boolean {
  return user.capabilities.includes(capability);
}
