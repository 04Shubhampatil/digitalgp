// @vitest-environment node
import { describe, expect, it } from "vitest";
import { publicSiteUrl } from "@/lib/public-url";

describe("publicSiteUrl", () => {
  it("uses the path address where subdomains cannot work", () => {
    for (const host of [undefined, "", "localhost", "localhost:3001", "digitalgp.vercel.app", "DigitalGP.Vercel.App"]) {
      expect(publicSiteUrl("savardari", host), String(host)).toBe("/savardari");
    }
  });

  it("uses the subdomain on a real domain", () => {
    expect(publicSiteUrl("savardari", "digitalgp.in")).toBe("https://savardari.digitalgp.in");
  });
});
