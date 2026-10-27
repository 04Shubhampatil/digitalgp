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
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
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

// ---------------------------------------------------------------------------
// Savardari test data — taken from the Figma "Gram panchayat" home and about designs.
// Gram Panchayat Savardari, Taluka Khed, District Pune. Values not present in the design are
// omitted rather than invented (see the notes printed at the end of the seed).
// ---------------------------------------------------------------------------

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 4, 30));

/** Publish one section directly (draft + publish in one step). Skips when already published. */
async function publishSection(tenantId: string, pageKey: string, sectionKey: string, sortOrder: number, data: object, authorId: string) {
  const page = await prisma.page.findUniqueOrThrow({ where: { tenantId_pageKey: { tenantId, pageKey } } });
  const section = await prisma.section.upsert({
    where: { pageId_sectionKey: { pageId: page.id, sectionKey } },
    create: { tenantId, pageId: page.id, sectionKey, sortOrder },
    update: {},
  });
  if (section.publishedId) return;
  const version = (await prisma.sectionRevision.count({ where: { sectionId: section.id } })) + 1;
  const now = new Date();
  const rev = await prisma.sectionRevision.create({
    data: {
      tenantId,
      sectionId: section.id,
      version,
      status: "PUBLISHED",
      data: data as Prisma.InputJsonValue,
      createdById: authorId,
      submittedAt: now,
      reviewedById: authorId,
      reviewedAt: now,
      publishedById: authorId,
      publishedAt: now,
    },
  });
  await prisma.section.update({ where: { id: section.id }, data: { publishedId: rev.id } });
}

