import type { AdminUnitLevel, Role } from "@/types/api";

/** Level at which each role is assigned — mirrors ROLE_LEVELS in src/lib/permissions.ts (UI hint only). */
export const ROLE_LEVEL: Record<Role, AdminUnitLevel> = {
  SUPER_ADMIN: "DISTRICT",
  TALUKA_ADMIN: "TALUKA",
  BLOCK_ADMIN: "BLOCK",
  GP_ADMIN: "GRAM_PANCHAYAT",
  DATA_ENTRY_OPERATOR: "GRAM_PANCHAYAT",
};

export const ROLES = Object.keys(ROLE_LEVEL) as Role[];

/** Roles each role may create — mirrors CREATABLE_ROLES in src/lib/permissions.ts (UI hint only; the server decides). */
export const CREATABLE_ROLES: Record<Role, readonly Role[]> = {
  SUPER_ADMIN: ["SUPER_ADMIN", "TALUKA_ADMIN", "BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"],
  TALUKA_ADMIN: ["BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"],
  BLOCK_ADMIN: ["GP_ADMIN", "DATA_ENTRY_OPERATOR"],
  GP_ADMIN: ["DATA_ENTRY_OPERATOR"],
  DATA_ENTRY_OPERATOR: [],
};

/** The separate "create user" forms: URL slug → role (/admin/users/new/<slug>). */
export const USER_TYPES = {
  "gp-admin": "GP_ADMIN",
  "taluka-admin": "TALUKA_ADMIN",
  "data-operator": "DATA_ENTRY_OPERATOR",
} as const satisfies Record<string, Role>;
export type UserTypeSlug = keyof typeof USER_TYPES;

/** True when any of the caller's active roles may create `role`. */
export function canCreateRole(callerRoles: readonly Role[], role: Role): boolean {
  return callerRoles.some((r) => CREATABLE_ROLES[r].includes(role));
}
