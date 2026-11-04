import { describe, expect, it } from "vitest";
import { findSection } from "@/config/sections";
import { href } from "@/config/section-primitives";
import { OPTIONAL_PAGE_KEYS, DEFAULT_PAGE_KEYS } from "@/config/pages";
import { createAnnouncementSchema, publicAnnouncementsQuerySchema } from "@/features/announcements/validators";
import { feedbackSchema, treeAdoptionSchema, volunteerSchema } from "@/features/forms/validators";
import { grievanceLookupQuerySchema, submitGrievanceSchema } from "@/features/grievances/validators";
import { financialYearSchema } from "@/features/schemes/validators";
import { createStorySchema } from "@/features/success-stories/validators";
import { tenantSettingsSchema } from "@/features/tenants/validators";

const ok = (page: Parameters<typeof findSection>[0], key: string, data: unknown) => {
  const def = findSection(page, key);
  if (!def) throw new Error(`missing ${page}/${key}`);
  return def.schema.safeParse(data).success;
};

describe("pages", () => {
  it("creates every page for new websites, with optional ones disabled", () => {
    expect(DEFAULT_PAGE_KEYS).toContain("progress");
    expect(OPTIONAL_PAGE_KEYS).toEqual(["progress"]);
  });
});

describe("section links", () => {
  it("accept page:<key>#<section> as well as URLs, paths, mailto and tel", () => {
    for (const v of ["page:contact", "page:environment#tree-adoption", "https://wa.me/919767694340", "/savardari/about", "tel:+919767694340", "mailto:a@b.in"]) {
      expect(href.safeParse(v).success).toBe(true);
    }
    for (const v of ["javascript:alert(1)", "page:", "page:Contact", "page:contact#bad anchor", "ftp://x.y"]) {
      expect(href.safeParse(v).success).toBe(false);
    }
  });
});

