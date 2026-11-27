// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { AuthContext } from "@/lib/auth";
import { canGrantRole } from "@/lib/permissions";

const ctx = (role: AuthContext["assignments"][number]["role"], unitPath: string): AuthContext => ({
  user: { id: "u1", email: "u@test", name: "U", status: "ACTIVE", locale: "EN", mustResetPassword: false },
  sessionId: "s1",
  assignments: [{ id: "a1", role, unitId: "x", unitLevel: "TALUKA", unitPath, modules: new Map() }],
});

/** Who may create the GP Admin and operators that the one-step website flow creates. */
describe("one-step website creation: role grants", () => {
  const gp = "/s/d/t1/gp1/";
  const otherGp = "/s/d/t2/gp2/";

  it("Super Admin may create both roles anywhere", () => {
    const c = ctx("SUPER_ADMIN", "/s/");
    expect(canGrantRole(c, "GP_ADMIN", gp)).toBe(true);
    expect(canGrantRole(c, "DATA_ENTRY_OPERATOR", otherGp)).toBe(true);
  });

  it("Taluka Admin may create both roles only inside their taluka", () => {
    const c = ctx("TALUKA_ADMIN", "/s/d/t1/");
    expect(canGrantRole(c, "GP_ADMIN", gp)).toBe(true);
    expect(canGrantRole(c, "DATA_ENTRY_OPERATOR", gp)).toBe(true);
    expect(canGrantRole(c, "GP_ADMIN", otherGp)).toBe(false);
    expect(canGrantRole(c, "DATA_ENTRY_OPERATOR", otherGp)).toBe(false);
  });

  it("Taluka Admin cannot create another Taluka Admin", () => {
    expect(canGrantRole(ctx("TALUKA_ADMIN", "/s/d/t1/"), "TALUKA_ADMIN", "/s/d/t1/")).toBe(false);
  });

  it("GP Admin and operators cannot grant anything", () => {
    for (const role of ["GP_ADMIN", "DATA_ENTRY_OPERATOR"] as const) {
      const c = ctx(role, gp);
      expect(canGrantRole(c, "GP_ADMIN", gp)).toBe(false);
      expect(canGrantRole(c, "DATA_ENTRY_OPERATOR", gp)).toBe(false);
    }
  });
});
