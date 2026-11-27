// @vitest-environment node
import { describe, expect, it } from "vitest";
import { MAX_WEBSITE_OPERATORS, createTenantWithUsersSchema } from "@/features/tenants/validators";

const base = {
  unitId: "ckunit000000000001",
  slug: "khed-gp",
  nameEn: "Khed",
  nameMr: "खेड",
  gpAdmin: { name: "GP Admin", email: "Admin@Test.Local" },
};
const op = (email: string, modules: unknown = [{ moduleKey: "announcements", canWrite: true }]) => ({ name: "Op", email, modules });

describe("createTenantWithUsersSchema", () => {
  it("accepts the website with only a GP Admin (generated password) and defaults operators to none", () => {
    const r = createTenantWithUsersSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.gpAdmin.email).toBe("admin@test.local");
      expect(r.data.gpAdmin.password).toBeUndefined();
      expect(r.data.operators).toEqual([]);
    }
  });

  it("requires the GP Admin account", () => {
    const rest: Record<string, unknown> = { ...base };
    delete rest.gpAdmin;
    expect(createTenantWithUsersSchema.safeParse(rest).success).toBe(false);
  });

  it("applies the createUser password policy to typed passwords", () => {
    for (const password of ["short1", "onlyletterslong", "1234567890123"]) {
      const r = createTenantWithUsersSchema.safeParse({ ...base, gpAdmin: { ...base.gpAdmin, password } });
      expect(r.success, password).toBe(false);
    }
    expect(createTenantWithUsersSchema.safeParse({ ...base, gpAdmin: { ...base.gpAdmin, password: "Strong-Pass-123" } }).success).toBe(true);
  });

  it("validates email and optional phone", () => {
    expect(createTenantWithUsersSchema.safeParse({ ...base, gpAdmin: { ...base.gpAdmin, email: "nope" } }).success).toBe(false);
    expect(createTenantWithUsersSchema.safeParse({ ...base, gpAdmin: { ...base.gpAdmin, phone: "98765" } }).success).toBe(false);
    expect(createTenantWithUsersSchema.safeParse({ ...base, gpAdmin: { ...base.gpAdmin, phone: "+919876543210" } }).success).toBe(true);
  });

  it("operators need at least one valid module", () => {
    expect(createTenantWithUsersSchema.safeParse({ ...base, operators: [op("o1@test.local", [])] }).success).toBe(false);
    expect(createTenantWithUsersSchema.safeParse({ ...base, operators: [op("o1@test.local", [{ moduleKey: "nope", canWrite: true }])] }).success).toBe(false);
    expect(createTenantWithUsersSchema.safeParse({ ...base, operators: [op("o1@test.local")] }).success).toBe(true);
  });

  it("limits the number of operators", () => {
    const many = Array.from({ length: MAX_WEBSITE_OPERATORS + 1 }, (_, i) => op(`o${i}@test.local`));
    expect(createTenantWithUsersSchema.safeParse({ ...base, operators: many }).success).toBe(false);
  });

  it("rejects an email used twice in one request, pointing at the repeated field", () => {
    const r = createTenantWithUsersSchema.safeParse({ ...base, operators: [op("a@test.local"), op("ADMIN@test.local"), op("a@test.local")] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path.join("."))).toEqual(["operators.1.email", "operators.2.email"]);
  });

  it("rejects a role smuggled in by the client (strict account shape is not needed: role is fixed server-side)", () => {
    const r = createTenantWithUsersSchema.safeParse({ ...base, gpAdmin: { ...base.gpAdmin, role: "SUPER_ADMIN" } });
    expect(r.success).toBe(true);
    if (r.success) expect("role" in r.data.gpAdmin).toBe(false);
  });
});
