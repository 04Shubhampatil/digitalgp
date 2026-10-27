import type { Role } from "@/types/api";

/**
 * Display copy of ROLE_CAPABILITIES in src/lib/permissions.ts (backend-owned; it imports the
 * generated Prisma enums, so it cannot be bundled into the UI). Keep in sync when the backend
 * matrix changes — the server is the authority, this only drives the read-only Roles screen.
 */
export const CAPABILITIES = [
  "hierarchy:read",
  "hierarchy:manage",
  "tenant:read",
  "tenant:create",
  "tenant:update",
  "tenant:publish",
  "user:read",
  "user:manage",
  "content:read",
  "content:edit",
  "content:submit",
  "content:review",
  "content:publish",
  "content:share",
  "media:manage",
  "grievance:manage",
  "audit:read",
  "audit:read-own",
  "roles:manage",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const ALL_CONTENT: Capability[] = ["content:read", "content:edit", "content:submit", "content:review", "content:publish"];

export const ROLE_MATRIX: Record<Role, ReadonlySet<Capability>> = {
  SUPER_ADMIN: new Set<Capability>([
    "hierarchy:read", "hierarchy:manage", "tenant:read", "tenant:create", "tenant:update", "tenant:publish",
    "user:read", "user:manage", ...ALL_CONTENT, "content:share", "media:manage", "grievance:manage", "audit:read", "roles:manage",
  ]),
  TALUKA_ADMIN: new Set<Capability>([
    "hierarchy:read", "tenant:read", "tenant:create", "tenant:update", "tenant:publish",
    "user:read", "user:manage", ...ALL_CONTENT, "content:share", "media:manage", "grievance:manage", "audit:read",
  ]),
  BLOCK_ADMIN: new Set<Capability>([
    "hierarchy:read", "tenant:read", "tenant:update", "tenant:publish",
    "user:read", "user:manage", ...ALL_CONTENT, "content:share", "media:manage", "grievance:manage", "audit:read",
  ]),
  GP_ADMIN: new Set<Capability>([
    "hierarchy:read", "tenant:read", "tenant:update", "tenant:publish",
    "user:read", "user:manage", ...ALL_CONTENT, "media:manage", "grievance:manage", "audit:read",
  ]),
  DATA_ENTRY_OPERATOR: new Set<Capability>(["tenant:read", "content:read", "content:edit", "content:submit", "media:manage", "audit:read-own"]),
};

export const ROLES: Role[] = ["SUPER_ADMIN", "TALUKA_ADMIN", "BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"];
