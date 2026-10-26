import "dotenv/config";
import { beforeEach } from "vitest";
import { testDatabaseUrl } from "./global-setup";

// Must run before any application module imports the Prisma client.
// Vitest sets NODE_ENV=test itself.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.APP_ORIGIN ??= "http://localhost:3000";
process.env.APP_BASE_HOST ??= "localhost";

const { db } = await import("@/lib/db");

/** Wipe every table before each test so tests are independent and order-free. */
beforeEach(async () => {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  const names = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  if (names) await db.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
});
