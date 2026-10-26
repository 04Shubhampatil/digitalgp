/**
 * Backend modules that can be granted to Data Entry Operators individually.
 * Keys are stored in ModulePermission.moduleKey; keep them stable.
 */
export const MODULE_KEYS = ["announcements", "schemes", "projects", "pages", "media", "grievances"] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}
