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
  const adapter = new PrismaPg({ connectionString: getEnv().DATABASE_URL });
  return new PrismaClient({
    adapter,
    omit: {
      user: { passwordHash: true },
    },
    log: getEnv().NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { __digitalgpPrisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.__digitalgpPrisma ?? createClient();

if (getEnv().NODE_ENV !== "production") {
  globalForPrisma.__digitalgpPrisma = db;
}

export type Db = typeof db;
/** Transaction client type for functions that must run inside `db.$transaction`. */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
