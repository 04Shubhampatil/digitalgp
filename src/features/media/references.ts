import { MEDIA_REF_PATTERN } from "@/config/section-primitives";

/** Every media id held under a `...Id` / `...Ids` field anywhere in a section's JSON data. */
export function collectMediaIds(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) collectMediaIds(v, out);
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (MEDIA_REF_PATTERN.test(key) && typeof v === "string") out.add(v);
      else if (MEDIA_REF_PATTERN.test(key) && Array.isArray(v)) {
        for (const id of v) if (typeof id === "string") out.add(id);
      } else collectMediaIds(v, out);
    }
  }
  return out;
}
