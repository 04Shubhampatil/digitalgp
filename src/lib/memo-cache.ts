/**
 * Tiny in-process TTL cache for cheap-to-recompute public aggregates (statistics endpoints).
 * One entry per key; concurrent callers share the in-flight promise. Not shared between
 * processes — the HTTP `Cache-Control` header does the cross-process work.
 */
const entries = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

export async function memoized<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key);
  if (hit && hit.expiresAt > now) return hit.value as Promise<T>;
  const value = compute().catch((err) => {
    entries.delete(key);
    throw err;
  });
  entries.set(key, { expiresAt: now + ttlMs, value });
  return value;
}

/** Drop cached entries whose key starts with the prefix (e.g. after a data change in tests). */
export function invalidateMemo(prefix = ""): void {
  for (const key of entries.keys()) if (key.startsWith(prefix)) entries.delete(key);
}
