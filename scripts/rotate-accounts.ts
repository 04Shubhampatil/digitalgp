/**
 * Replace the sample sign-in accounts (seed's *@digitalgp.local) with real ones.
 *
 *   npx tsx scripts/rotate-accounts.ts --super-admin you@example.com --gp-admin gp@example.com \
 *       --tenant savardari [--operator op@example.com] [--out credentials.txt] [--dry-run]
 *
 * What it does is described in src/features/users/rotate-accounts.ts. The new temporary passwords are written ONCE
 * to the --out file (default credentials-<timestamp>.txt in the current folder, git-ignored) — never to the terminal,
 * the audit log or the database. Give each person their line, then delete the file. Everyone must change the
 * password at first sign-in. Uses DATABASE_URL like the other scripts; run against production only on purpose.
 */
import "dotenv/config";
import { existsSync, writeFileSync } from "node:fs";
import { rotateAccounts } from "../src/features/users/rotate-accounts";
import { db } from "../src/lib/db";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const superAdmin = arg("super-admin");
  const gpAdmin = arg("gp-admin");
  const tenantSlug = arg("tenant");
  const operator = arg("operator");
  const dryRun = process.argv.includes("--dry-run");
  if (!superAdmin || !gpAdmin || !tenantSlug) {
    throw new Error("Usage: npx tsx scripts/rotate-accounts.ts --super-admin <email> --gp-admin <email> --tenant <slug> [--operator <email>] [--out <file>] [--dry-run]");
  }
  const out = arg("out") ?? `credentials-${new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16)}.txt`;
  if (!dryRun && existsSync(out)) throw new Error(`${out} already exists; choose another --out file`);

  const r = await rotateAccounts(db, {
    superAdmin: { email: superAdmin, name: arg("super-admin-name") },
    gpAdmin: { email: gpAdmin, name: arg("gp-admin-name") },
    operator: operator ? { email: operator, name: arg("operator-name") } : undefined,
    tenantSlug,
    dryRun,
  });

  const tag = dryRun ? "[dry run] would " : "";
  for (const a of r.accounts) console.log(`${tag}${a.outcome === "created" ? "create" : "reset "}  ${a.role.padEnd(20)} ${a.email}`);
  for (const x of r.removed) console.log(`${tag}remove  ${x.roles.join(",").padEnd(20)} ${x.email}`);
  if (dryRun) return;

  const lines = [
    `DigitalGP sign-in accounts — created ${new Date().toISOString()}`,
    `Sign in at ${process.env.APP_ORIGIN ?? "the admin site"}/login. Each password works once: you must set a new one at first sign-in.`,
    `Delete this file after handing the passwords over.`,
    "",
    ...r.accounts.map((a) => `${a.role}\n  email:    ${a.email}\n  password: ${a.temporaryPassword}\n`),
  ];
  writeFileSync(out, lines.join("\n"), { encoding: "utf8", flag: "wx" });
  console.log(`\nTemporary passwords written to ${out} (not shown here). Delete the file once handed over.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
