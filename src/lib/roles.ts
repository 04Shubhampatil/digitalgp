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