describe("section schema fields for the public layouts", () => {
  const viewAll = { label: { en: "View all" }, href: "page:culture#success-stories" };

  it("list sections take heading, subheading and viewAll", () => {
    const header = { heading: { en: "H" }, subheading: { en: "S" }, viewAll };
    expect(ok("employment", "skill-directory", { ...header, items: [] })).toBe(true);
    expect(ok("employment", "job-portals", { ...header, items: [] })).toBe(true);
    expect(ok("employment", "local-opportunities", { ...header, items: [] })).toBe(true);
    expect(ok("employment", "assistance-items", { ...header, items: [] })).toBe(true);
    expect(ok("employment", "training-programs", { ...header, items: [] })).toBe(true);
    expect(ok("education", "scheme-cards", { ...header, items: [] })).toBe(true);
    expect(ok("education", "youth-posts", { ...header, items: [] })).toBe(true);
    expect(ok("culture", "success-stories", { ...header, layout: "quote", items: [] })).toBe(true);
    expect(ok("projects", "success-stories", { ...header, items: [] })).toBe(true);
    expect(ok("employment", "job-portals", { viewAll: { label: { en: "x" }, href: "javascript:x" }, items: [] })).toBe(false);
  });

  it("layout switches only accept their listed values", () => {
    expect(ok("grievance", "support-cards", { layout: "contact", items: [] })).toBe(true);
    expect(ok("employment", "support-cards", { layout: "strip", items: [] })).toBe(true);
    expect(ok("employment", "support-cards", { layout: "carousel", items: [] })).toBe(false);
    expect(ok("schemes", "link-cards", { layout: "list", items: [{ title: { en: "Purpose" }, href: "page:schemes#scheme-showcase" }] })).toBe(true);
    for (const variant of ["tiles", "strip", "card", "band"]) expect(ok("finance", "top-stats", { variant, items: [] })).toBe(true);
    expect(ok("finance", "top-stats", { variant: "huge", items: [] })).toBe(false);
  });

  it("cards carry links, colours and captions", () => {
    const card = { icon: "phone", title: { en: "Helpline" }, contactOrAction: { en: "Call us" }, link: "tel:1800233400", colour: "#138808", visible: true };
    expect(ok("grievance", "support-cards", { items: [card] })).toBe(true);
    expect(ok("grievance", "support-cards", { items: [{ ...card, colour: "green" }] })).toBe(false);
    expect(ok("employment", "assistance-items", { items: [{ icon: "rain", title: { en: "Prices" }, description: { en: "Daily rates" }, link: "page:environment#market-prices", colour: "#f5871f", active: true }] })).toBe(true);
    expect(ok("education", "scheme-cards", { items: [{ icon: "award", title: { en: "Skills" }, link: "page:employment", colour: "#1a62e0", active: true }] })).toBe(true);
  });

  it("youth posts take an author and a date", () => {
    const post = { tabKey: "blogs", type: "blog", title: { en: "Post" }, author: { en: "Rutuja" }, date: "2024-03-25" };
    expect(ok("education", "youth-posts", { items: [post] })).toBe(true);
    expect(ok("education", "youth-posts", { items: [{ ...post, date: "25/03/2024" }] })).toBe(false);
  });

  it("environment: key initiatives, initiative links, tree-adoption form settings, several markets", () => {
    expect(ok("environment", "key-initiatives", { heading: { en: "Our Key Initiatives" }, items: [{ icon: "tree", title: { en: "Plantation" }, link: "page:environment#tree-adoption" }] })).toBe(true);
    expect(ok("environment", "sustainability-initiatives", { items: [{ title: { en: "Solar" }, link: "page:environment", active: true }] })).toBe(true);
    const tree = { enabled: true, title: { en: "Adopt" }, bullets: [], stats: [], recipientEmail: "office@gp.in", successMessage: { en: "Thanks" } };
    expect(ok("environment", "tree-adoption", tree)).toBe(true);
    expect(ok("environment", "tree-adoption", { ...tree, recipientEmail: "not-an-email" })).toBe(false);

    const row = { commodity: { en: "Onion" }, unit: "Quintal", minPrice: 10, modalPrice: 12, maxPrice: 15 };
    const prices = (markets: unknown) => ({ title: { en: "Prices" }, lastUpdatedAt: "2026-11-01T08:00:00Z", rows: [row], markets });
    expect(ok("environment", "market-prices", prices([{ key: "khed", name: { en: "Khed" }, rows: [row] }, { key: "pune", name: { en: "Pune" }, rows: [row] }]))).toBe(true);
    expect(ok("environment", "market-prices", prices([{ key: "khed", name: { en: "Khed" }, rows: [] }, { key: "khed", name: { en: "Khed 2" }, rows: [] }]))).toBe(false);
    expect(ok("environment", "market-prices", prices([{ key: "khed", name: { en: "Khed" }, rows: [{ ...row, modalPrice: 99 }] }]))).toBe(false);
  });

  it("gallery: press category, documentary poster and duration", () => {
    expect(ok("gallery", "press-coverage", { items: [{ mediaName: "Lokmat", title: { en: "News" }, category: { en: "News" }, date: "2025-05-15", url: "https://www.lokmat.com", order: 1 }] })).toBe(true);
    const doc = {
      heading: { en: "Film" },
      title: { en: "Village" },
      source: "link",
      videoUrl: "https://www.youtube.com/watch?v=abc",
      publishedDate: "2026-10-01",
      playback: { autoplay: false, controls: true, muted: false, loop: false },
      autoThumbnail: false,
    };
    expect(ok("gallery", "mini-documentary", { ...doc, thumbnailUrl: "https://img.example.in/poster.png", duration: "02:00" })).toBe(true);
    expect(ok("gallery", "mini-documentary", { ...doc, duration: "1:02:00" })).toBe(true);
    expect(ok("gallery", "mini-documentary", { ...doc, duration: "two minutes" })).toBe(false);
    expect(ok("gallery", "mini-documentary", { ...doc, thumbnailUrl: "http://img.example.in/poster.png" })).toBe(false);
  });

  it("culture: FPO / gallery / voice links and homestay booking link", () => {
    const data = {
      enabled: true,
      fpo: { title: { en: "FPO" }, points: [], link: "page:employment#farmer-assistance", linkLabel: { en: "Learn More" } },
      gallery: { title: { en: "Gallery" }, imageIds: [], link: "page:gallery", linkLabel: { en: "Explore" } },
      voice: { title: { en: "Voice" }, imageId: "cjld2cjxh0000qzrmn831i7rn", link: "page:gallery#video-gallery" },
    };
    expect(ok("culture", "fpo-gallery-voice", data)).toBe(true);
    expect(ok("culture", "homestay", { heading: { en: "Homestay" }, bookingLink: "https://wa.me/919767694340", bookingLabel: { en: "Book" }, features: [] })).toBe(true);
  });

  it("finance documents take a size label", () => {
    expect(ok("finance", "documents", { heading: { en: "Docs" }, backgroundColour: "#FFFFFF", items: [{ title: { en: "Budget" }, fileId: "cjld2cjxh0000qzrmn831i7rn", fileSize: "2.4 MB" }] })).toBe(true);
  });

  it("home: unit and visibility on quick stats, trend on metrics; about: hero buttons and vision-mission", () => {
    expect(ok("home", "quick-stats", { items: [{ label: { en: "Agriculture" }, value: "1,243", unit: { en: "Hectares" }, visible: false }] })).toBe(true);
    expect(ok("home", "monthly-metrics", { items: [{ label: { en: "Complaints" }, value: "12", change: "4%", trend: "down", trendIsPositive: true }] })).toBe(true);
    expect(ok("home", "monthly-metrics", { items: [{ label: { en: "x" }, value: "1", trend: "sideways" }] })).toBe(false);
    expect(ok("about", "overview", { heading: { en: "About" }, body: { en: "Text" }, actions: [{ label: { en: "Contact" }, href: "page:contact" }] })).toBe(true);
    expect(ok("about", "vision-mission", { vision: { body: { en: "A model village" } }, mission: { points: [{ en: "Clean water" }] } })).toBe(true);
    expect(ok("about", "vision-mission", { mission: {} })).toBe(false);
  });

  it("projects: before/after gallery takes an eyebrow and a view-all link", () => {
    expect(ok("projects", "before-after-gallery", { eyebrow: { en: "Before & After" }, viewAll: { label: { en: "View All" }, href: "page:gallery" }, items: [] })).toBe(true);
  });
});

