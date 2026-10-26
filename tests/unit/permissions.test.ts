import { describe, expect, it } from "vitest";
import type { AuthContext } from "@/lib/auth";
import { CREATABLE_ROLES, ROLE_CAPABILITIES, assertCan, can, canGrantRole, isWithinScope } from "@/lib/permissions";

const ctx = (assignments: Partial<AuthContext["assignments"][number]>[]): AuthContext => ({
  user: { id: "u1", email: "u@test", name: "U", status: "ACTIVE", locale: "EN", mustResetPassword: false },
  sessionId: "s1",
  assignments: assignments.map((a, i) => ({
    id: `a${i}`,
    role: "GP_ADMIN",
    unitId: "unit",
    unitLevel: "GRAM_PANCHAYAT",
    unitPath: "/s/d/t/gp/",
    modules: new Map(),
    ...a,
  })),
});

describe("scope", () => {
  it("matches the unit itself and descendants only", () => {
    expect(isWithinScope("/s/d/t/", "/s/d/t/")).toBe(true);
    expect(isWithinScope("/s/d/t/", "/s/d/t/gp/")).toBe(true);
    expect(isWithinScope("/s/d/t/", "/s/d/")).toBe(false);
    expect(isWithinScope("/s/d/t/", "/s/d/t2/gp/")).toBe(false);
  });
});

describe("capability matrix", () => {
  it("only SUPER_ADMIN manages hierarchy and roles", () => {
    for (const role of ["TALUKA_ADMIN", "BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"] as const) {
      expect(ROLE_CAPABILITIES[role].has("hierarchy:manage")).toBe(false);
      expect(ROLE_CAPABILITIES[role].has("roles:manage")).toBe(false);
    }
    expect(ROLE_CAPABILITIES.SUPER_ADMIN.has("hierarchy:manage")).toBe(true);
  });

  it("operators can edit and submit but never review or publish", () => {
    const op = ROLE_CAPABILITIES.DATA_ENTRY_OPERATOR;
    expect(op.has("content:edit")).toBe(true);
    expect(op.has("content:submit")).toBe(true);
    expect(op.has("content:review")).toBe(false);
    expect(op.has("content:publish")).toBe(false);
    expect(op.has("user:manage")).toBe(false);
    expect(op.has("content:share")).toBe(false);
  });

  it("GP admins cannot create shared content or websites", () => {
    expect(ROLE_CAPABILITIES.GP_ADMIN.has("content:share")).toBe(false);
    expect(ROLE_CAPABILITIES.GP_ADMIN.has("tenant:create")).toBe(false);
  });

  it("role creation follows the hierarchy", () => {
    expect(CREATABLE_ROLES.GP_ADMIN.has("DATA_ENTRY_OPERATOR")).toBe(true);
    expect(CREATABLE_ROLES.GP_ADMIN.has("GP_ADMIN")).toBe(false);
    expect(CREATABLE_ROLES.TALUKA_ADMIN.has("GP_ADMIN")).toBe(true);
    expect(CREATABLE_ROLES.TALUKA_ADMIN.has("TALUKA_ADMIN")).toBe(false);
    expect(CREATABLE_ROLES.DATA_ENTRY_OPERATOR.size).toBe(0);
  });
});

describe("can()", () => {
  it("denies outside scope even with the capability", () => {
    const c = ctx([{ role: "GP_ADMIN", unitPath: "/s/d/t/gpA/" }]);
    expect(can(c, "content:publish", { unitPath: "/s/d/t/gpA/" })).toBe(true);
    expect(can(c, "content:publish", { unitPath: "/s/d/t/gpB/" })).toBe(false);
    expect(() => assertCan(c, "content:publish", { unitPath: "/s/d/t/gpB/" })).toThrow();
  });

  it("operators need a writable module grant for writes", () => {
    const withModule = ctx([{ role: "DATA_ENTRY_OPERATOR", modules: new Map([["announcements", true]]) }]);
    const readOnlyModule = ctx([{ role: "DATA_ENTRY_OPERATOR", modules: new Map([["announcements", false]]) }]);
    const noModule = ctx([{ role: "DATA_ENTRY_OPERATOR" }]);
    const target = { unitPath: "/s/d/t/gp/", moduleKey: "announcements" as const };
    expect(can(withModule, "content:edit", target)).toBe(true);
    expect(can(readOnlyModule, "content:edit", target)).toBe(false);
    expect(can(readOnlyModule, "content:read", target)).toBe(true);
    expect(can(noModule, "content:edit", target)).toBe(false);
    expect(can(withModule, "content:edit", { unitPath: "/s/d/t/gp/", moduleKey: "projects" })).toBe(false);
    // Writes with no module key at all are never granted to operators.
    expect(can(withModule, "content:edit", { unitPath: "/s/d/t/gp/" })).toBe(false);
  });

  it("the highest in-scope role wins when a user holds several", () => {
    const c = ctx([
      { role: "DATA_ENTRY_OPERATOR", unitPath: "/s/d/t/gp/" },
      { role: "TALUKA_ADMIN", unitPath: "/s/d/t/", unitLevel: "TALUKA" },
    ]);
    expect(can(c, "content:publish", { unitPath: "/s/d/t/gp/" })).toBe(true);
  });

  it("canGrantRole respects both scope and creatable roles", () => {
    const taluka = ctx([{ role: "TALUKA_ADMIN", unitPath: "/s/d/t/", unitLevel: "TALUKA" }]);
    expect(canGrantRole(taluka, "GP_ADMIN", "/s/d/t/gp/")).toBe(true);
    expect(canGrantRole(taluka, "GP_ADMIN", "/s/d/t2/gp/")).toBe(false);
    expect(canGrantRole(taluka, "TALUKA_ADMIN", "/s/d/t/")).toBe(false);
  });
});
