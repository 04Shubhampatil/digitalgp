/**
 * Development seed — idempotent (safe to re-run).
 *
 * Creates: Maharashtra > Pune district > Haveli taluka > 3 Gram Panchayats (from the reference
 * sites), one tenant per GP, the super admin from SEED_SUPER_ADMIN_* env, and sample admins.
 * Sample passwords are printed once; change them in any shared environment.
 *
 * Run: npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_PAGE_KEYS } from "../src/config/pages";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

const SUPER_EMAIL = (process.env.SEED_SUPER_ADMIN_EMAIL ?? "superadmin@digitalgp.local").toLowerCase();
const SUPER_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "ChangeMe-Now-2026!";
const SAMPLE_PASSWORD = "Sample-Pass-2026!";

type UnitInput = { level: "STATE" | "DISTRICT" | "TALUKA" | "BLOCK" | "GRAM_PANCHAYAT"; slug: string; nameEn: string; nameMr: string; code?: string };

async function upsertUnit(input: UnitInput, parentId: string | null) {
  const existing = await prisma.adminUnit.findFirst({ where: { parentId, slug: input.slug } });
  if (existing) return existing;
  // Two-step create so `path` can include the generated id.
  const created = await prisma.adminUnit.create({
    data: { ...input, parentId, path: "pending" },
  });
  const parentPath = parentId ? (await prisma.adminUnit.findUniqueOrThrow({ where: { id: parentId } })).path : "/";
  return prisma.adminUnit.update({ where: { id: created.id }, data: { path: `${parentPath}${created.id}/` } });
}

async function upsertUser(email: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, name, passwordHash: await hash(password), locale: "MR" } });
}

async function ensureAssignment(userId: string, role: "SUPER_ADMIN" | "TALUKA_ADMIN" | "BLOCK_ADMIN" | "GP_ADMIN" | "DATA_ENTRY_OPERATOR", unitId: string, modules: string[] = []) {
  const assignment = await prisma.roleAssignment.upsert({
    where: { userId_role_unitId: { userId, role, unitId } },
    create: { userId, role, unitId },
    update: { revokedAt: null },
  });
  for (const moduleKey of modules) {
    await prisma.modulePermission.upsert({
      where: { roleAssignmentId_moduleKey: { roleAssignmentId: assignment.id, moduleKey } },
      create: { roleAssignmentId: assignment.id, moduleKey, canWrite: true },
      update: {},
    });
  }
  return assignment;
}

async function ensureTenant(unitId: string, slug: string, nameEn: string, nameMr: string) {
  const tenant = await prisma.tenant.upsert({
    where: { unitId },
    create: { unitId, slug, nameEn, nameMr, status: "PUBLISHED", publishedAt: new Date() },
    update: {},
  });
  for (const pageKey of DEFAULT_PAGE_KEYS) {
    await prisma.page.upsert({ where: { tenantId_pageKey: { tenantId: tenant.id, pageKey } }, create: { tenantId: tenant.id, pageKey }, update: {} });
  }
  return tenant;
}

async function main() {
  const state = await upsertUnit({ level: "STATE", slug: "maharashtra", nameEn: "Maharashtra", nameMr: "महाराष्ट्र", code: "MH" }, null);
  const pune = await upsertUnit({ level: "DISTRICT", slug: "pune", nameEn: "Pune", nameMr: "पुणे" }, state.id);
  const haveli = await upsertUnit({ level: "TALUKA", slug: "haveli", nameEn: "Haveli", nameMr: "हवेली" }, pune.id);
  const mulshi = await upsertUnit({ level: "TALUKA", slug: "mulshi", nameEn: "Mulshi", nameMr: "मुळशी" }, pune.id);

  const gps = [
    { parent: haveli, slug: "ganeshwadi", nameEn: "Ganeshwadi", nameMr: "गणेशवाडी" },
    { parent: haveli, slug: "padegaon", nameEn: "Padegaon", nameMr: "पाडेगाव" },
    { parent: mulshi, slug: "vasantpuri", nameEn: "Vasantpuri", nameMr: "वसंतपुरी" },
  ];

  const superAdmin = await upsertUser(SUPER_EMAIL, "Super Admin", SUPER_PASSWORD);
  await ensureAssignment(superAdmin.id, "SUPER_ADMIN", state.id);

  const talukaAdmin = await upsertUser("haveli.admin@digitalgp.local", "Haveli Taluka Admin", SAMPLE_PASSWORD);
  await ensureAssignment(talukaAdmin.id, "TALUKA_ADMIN", haveli.id);

  for (const gp of gps) {
    const unit = await upsertUnit({ level: "GRAM_PANCHAYAT", slug: gp.slug, nameEn: gp.nameEn, nameMr: gp.nameMr }, gp.parent.id);
    await ensureTenant(unit.id, gp.slug, gp.nameEn, gp.nameMr);
    const admin = await upsertUser(`${gp.slug}.admin@digitalgp.local`, `${gp.nameEn} GP Admin`, SAMPLE_PASSWORD);
    await ensureAssignment(admin.id, "GP_ADMIN", unit.id);
    const operator = await upsertUser(`${gp.slug}.operator@digitalgp.local`, `${gp.nameEn} Data Entry Operator`, SAMPLE_PASSWORD);
    await ensureAssignment(operator.id, "DATA_ENTRY_OPERATOR", unit.id, ["announcements", "projects", "media"]);
  }

  console.log("Seed complete.");
  console.log(`  Super admin:   ${SUPER_EMAIL} / (SEED_SUPER_ADMIN_PASSWORD)`);
  console.log(`  Taluka admin:  haveli.admin@digitalgp.local / ${SAMPLE_PASSWORD}`);
  console.log(`  GP admins:     <slug>.admin@digitalgp.local / ${SAMPLE_PASSWORD}  (ganeshwadi, padegaon, vasantpuri)`);
  console.log(`  Operators:     <slug>.operator@digitalgp.local / ${SAMPLE_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
