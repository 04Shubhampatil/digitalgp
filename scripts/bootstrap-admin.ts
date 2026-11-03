/**
 * One-time creation of the first super admin on a new database (e.g. a fresh Vercel deployment).
 *
 * Runs during `vercel-build`. It does nothing unless BOTH env vars are set:
 *   BOOTSTRAP_ADMIN_EMAIL     the super admin's sign-in email
 *   BOOTSTRAP_ADMIN_PASSWORD  at least 12 characters with letters and digits (set as Sensitive)
 * Optional: BOOTSTRAP_ADMIN_NAME (default "Super Admin").
 *
 * It also does nothing when a super admin already exists, so it never overwrites an account.
 * Remove the two env vars after the first successful deploy.
 */
import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Super Admin";

async function main(): Promise<void> {
  if (!email || !password) {
    console.log("[bootstrap-admin] BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set; skipping.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("[bootstrap-admin] BOOTSTRAP_ADMIN_EMAIL is not a valid email");
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("[bootstrap-admin] BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters with letters and digits");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });
  try {
    const existing = await prisma.roleAssignment.findFirst({ where: { role: "SUPER_ADMIN", revokedAt: null }, select: { id: true } });
    if (existing) {
      console.log("[bootstrap-admin] A super admin already exists; nothing to do.");
      return;
    }
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new Error("[bootstrap-admin] A user with BOOTSTRAP_ADMIN_EMAIL already exists but is not a super admin; resolve this manually.");
    }

    // Root of the hierarchy: the state the super admin manages.
    let state = await prisma.adminUnit.findFirst({ where: { parentId: null, slug: "maharashtra" } });
    if (!state) {
      const created = await prisma.adminUnit.create({
        data: { level: "STATE", slug: "maharashtra", nameEn: "Maharashtra", nameMr: "महाराष्ट्र", code: "MH", parentId: null, path: "pending" },
      });
      state = await prisma.adminUnit.update({ where: { id: created.id }, data: { path: `/${created.id}/` } });
    }

    const user = await prisma.user.create({ data: { email, name, passwordHash: await hash(password), locale: "MR" } });
    await prisma.roleAssignment.create({ data: { userId: user.id, role: "SUPER_ADMIN", unitId: state.id } });
    console.log(`[bootstrap-admin] Created super admin ${email}. Remove BOOTSTRAP_ADMIN_* variables now.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
