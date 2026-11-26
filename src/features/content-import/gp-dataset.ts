/**
 * A Gram Panchayat content dataset (data/gp-datasets/<name>.json): the public content of one village website in a
 * neutral shape — village profile, officials, schemes, events, gallery, documents — with pictures and files as
 * site paths (public/images/..., public/documents/...). `buildSections` turns it into section data for a website;
 * importing (./import-gp-dataset.ts) publishes that data and the records on a target website.
 *
 * Pure: no database access, so the mapping is unit-tested against the real section schemas.
 */
import { z } from "zod";
import type { PageKey } from "@/config/pages";
import { findSection } from "@/config/sections";
import { isSiteAssetPath } from "@/features/media/site-assets";

const bi = z.object({ en: z.string().trim().max(20_000), mr: z.string().trim().max(20_000) }).strict();
const sitePath = z.string().refine(isSiteAssetPath, "Must be a site asset path (/images/... or /documents/....pdf)");
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const gpDatasetSchema = z
  .object({
    source: z.object({ name: z.string(), url: z.url(), extractedOn: isoDay, note: z.string().optional() }).strict(),
    village: z
      .object({
        name: bi,
        taluka: bi,
        district: bi,
        state: bi,
        pinCode: z.string().regex(/^[1-9][0-9]{5}$/),
        established: z.number().int().optional(),
        population: z.number().int().min(0).optional(),
        area: z.string().optional(),
        villageProgrammes: z.number().int().min(0).optional(),
        tagline: bi,
        welcome: bi,
        thoughtOfTheDay: bi.optional(),
        about: bi,
        history: bi,
        location: bi,
        transport: z.array(z.object({ label: bi, value: bi }).strict()),
        nearestCity: bi.optional(),
        /** Pictures of the village shown beside the welcome / about texts. */
        images: z
          .object({ village1: sitePath, village2: sitePath, about1: sitePath, about2: sitePath, statistics: sitePath, visionMission: sitePath })
          .partial()
          .strict()
          .optional(),
      })
      .strict(),
    contact: z
      .object({
        email: z.email(),
        phone: z.string().regex(/^\+?[0-9 ]{10,20}$/),
        address: bi,
        hours: bi,
        weatherLocation: z.string().min(2).max(120),
        mapQuery: z.string().min(2).max(200),
      })
      .strict(),
    attractions: z.array(z.object({ title: bi, description: bi }).strict()),
    leaders: z.array(z.object({ name: bi, designation: bi, bio: bi.optional(), photo: sitePath.optional() }).strict()).min(1).max(20),
    members: z.array(z.object({ name: bi, designation: bi, photo: sitePath.optional() }).strict()).min(1).max(50),
    roles: z.array(z.object({ title: bi, icon: z.string().max(40), role: bi, responsibilities: z.array(bi).min(1) }).strict()),
    gallery: z
      .object({
        categories: z.array(z.object({ key: z.string().regex(/^[a-z0-9-]+$/).max(40), name: bi }).strict()).min(1),
        photos: z.array(z.object({ photo: sitePath, title: bi, categoryKey: z.string() }).strict()).min(1),
      })
      .strict(),
    schemes: z
      .array(
        z
          .object({
            level: z.enum(["CENTRAL", "STATE", "DISTRICT", "GRAM_PANCHAYAT"]),
            category: z.string().max(60).optional(),
            name: bi,
            description: bi,
            externalUrl: z.url().optional(),
            benefitValue: bi.optional(),
            /** Scheme logo; schemes have no picture field yet, so it is only registered in the media library. */
            logo: sitePath.optional(),
          })
          .strict(),
      )
      .max(100),
    events: z.array(z.object({ date: isoDay.optional(), title: bi, body: bi, location: bi.optional(), photo: sitePath.optional() }).strict()).max(100),
    campaigns: z.array(z.object({ title: bi, body: bi, photo: sitePath.optional() }).strict()).max(100),
    campaignName: bi.optional(),
    documents: z.array(z.object({ name: bi, file: sitePath.refine((p) => p.endsWith(".pdf"), "Documents must be PDFs") }).strict()).max(50),
    school: z.unknown().optional(),
    /** The Gram Panchayat logo (registered in the media library; the website logo setting is not changed). */
    logo: sitePath.optional(),
    /** Every site path used above → the URL it was copied from (provenance; the importer never downloads). */
    assets: z.record(sitePath, z.url()),
  })
  .strict()
  .superRefine((d, ctx) => {
    const keys = new Set(d.gallery.categories.map((c) => c.key));
    d.gallery.photos.forEach((p, i) => {
      if (!keys.has(p.categoryKey)) ctx.addIssue({ code: "custom", path: ["gallery", "photos", i, "categoryKey"], message: `Unknown category ${p.categoryKey}` });
    });
    for (const path of collectSitePaths(d)) {
      if (!(path in d.assets)) ctx.addIssue({ code: "custom", path: ["assets"], message: `No source listed for ${path}` });
    }
  });