describe("forms and endpoints", () => {
  it("grievance: complaint type, subject and location", () => {
    const base = { category: "Water", citizenName: "Asha", description: "No water supply for three days" };
    expect(submitGrievanceSchema.safeParse({ ...base, complaintType: "Water Supply", subject: "No water", location: "Ward 2" }).success).toBe(true);
    expect(submitGrievanceSchema.safeParse({ ...base, subject: "x".repeat(201) }).success).toBe(false);
  });

  it("grievance lookup needs a valid mobile number", () => {
    expect(grievanceLookupQuerySchema.safeParse({ phone: "9876543210" }).success).toBe(true);
    expect(grievanceLookupQuerySchema.safeParse({ phone: "+919876543210" }).success).toBe(true);
    expect(grievanceLookupQuerySchema.safeParse({ phone: "12345" }).success).toBe(false);
  });

  it("feedback subject/rating, volunteer address/area, tree adoption", () => {
    expect(feedbackSchema.safeParse({ name: "Asha", message: "Very helpful office staff", subject: "Thanks", rating: 5 }).success).toBe(true);
    expect(feedbackSchema.safeParse({ name: "Asha", message: "Very helpful office staff", rating: 6 }).success).toBe(false);
    expect(volunteerSchema.safeParse({ name: "Ravi", email: "r@x.in", phone: "9876543210", category: "Youth", address: "Ward 1", areaOfInterest: "Teaching" }).success).toBe(true);
    expect(treeAdoptionSchema.safeParse({ name: "Ravi", phone: "9876543210", treeCount: 3, species: "Neem", preferredLocation: "School" }).success).toBe(true);
    expect(treeAdoptionSchema.safeParse({ name: "Ravi", phone: "9876543210", treeCount: 0 }).success).toBe(false);
    expect(treeAdoptionSchema.safeParse({ name: "Ravi", phone: "9876543210", treeCount: 2, unexpected: true }).success).toBe(false);
  });

  it("announcement events must end after they start; calendar ranges are bounded", () => {
    const a = { tenantId: "cjld2cjxh0000qzrmn831i7rn", category: "Event", titleEn: "Gram Sabha" };
    expect(createAnnouncementSchema.safeParse({ ...a, eventStartAt: "2026-11-20T10:00:00+05:30", eventEndAt: "2026-11-20T12:00:00+05:30" }).success).toBe(true);
    expect(createAnnouncementSchema.safeParse({ ...a, eventStartAt: "2026-11-20T10:00:00+05:30", eventEndAt: "2026-11-20T09:00:00+05:30" }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ ...a, eventEndAt: "2026-11-20T09:00:00+05:30" }).success).toBe(false);
    expect(publicAnnouncementsQuerySchema.safeParse({ from: "2026-11-01", to: "2026-12-01" }).success).toBe(true);
    expect(publicAnnouncementsQuerySchema.safeParse({ from: "2026-12-01", to: "2026-11-01" }).success).toBe(false);
    expect(publicAnnouncementsQuerySchema.safeParse({ from: "2026-01-01", to: "2027-06-01" }).success).toBe(false);
  });

  it("financial year labels are YYYY-YY with consecutive years", () => {
    expect(financialYearSchema.safeParse("2026-27").success).toBe(true);
    expect(financialYearSchema.safeParse("2099-00").success).toBe(true);
    expect(financialYearSchema.safeParse("2026-28").success).toBe(false);
    expect(financialYearSchema.safeParse("26-27").success).toBe(false);
  });

  it("success stories: a title and a known page are required", () => {
    const tenantId = "cjld2cjxh0000qzrmn831i7rn";
    expect(createStorySchema.safeParse({ tenantId, pageKey: "projects", titleEn: "From farmer to entrepreneur" }).success).toBe(true);
    expect(createStorySchema.safeParse({ tenantId, pageKey: "projects" }).success).toBe(false);
    expect(createStorySchema.safeParse({ tenantId, pageKey: "finance", titleEn: "x" }).success).toBe(false);
  });

  it("settings: twitter link and monthly service figures", () => {
    expect(tenantSettingsSchema.safeParse({ social: { twitter: "https://x.com/savardari" } }).success).toBe(true);
    expect(tenantSettingsSchema.safeParse({ serviceStats: { month: "2026-11", certificatesIssued: 42, taxCollected: 125000.5, satisfactionRate: 92 } }).success).toBe(true);
    expect(tenantSettingsSchema.safeParse({ serviceStats: { month: "2026-13" } }).success).toBe(false);
    expect(tenantSettingsSchema.safeParse({ serviceStats: { month: "2026-11", satisfactionRate: 120 } }).success).toBe(false);
  });
});