async function seedSavardari(pune: { id: string }, superAdminId: string) {
  const khed = await upsertUnit({ level: "TALUKA", slug: "khed", nameEn: "Khed", nameMr: "खेड" }, pune.id);
  const unit = await upsertUnit({ level: "GRAM_PANCHAYAT", slug: "savardari", nameEn: "Savardari", nameMr: "सवरदरी" }, khed.id);
  const tenant = await ensureTenant(unit.id, "savardari", "Savardari", "सवरदरी");
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { settings: { contact: { address: "Gram Panchayat Savardari, Taluka: Khed, District: Pune – 410501" } } },
  });

  // Accounts for the test website
  const khedAdmin = await upsertUser("khed.admin@digitalgp.local", "Khed Taluka Admin", SAMPLE_PASSWORD);
  await ensureAssignment(khedAdmin.id, "TALUKA_ADMIN", khed.id);
  const gpAdmin = await upsertUser("savardari.admin@digitalgp.local", "Savardari GP Admin", SAMPLE_PASSWORD);
  await ensureAssignment(gpAdmin.id, "GP_ADMIN", unit.id);
  const operator = await upsertUser("savardari.operator@digitalgp.local", "Savardari Data Entry Operator", SAMPLE_PASSWORD);
  await ensureAssignment(operator.id, "DATA_ENTRY_OPERATOR", unit.id, ["announcements", "projects", "schemes", "media"]);

  // ---- Home page sections
  await publishSection(tenant.id, "home", "hero", 0, {
    title: { en: "Welcome to Gram Panchayat Savardari" },
    subtitle: { en: "Building a Sustainable, Transparent & Digital Village." },
    cta: { label: { en: "Explore Village" }, href: "/savardari/about" },
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "quick-stats", 10, {
    items: [
      { label: { en: "Population" }, value: "2,857" },
      { label: { en: "Households" }, value: "2,857" },
      { label: { en: "Agriculture area (hectares)" }, value: "1,243" },
      { label: { en: "Literacy rate" }, value: "91.4%" },
      { label: { en: "Government schemes implemented" }, value: "9" },
      { label: { en: "Schools" }, value: "5" },
      { label: { en: "Water resources" }, value: "100%" },
      { label: { en: "Ongoing projects" }, value: "12" },
    ],
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "welcome", 20, {
    heading: { en: "Welcome to Savardari" },
    body: {
      en: "Gram Panchayat Savardari is working by prioritizing the values of nature conservation, industrial development, cleanliness, education and social inclusion. Gram Panchayat Savardari is known for embracing modern development while preserving the traditional lifestyle, maintaining a balance between agriculture and industry, and setting an example of sustainable development.",
    },
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "leaders", 30, {
    heading: { en: "Our Leaders" },
    items: [{ name: { en: "Smt. Sabitabai Gaikwad" }, designation: { en: "Sarpanch" } }],
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "quick-links", 40, {
    items: [
      { label: { en: "Property Tax" }, href: "/savardari/services#property-tax" },
      { label: { en: "Water Tax" }, href: "/savardari/services#water-tax" },
      { label: { en: "House Tax" }, href: "/savardari/services#house-tax" },
      { label: { en: "Birth Certificate" }, href: "/savardari/services#birth-certificate" },
      { label: { en: "Death Certificate" }, href: "/savardari/services#death-certificate" },
      { label: { en: "Marriage Certificate" }, href: "/savardari/services#marriage-certificate" },
      { label: { en: "Income Certificate" }, href: "/savardari/services#income-certificate" },
      { label: { en: "Caste Certificate" }, href: "/savardari/services#caste-certificate" },
      { label: { en: "Residence Certificate" }, href: "/savardari/services#residence-certificate" },
      { label: { en: "Aadhar Card Services" }, href: "/savardari/services#aadhar" },
      { label: { en: "Complaint Registration" }, href: "/savardari/grievance" },
    ],
  }, gpAdmin.id);

  // ---- About page sections
  await publishSection(tenant.id, "about", "overview", 0, {
    heading: { en: "About Savardari" },
    body: { en: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune. This village is a progressive village that combines natural wealth with industrial development." },
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "history", 10, {
    heading: { en: "Vision & Governance" },
    body: { en: "Gram Panchayat Savardari is working by prioritizing the values of nature conservation, industrial development, cleanliness, education and social inclusion." },
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "geography", 20, {
    areaSqKm: 12.43,
    population: 2857,
    households: 2857,
    pinCode: "410501",
    description: {
      en: "Industrially, Savardari has become an important center for employment generation as it is located in close proximity to the growing industrial area of Khed taluka. Due to the mountainous terrain, green agriculture, fertile land and local water resources, the geographical form of Savardari is very rich and environmentally friendly. Most of the citizens of the village depend on agriculture and related businesses.",
    },
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "members", 30, {
    heading: { en: "Our Leaders" },
    items: [{ name: { en: "Smt. Sabitabai Gaikwad" }, designation: { en: "Sarpanch" } }],
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "office", 40, {
    address: { en: "Gram Panchayat Savardari, Taluka: Khed, District: Pune – 410501" },
  }, gpAdmin.id);

  // ---- Announcements ("Notice & Announcement" section and the "What's New" list)
  const announcements = [
    { category: "scheme", priority: "IMPORTANT" as const, titleEn: "Chief Minister's Prosperous Panchayat Raj Mission", at: day(2026, 7, 9) },
    { category: "project", priority: "NORMAL" as const, titleEn: "New Water Pipeline Project Completed in Ward 2", at: day(2026, 7, 8) },
    { category: "environment", priority: "NORMAL" as const, titleEn: "450 Trees Planted in Village Plantation Drive", at: day(2026, 7, 6) },
    { category: "meeting", priority: "NORMAL" as const, titleEn: "Gram Sabha Meeting Held with Record Participation", at: day(2026, 7, 5) },
    { category: "project", priority: "NORMAL" as const, titleEn: "Solar Street Lights Installation Started in Ward 3", at: day(2026, 7, 4) },
    { category: "event", priority: "NORMAL" as const, titleEn: "Health Check-up Camp Organized for Villagers", at: day(2026, 7, 3) },
  ];
  for (const a of announcements) {
    const exists = await prisma.announcement.findFirst({ where: { tenantId: tenant.id, titleEn: a.titleEn } });
    if (exists) continue;
    await prisma.announcement.create({
      data: {
        tenantId: tenant.id,
        ownerUnitId: unit.id,
        category: a.category,
        priority: a.priority,
        titleEn: a.titleEn,
        displayPages: ["home", "announcements"],
        status: "PUBLISHED",
        publishAt: a.at,
        publishedAt: a.at,
        publishedById: gpAdmin.id,
        submittedAt: a.at,
        reviewedById: gpAdmin.id,
        reviewedAt: a.at,
        createdById: gpAdmin.id,
      },
    });
  }

  // ---- Projects (achievements and ongoing works from the design)
  const projects: { stage: "COMPLETED" | "ONGOING"; nameEn: string; descriptionEn?: string; wardNo?: string; year: number; familiesBenefited?: number; outcomeEn?: string }[] = [
    { stage: "COMPLETED", nameEn: "100% Household Tap Water Connections", descriptionEn: "Achieved complete tap water supply coverage in the village", wardNo: "All Wards", year: 2026, outcomeEn: "Completed 28 Jun 2026" },
    { stage: "COMPLETED", nameEn: "18,560 Trees Planted in 2026", descriptionEn: "Large scale plantation drive across all wards.", wardNo: "All Wards", year: 2026, outcomeEn: "Completed 25 Jun 2026" },
    { stage: "COMPLETED", nameEn: "100% LED Street Lights in All Wards", descriptionEn: "Completed LED street light installation project.", wardNo: "All Wards", year: 2026, outcomeEn: "Completed 20 Jun 2026" },
    { stage: "COMPLETED", nameEn: "High Gram Sabha Participation (78%)", descriptionEn: "Encouraged maximum citizen participation in governance.", wardNo: "All Wards", year: 2026, outcomeEn: "Completed 18 Jun 2026" },
    { stage: "COMPLETED", nameEn: "92% Grievances Resolved", descriptionEn: "Improved grievance redressal system and citizen satisfaction.", wardNo: "All Wards", year: 2026, outcomeEn: "Completed 15 Jun 2026" },
    { stage: "COMPLETED", nameEn: "New Water Pipeline Project in Ward 2", wardNo: "2", year: 2026, outcomeEn: "Completed 08 Jul 2026" },
    { stage: "ONGOING", nameEn: "Solar Street Lights Installation in Ward 3", wardNo: "3", year: 2026, outcomeEn: "Installation started 04 Jul 2026" },
    { stage: "ONGOING", nameEn: "Water Pipeline – Ward 1", wardNo: "1", year: 2026, familiesBenefited: 2450, outcomeEn: "2,450 / 3,000 families covered" },
    { stage: "ONGOING", nameEn: "Street Lights – Ward 1", wardNo: "1", year: 2026, outcomeEn: "6.5 km / 8 km completed" },
    { stage: "ONGOING", nameEn: "Drainage – Ward 1", wardNo: "1", year: 2026, outcomeEn: "98 / 120 completed" },
    { stage: "ONGOING", nameEn: "Roads – Ward 1", wardNo: "1", year: 2026, outcomeEn: "8.2 km / 10 km completed" },
  ];
  for (const p of projects) {
    const exists = await prisma.project.findFirst({ where: { tenantId: tenant.id, nameEn: p.nameEn } });
    if (exists) continue;
    await prisma.project.create({
      data: {
        tenantId: tenant.id,
        stage: p.stage,
        nameEn: p.nameEn,
        descriptionEn: p.descriptionEn ?? null,
        wardNo: p.wardNo ?? null,
        year: p.year,
        familiesBenefited: p.familiesBenefited ?? null,
        outcomeEn: p.outcomeEn ?? null,
        status: "PUBLISHED",
        publishedById: gpAdmin.id,
        publishedAt: day(2026, 7, 1),
        createdById: gpAdmin.id,
      },
    });
  }

  // ---- Scheme (design: "Scheme Beneficiaries 1,245")
  const scheme = await prisma.scheme.findFirst({ where: { tenantId: tenant.id, nameEn: "Chief Minister's Prosperous Panchayat Raj Mission" } });
  if (!scheme) {
    await prisma.scheme.create({
      data: {
        tenantId: tenant.id,
        ownerUnitId: unit.id,
        level: "STATE",
        nameEn: "Chief Minister's Prosperous Panchayat Raj Mission",
        beneficiaryCount: 1245,
        status: "PUBLISHED",
        publishedById: gpAdmin.id,
        publishedAt: day(2026, 7, 9),
        createdById: gpAdmin.id,
      },
    });
  }

  return { gpAdmin, unit, tenant, superAdminId };
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

  await seedSavardari(pune, superAdmin.id);

  console.log("Seed complete.");
  console.log(`  Savardari website: /savardari  (Khed taluka, Pune district) — Figma test data`);
  console.log(`  Savardari admins:  savardari.admin@digitalgp.local / ${SAMPLE_PASSWORD}  (GP admin)`);
  console.log(`                     savardari.operator@digitalgp.local / ${SAMPLE_PASSWORD}  (operator)`);
  console.log(`                     khed.admin@digitalgp.local / ${SAMPLE_PASSWORD}  (taluka admin)`);
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