export type GpDataset = z.infer<typeof gpDatasetSchema>;
type Bi = { en: string; mr: string };
type Obj = Record<string, unknown>;

/** Every site path a dataset references (pictures and documents), excluding the `assets` map itself. */
export function collectSitePaths(d: Omit<GpDataset, "assets"> & { assets?: unknown }): string[] {
  const out = new Set<string>();
  const walk = (v: unknown, key?: string) => {
    if (key === "assets") return;
    if (typeof v === "string" && isSiteAssetPath(v)) out.add(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(d);
  return [...out].sort();
}

/** A section to publish: where, and its data (already validated by `buildSections`). */
export interface BuiltSection {
  pageKey: PageKey;
  sectionKey: string;
  data: Obj;
}

export interface BuildResult {
  sections: BuiltSection[];
  /** Sections the dataset could fill but whose data did not pass the section schema (with the reason). */
  invalid: string[];
}

const join = (a: Bi, b: Bi, sep = ", "): Bi => ({ en: `${a.en}${sep}${b.en}`, mr: `${a.mr}${sep}${b.mr}` });
const lines = (...parts: (Bi | undefined)[]): Bi => {
  const ok = parts.filter((p): p is Bi => !!p);
  return { en: ok.map((p) => p.en).join("\n\n"), mr: ok.map((p) => p.mr).join("\n\n") };
};
/** Google Maps embed for a place query (allowed by `mapEmbedUrl`). */
export const mapEmbedFor = (query: string) => `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
const mapLinkFor = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const phoneDigits = (p: string) => p.replace(/[^+0-9]/g, "");
/** Fit a list into `max` entries without dropping text: repeatedly join the shortest neighbouring pair. */
function packList(items: Bi[], max: number): Bi[] {
  const out = [...items];
  const len = (b: Bi) => Math.max(b.en.length, b.mr.length);
  while (out.length > max) {
    let best = 0;
    for (let i = 1; i < out.length - 1; i++) if (len(out[i]!) + len(out[i + 1]!) < len(out[best]!) + len(out[best + 1]!)) best = i;
    out.splice(best, 2, { en: `${out[best]!.en} ${out[best + 1]!.en}`, mr: `${out[best]!.mr} ${out[best + 1]!.mr}` });
  }
  return out;
}

/**
 * Section data for a website from a dataset. `media` maps a site path to its media id; `current` returns the
 * website's live data for a section, so presentation settings the dataset has no value for (buttons, layout,
 * pictures beside a text) are kept. Each result is validated against the section's schema.
 */
export function buildSections(d: GpDataset, media: (path: string) => string, current: (pageKey: PageKey, sectionKey: string) => Obj | undefined): BuildResult {
  const v = d.village;
  const place = join(join(v.name, { en: `Ta. ${v.taluka.en}`, mr: `ता. ${v.taluka.mr}` }), { en: `Dist. ${v.district.en}`, mr: `जि. ${v.district.mr}` });
  const gpName: Bi = { en: `Gram Panchayat ${v.name.en}`, mr: `ग्रामपंचायत ${v.name.mr}` };
  const sarpanch = d.members.find((m) => /sarpanch/i.test(m.designation.en) && !/up/i.test(m.designation.en)) ?? d.members[0]!;
  const photo = (p?: string) => (p ? { photoId: media(p) } : {});
  const keep = (pageKey: PageKey, sectionKey: string) => ({ ...(current(pageKey, sectionKey) ?? {}) });

  const want: [PageKey, string, Obj][] = [];
  const add = (pageKey: PageKey, sectionKey: string, data: Obj) => want.push([pageKey, sectionKey, data]);

  // ---------------------------------------------------------------- Home
  add("home", "hero", { ...keep("home", "hero"), title: { en: `Welcome to ${gpName.en}`, mr: `${gpName.mr}मध्ये आपले स्वागत` }, subtitle: place });
  add("home", "welcome", { ...keep("home", "welcome"), heading: v.welcome, body: v.about });
  const img = v.images ?? {};
  const imageIf = (field: string, path?: string) => (path ? { [field]: media(path) } : {});
  // The Home banner (the hero at the top of the site) is the website's own design and is never changed by an import.
  add("home", "weather", { ...keep("home", "weather"), place: d.contact.weatherLocation, location: `${v.name.en}, ${v.state.en}` });
  if (d.events.length) {
    const shortDate = (iso?: string) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "");
    const whatsNew = keep("home", "whats-new");
    delete whatsNew.viewAll;
    add("home", "whats-new", {
      ...whatsNew,
      heading: { en: "Village events", mr: "गावातील कार्यक्रम" },
      items: d.events.slice(0, 12).map((e) => ({ title: e.title, date: shortDate(e.date), status: "Event", ...imageIf("imageId", e.photo) })),
    });
  }
  const progress = current("home", "village-progress");
  if (progress) add("home", "village-progress", { ...progress, subheading: { en: `Development indicators of ${v.name.en}`, mr: `${v.name.mr} गावाचे विकास निर्देशांक` } });
  const stats: Obj[] = [];
  if (v.population !== undefined) stats.push({ label: { en: "Population", mr: "गावाची लोकसंख्या" }, value: `${v.population.toLocaleString("en-IN")}+`, visible: true });
  if (v.villageProgrammes !== undefined) stats.push({ label: { en: "Village programmes", mr: "एकूण गाव कार्यक्रम" }, value: `${v.villageProgrammes}+`, visible: true });
  if (v.established !== undefined) stats.push({ label: { en: "Established", mr: "स्थापन वर्ष" }, value: String(v.established), visible: true });
  if (v.area) stats.push({ label: { en: "Area", mr: "क्षेत्रफळ" }, value: v.area, visible: true });
  stats.push({ label: { en: "Members", mr: "सदस्य" }, value: String(d.members.length), visible: true });
  stats.push({ label: { en: "Schemes", mr: "योजना" }, value: String(d.schemes.length), visible: true });
  add("home", "quick-stats", { ...keep("home", "quick-stats"), items: stats });
  add("home", "sarpanch-message", {
    ...keep("home", "sarpanch-message"),
    name: sarpanch.name,
    designation: join(sarpanch.designation, gpName),
    message: lines(v.thoughtOfTheDay, v.tagline),
    ...photo(sarpanch.photo),
  });
  add("home", "home-gallery", { ...keep("home", "home-gallery"), photos: d.gallery.photos.slice(0, 8).map((p) => ({ imageId: media(p.photo), caption: p.title })) });
  add("home", "achievements", {
    ...keep("home", "achievements"),
    heading: { en: "Special attractions", mr: "विशेष आकर्षणे" },
    items: d.attractions.slice(0, 10).map((a, i) => ({ title: a.title, description: a.description, completedOn: "", rank: i + 1 })),
  });
  const aboutCards = current("home", "about-cards");
  if (aboutCards) {
    const icons = (Array.isArray(aboutCards.items) ? (aboutCards.items as Obj[]) : []).map((i) => i.icon);
    add("home", "about-cards", {
      ...aboutCards,
      subheading: place,
      address: d.contact.address,
      items: d.attractions.slice(0, 4).map((a, i) => ({ icon: (icons[i] as string | undefined) ?? "award", title: a.title, description: a.description, buttonText: { en: "Read more", mr: "अधिक वाचा" } })),
    });
  }

  // ---------------------------------------------------------------- About
  const aboutBanner = current("about", "banner");
  if (aboutBanner) {
    add("about", "banner", { ...aboutBanner, heading: { en: `About ${v.name.en}`, mr: `${v.name.mr} विषयी` }, supportingText: place, description: v.tagline, ...imageIf("imageId", img.village2) });
  }
  add("about", "overview", { ...keep("about", "overview"), heading: { en: `About ${v.name.en}`, mr: `${v.name.mr} विषयी` }, body: v.about, ...imageIf("imageId", img.about1) });
  add("about", "history", {
    ...keep("about", "history"),
    heading: { en: "History of the Gram Panchayat", mr: "ग्रामपंचायतीचा इतिहास" },
    body: v.history,
    ...imageIf("mainImageId", img.village1),
    ...imageIf("secondImageId", img.about2),
  });
  const geography: Obj = { ...keep("about", "geography") };
  // The source gives no unit for the area and no household count: do not carry over the old website's figures.
  delete geography.areaSqKm;
  delete geography.households;
  delete geography.wards;
  add("about", "geography", {
    ...geography,
    pinCode: v.pinCode,
    ...(v.population !== undefined ? { population: v.population } : {}),
    ...(v.nearestCity ? { nearestCity: v.nearestCity } : {}),
    description: lines(v.location, ...v.transport.map((t) => join(t.label, t.value, ": "))),
  });
  add("about", "members", {
    heading: { en: "Honourable members of the Gram Panchayat", mr: "ग्रामपंचायतीचे माननीय सदस्य" },
    items: d.members.map((m) => ({ name: m.name, designation: m.designation, ...photo(m.photo) })),
  });
  add("about", "office", {
    address: d.contact.address,
    hours: d.contact.hours,
    phone: phoneDigits(d.contact.phone),
    email: d.contact.email,
    mapUrl: mapLinkFor(d.contact.mapQuery),
  });
  add("about", "leaders-profile-grid", {
    ...keep("about", "leaders-profile-grid"),
    heading: { en: "Hon. ministers and officials", mr: "माननीय मंत्री व पदाधिकारी" },
    items: d.leaders.map((l) => ({ name: l.name, designation: l.designation, ...(l.bio ? { bio: l.bio } : {}), ...photo(l.photo) })),
  });
  add("about", "roles-cards", {
    ...keep("about", "roles-cards"),
    heading: { en: "Responsibilities and roles", mr: "जबाबदारी आणि भूमिका" },
    items: d.roles.map((r) => ({ icon: r.icon, title: r.title, responsibilities: packList(r.responsibilities, 6) })),
  });
  const vm = current("about", "vision-mission");
  if (vm) {
    const vision = (vm.vision ?? {}) as Obj;
    add("about", "vision-mission", { ...vm, vision: { ...vision, title: { en: "Our vision", mr: "आमचे ध्येय" }, body: v.tagline }, ...imageIf("imageId", img.visionMission) });
  }

  // ---------------------------------------------------------------- Gallery
  add("gallery", "photo-gallery", {
    ...keep("gallery", "photo-gallery"),
    categories: d.gallery.categories.map((c, i) => ({ key: c.key, name: c.name, order: i + 1 })),
    photos: d.gallery.photos.map((p, i) => ({ imageId: media(p.photo), title: p.title, categoryKey: p.categoryKey, order: i + 1 })),
  });

  // ---------------------------------------------------------------- Contact
  add("contact", "contact-cards", {
    ...keep("contact", "contact-cards"),
    items: [
      { title: { en: "General inquiries", mr: "सामान्य चौकशी" }, details: { en: `${d.contact.phone}\n${d.contact.email}`, mr: `${d.contact.phone}\n${d.contact.email}` }, socialLinks: [] },
      { title: { en: "Office address", mr: "कार्यालयाचा पत्ता" }, details: d.contact.address, socialLinks: [] },
      { title: { en: "Office hours", mr: "कार्यालयीन वेळ" }, details: d.contact.hours, socialLinks: [] },
    ],
  });
  add("contact", "office-location", {
    title: { en: "Our office location", mr: "आमच्या कार्यालयाचा पत्ता" },
    ...keep("contact", "office-location"),
    address: d.contact.address,
    mapEmbedUrl: mapEmbedFor(d.contact.mapQuery),
  });

  // ---------------------------------------------------------------- Announcements: government orders (PDF)
  if (d.documents.length) {
    add("announcements", "download-forms", {
      ...keep("announcements", "download-forms"),
      items: d.documents.map((doc) => ({ icon: "file", name: doc.name, description: { en: "Government resolution (PDF)", mr: "शासन निर्णय (PDF)" }, fileId: media(doc.file) })),
    });
  }

  const sections: BuiltSection[] = [];
  const invalid: string[] = [];
  for (const [pageKey, sectionKey, data] of want) {
    const def = findSection(pageKey, sectionKey);
    if (!def) {
      invalid.push(`${pageKey}/${sectionKey}: no such section`);
      continue;
    }
    const r = def.schema.safeParse(data);
    if (r.success) sections.push({ pageKey, sectionKey, data: r.data as Obj });
    else invalid.push(`${pageKey}/${sectionKey}: ${r.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  return { sections, invalid };
}
