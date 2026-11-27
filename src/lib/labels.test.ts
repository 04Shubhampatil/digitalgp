import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import mr from "@/i18n/messages/mr.json";
import { auditActionLabel, auditEntityLabel } from "./audit-label";
import { announcementCategory } from "./category-label";

/** A translator over the `admin` messages, shaped like next-intl's. */
function translator(messages: typeof en) {
  const get = (key: string): unknown => key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), messages.admin);
  const t = ((key: string) => String(get(key) ?? key)) as ((key: string) => string) & { has: (key: string) => boolean };
  t.has = (key) => typeof get(key) === "string";
  return t;
}

describe("audit labels", () => {
  it("the English and Marathi labels read right", () => {
    expect(auditActionLabel(translator(mr), "announcement.create")).toBe("सूचना तयार केले");
    expect(auditActionLabel(translator(en), "auth.login")).toBe("Sign-in signed in");
    expect(auditActionLabel(translator(mr), "grievance.status.in_progress")).toBe("तक्रार प्रगतीत ठेवले");
  });

  it("a Marathi label contains no English words for the known codes", () => {
    const t = translator(mr);
    for (const code of ["announcement.update", "auth.logout", "tenant.create", "user.create", "media.upload", "scheme.coverage_update"]) {
      expect(auditActionLabel(t, code), code).toMatch(/[ऀ-ॿ]/);
      expect(auditActionLabel(t, code), code).not.toMatch(/[A-Za-z]{3,}/);
    }
    expect(auditEntityLabel(t, "SuccessStory")).toBe("यशोगाथा");
  });

  it("an unknown code falls back to a readable form", () => {
    expect(auditActionLabel(translator(en), "thing.happened")).toBe("Thing happened");
  });
});

describe("announcementCategory", () => {
  it("translates the known categories and keeps a custom one", () => {
    expect(announcementCategory(translator(mr), "meeting")).toBe("सभा");
    expect(announcementCategory(translator(mr), " Meeting ")).toBe("सभा");
    expect(announcementCategory(translator(en), "meeting")).toBe("Meeting");
    expect(announcementCategory(translator(mr), "Village fair")).toBe("Village fair");
  });
});
