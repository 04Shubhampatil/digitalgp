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
// Savardari test data — copied from the Figma "Gram panchayat" home and about designs
// (file qBVt7yv0KG41onObVWfnP1, node 375:12877). Text is kept exactly as shown in the design,
// including its spelling. Content the schemas cannot hold is left out (see the notes printed
// by the seed). Savardari's announcements, projects and schemes are replaced on each run so
// the seed always matches the design; sections are republished only when their content changes.
// ---------------------------------------------------------------------------

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 4, 30));

/** Stable JSON: sorted keys, so a value read back from Postgres (jsonb reorders keys) compares equal. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Publish a section. A new revision is created only when the content differs from the live one. */
async function publishSection(tenantId: string, pageKey: string, sectionKey: string, sortOrder: number, data: object, authorId: string) {
  const page = await prisma.page.findUniqueOrThrow({ where: { tenantId_pageKey: { tenantId, pageKey } } });
  const section = await prisma.section.upsert({
    where: { pageId_sectionKey: { pageId: page.id, sectionKey } },
    create: { tenantId, pageId: page.id, sectionKey, sortOrder },
    update: { sortOrder },
  });
  const live = section.publishedId ? await prisma.sectionRevision.findUnique({ where: { id: section.publishedId } }) : null;
  if (live && canonical(live.data) === canonical(data)) return;

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
    data: { settings: { contact: { address: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501" } } },
  });

  // Accounts for the test website
  const khedAdmin = await upsertUser("khed.admin@digitalgp.local", "Khed Taluka Admin", SAMPLE_PASSWORD);
  await ensureAssignment(khedAdmin.id, "TALUKA_ADMIN", khed.id);
  const gpAdmin = await upsertUser("savardari.admin@digitalgp.local", "Savardari GP Admin", SAMPLE_PASSWORD);
  await ensureAssignment(gpAdmin.id, "GP_ADMIN", unit.id);
  const operator = await upsertUser("savardari.operator@digitalgp.local", "Savardari Data Entry Operator", SAMPLE_PASSWORD);
  await ensureAssignment(operator.id, "DATA_ENTRY_OPERATOR", unit.id, ["announcements", "projects", "schemes", "media"]);

  // ---- Home page (design: hero, quick statistics, welcome, Message from the Sarpanch, Citizen Services)
  await publishSection(tenant.id, "home", "hero", 0, {
    title: { en: "Welcome to Gram Panchayat Savardari" },
    subtitle: { en: "Building a Sustainable, Transparent & Digital Village." },
    cta: { label: { en: "Explore Village" }, href: "/savardari/about" },
    actions: [
      { label: { en: "Explore Village" }, href: "/savardari/about" },
      { label: { en: "Explore Services" }, href: "/savardari/services" },
      { label: { en: "Register Complaint" }, href: "/savardari/grievance" },
    ],
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "quick-stats", 10, {
    items: [
      { label: { en: "Population" }, value: "2,857" },
      { label: { en: "Households" }, value: "2,857" },
      { label: { en: "Hectares Agriculture Area" }, value: "1,243" },
      { label: { en: "Literacy Rate" }, value: "1,243" },
      { label: { en: "Govt. Schemes Implemented" }, value: "9" },
      { label: { en: "Schools" }, value: "5" },
      { label: { en: "Water Resources" }, value: "100%" },
      { label: { en: "Ongoing Projects" }, value: "12" },
    ],
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "welcome", 20, {
    heading: { en: "Welcome to Savardari" },
    body: { en: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune This village is a progressive village that combines natural wealth with industrial development" },
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "sarpanch-message", 25, {
    heading: { en: "Message from the Sarpanch" },
    message: {
      en: "Dear fellow citizens, we are committed to making Savardari a model village of Maharashtra, Your cooperation in our development journey is our greatest strength. Together, we build a clean, prosperous , and digitally empowered Savardari.",
    },
    name: { en: "Smt. Sabitabai Gaikwad" },
    designation: { en: "Sarpanch, Gram Panchayat Savardari" },
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "monthly-metrics", 30, {
    period: { en: "this month" },
    items: [
      { label: { en: "Population" }, value: "2,857", change: "1.2%" },
      { label: { en: "Literacy Rate" }, value: "91.4%", change: "2.3%" },
      { label: { en: "Health Coverage" }, value: "96%", change: "1.5%" },
      { label: { en: "Water Supply" }, value: "100%", change: "0.5%" },
      { label: { en: "Electricity Supply" }, value: "91.4%", change: "0.8%" },
      { label: { en: "Scheme Beneficiaries" }, value: "1,245", change: "3.6%" },
      { label: { en: "Gram Sabha Participation" }, value: "78%", change: "5.4%" },
      { label: { en: "Grievance Redressal" }, value: "92%", change: "4.1%" },
      { label: { en: "Tree Plantation" }, value: "18,560", change: "8.7%" },
    ],
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "village-progress", 35, {
    heading: { en: "Village Development Progress" },
    subheading: { en: "Live indicators tracking Savardari's development journey" },
    items: [
      { label: { en: "Tap Water (Jal Jeevan Mission)" } },
      { label: { en: "Sanitation Coverage (ODF++)" } },
      { label: { en: "Solar Street Lights" } },
      { label: { en: "PM Awas Housing Completed" } },
      { label: { en: "All-Weather Road Connectivity" } },
      { label: { en: "Digital Literacy Enrolment" } },
    ],
  }, gpAdmin.id);

  await publishSection(tenant.id, "home", "ward-details", 40, {
    heading: { en: "Ward Details" },
    wards: [
      {
        name: { en: "Ward 1" },
        items: [
          { label: { en: "Water Pipeline" }, valueText: "2,450 / 3000" },
          { label: { en: "Street Lights" }, valueText: "6.5 km / 8 km" },
          { label: { en: "Drainage" }, valueText: "98 / 120" },
          { label: { en: "Plantation" }, valueText: "8.2 km / 10 km" },
        ],
      },
    ],
  }, gpAdmin.id);

  // The old home "leaders" section is replaced by "sarpanch-message" above.
  await prisma.section.deleteMany({ where: { tenantId: tenant.id, sectionKey: "leaders", page: { pageKey: "home" } } });

  await publishSection(tenant.id, "home", "quick-links", 50, {
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
      { label: { en: "Aadhar Card Services" }, href: "/savardari/services#aadhar-card" },
      { label: { en: "Complaint Registration" }, href: "/savardari/grievance" },
    ],
  }, gpAdmin.id);

  // ---- About page (design: About Savardari, Vision & Governance, Industrial Growth, Nature & Agriculture)
  await publishSection(tenant.id, "about", "overview", 0, {
    heading: { en: "About Savardari" },
    body: { en: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune This village is a progressive village that combines natural wealth with industrial development" },
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "history", 10, {
    heading: { en: "Vision & Governance" },
    body: { en: "Gram Panchayat Savardari is working by prioritizing the values of nature conservation, industrial development, cleanliness, education and social inclusion . Gram Panchayat Savardari is known for embracing modern development while preserving the traditional lifestyle, maintaining a balance between agriculture and industry, and setting an example of sustainable development" },
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "geography", 20, {
    areaSqKm: 12.43,
    population: 2857,
    households: 2857,
    pinCode: "410501",
    description: {
      en: "Industrial Growth\n\nIndustrially, Savardari has become an important center for employment generation as it is located in close proximity to the growing industrial area of ​​Khed taluka. The nearby industrial estates, small and medium industries and service sector are providing employment opportunities to the youth of the village at the local level. Due to this, the economic development of the village is rapid and it is moving towards modernity\n\nNature & Agriculture\n\nDue to the mountainous terrain, green agriculture, fertile land and local water resources, the geographical form of Savardari is very rich and environmentally friendly. Most of the citizens of the village depend on agriculture and related businesses and the traditional agricultural culture is preserved here even today",
    },
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "members", 30, {
    heading: { en: "Message from the Sarpanch" },
    items: [{ name: { en: "Smt. Sabitabai Gaikwad" }, designation: { en: "Sarpanch" } }],
  }, gpAdmin.id);

  await publishSection(tenant.id, "about", "office", 40, {
    address: { en: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501" },
  }, gpAdmin.id);

  // ---- Announcements ("Notice & Announcement" and the "What's New This Week?" list), in design order
  // Replaced on every run: Savardari's announcements, projects and schemes come only from this seed.
  await prisma.announcement.deleteMany({ where: { tenantId: tenant.id } });
  const announcements: { category: string; titleEn: string; at?: Date }[] = [
    { category: "Completed", titleEn: "New Water Pipeline Project Completed in Ward 2", at: day(2026, 7, 8) },
    { category: "Completed", titleEn: "450 Trees Planted in Village Plantation Drive", at: day(2026, 7, 6) },
    { category: "Event", titleEn: "Gram Sabha Meeting Held with Record Participation", at: day(2026, 7, 5) },
    { category: "Ongoing", titleEn: "Solar Street Lights Installtion Started in Ward 3", at: day(2026, 7, 4) },
    { category: "Event", titleEn: "Health Check-up Camp Organized for Villagers", at: day(2026, 7, 3) },
    { category: "Notice", titleEn: "Chief Minister's Prosperous Panchayat Raj Mission" },
  ];
  for (const a of announcements) {
    await prisma.announcement.create({
      data: {
        tenantId: tenant.id,
        ownerUnitId: unit.id,
        category: a.category,
        priority: "NORMAL",
        titleEn: a.titleEn,
        displayPages: ["home", "announcements"],
        status: "PUBLISHED",
        publishAt: a.at ?? null,
        publishedAt: a.at ?? new Date(),
        publishedById: gpAdmin.id,
        submittedAt: a.at ?? new Date(),
        reviewedById: gpAdmin.id,
        reviewedAt: a.at ?? new Date(),
        createdById: gpAdmin.id,
      },
    });
  }

  // ---- Projects: "Top Five Achievements" and the Ward 1 progress list
  await prisma.project.deleteMany({ where: { tenantId: tenant.id } });
  const projects: { stage: "COMPLETED" | "ONGOING"; nameEn: string; descriptionEn?: string; wardNo?: string; outcomeEn: string }[] = [
    { stage: "COMPLETED", nameEn: "100% Household Top Water Connections", descriptionEn: "Achieved complete tap water supply coverage in the village", outcomeEn: "Completed: 28 Jun 2026" },
    { stage: "COMPLETED", nameEn: "18,560 Trees Planted in 2026", descriptionEn: "Large scale plantation drive across all wards.", outcomeEn: "Completed: 25 Jun 2026" },
    { stage: "COMPLETED", nameEn: "100% LED Street Lights in All Wards", descriptionEn: "Completed LED street light installation project.", outcomeEn: "Completed: 20 Jun 2026" },
    { stage: "COMPLETED", nameEn: "High Gram Sabha Participation (78%)", descriptionEn: "Encouraged maximum citizen participation in governance.", outcomeEn: "Completed: 18 Jun 2026" },
    { stage: "COMPLETED", nameEn: "92% Grievances Resolved", descriptionEn: "Improved grievance redressal system and citizen satisfaction.", outcomeEn: "Completed: 15 Jun 2026" },
    { stage: "ONGOING", nameEn: "Water Pipeline", wardNo: "1", outcomeEn: "2,450 / 3000" },
    { stage: "ONGOING", nameEn: "Street Lights", wardNo: "1", outcomeEn: "6.5 km / 8 km" },
    { stage: "ONGOING", nameEn: "Drainage", wardNo: "1", outcomeEn: "98 / 120" },
    { stage: "ONGOING", nameEn: "Plantation", wardNo: "1", outcomeEn: "8.2 km / 10 km" },
  ];
  for (const p of projects) {
    await prisma.project.create({
      data: {
        tenantId: tenant.id,
        stage: p.stage,
        nameEn: p.nameEn,
        descriptionEn: p.descriptionEn ?? null,
        wardNo: p.wardNo ?? null,
        year: 2026,
        outcomeEn: p.outcomeEn,
        status: "PUBLISHED",
        publishedById: gpAdmin.id,
        publishedAt: new Date(),
        createdById: gpAdmin.id,
      },
    });
  }

  // The design shows "Govt. Schemes Implemented 9" and "Scheme Beneficiaries 1,245" as statistics,
  // not as named scheme records, so no scheme rows are created here.
  await prisma.scheme.deleteMany({ where: { tenantId: tenant.id } });

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
