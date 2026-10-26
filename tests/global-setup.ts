import { execSync } from "node:child_process";
import "dotenv/config";

/**
 * Runs once before the Vitest workers start: points DATABASE_URL at the test database
 * (never the dev/prod one) and applies migrations.
 *
 * Override with TEST_DATABASE_URL; default swaps the database name for `digitalgp_test`.
 */
export default function globalSetup() {
  const url = testDatabaseUrl();
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}

export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL or TEST_DATABASE_URL must be set to run tests");
  const u = new URL(base);
  if (u.pathname.endsWith("_test")) return base;
  u.pathname = `${u.pathname.replace(/\/$/, "")}_test`;
  return u.toString();
}
