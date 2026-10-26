import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";

/**
 * Fixed-window rate limiter backed by Postgres (no Redis dependency yet).
 * One atomic upsert per call; the window resets when it has elapsed.
 * Swap the storage for Redis behind the same function when traffic requires it.
 */
export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."windowStart" < NOW() - (${windowMs}::float8 / 1000.0) * INTERVAL '1 second' THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."windowStart" < NOW() - (${windowMs}::float8 / 1000.0) * INTERVAL '1 second' THEN NOW()
        ELSE "RateLimitBucket"."windowStart"
      END
    RETURNING "count", "windowStart"
  `;
  const row = rows[0];
  if (row && row.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((row.windowStart.getTime() + windowMs - Date.now()) / 1000));
    throw Errors.rateLimited(retryAfter);
  }
}

/** Clear a bucket (e.g. after a successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  await db.rateLimitBucket.deleteMany({ where: { key } });
}
