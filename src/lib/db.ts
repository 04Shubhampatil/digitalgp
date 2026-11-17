import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

/**
 * Single Prisma client for the process.
 *
 * Secrets are omitted globally: `passwordHash` never leaves the database unless a query
 * explicitly opts back in with `omit: { passwordHash: false }` (only src/lib/auth.ts does).
 */
function createClient() {
  const env = getEnv();
  // Serverless (Vercel) runs many instances at once: use the pooled URL and a small pool per instance so the
  // database's connection limit is never exhausted. Locally the direct URL and a normal pool are fine.
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL_POOLED ?? env.DATABASE_URL,
    max: env.DB_POOL_MAX ?? (env.NODE_ENV === "production" ? 3 : 10),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({
    adapter,
    omit: {
      user: { passwordHash: true },
    },
    log: getEnv().NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { __digitalgpPrisma?: ReturnType<typeof createClient> };

// Kept on globalThis in every environment so module re-evaluation never opens a second pool.
export const db = globalForPrisma.__digitalgpPrisma ?? createClient();
globalForPrisma.__digitalgpPrisma = db;

export type Db = typeof db;
/** Transaction client type for functions that must run inside `db.$transaction`. */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
