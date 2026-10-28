/**
 * PLACEHOLDER CONTENT — taken from the Figma "2. About us" page (file qBVt7yv0KG41onObVWfnP1).
 * Used only where the backend has no published section for the key (see ./fallback.ts); delete this
 * file and its FALLBACK_SECTIONS entry once the Gram Panchayat's real content is loaded.
 * Strings are English only; Marathi falls back to English through pickText().
 */
import type { FallbackSection } from "./fallback";
import { FIGMA_HOME_SECTIONS } from "./figma-home";

const t = (en: string) => ({ en });
const ADDRESS = "Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501";
const HOURS = "Monday to Friday: 9:45 am to 6:15 pm\nWeekends and Sundays: Closed";

const leaders = FIGMA_HOME_SECTIONS.find((s) => s.sectionKey === "leaders");

export const FIGMA_ABOUT_SECTIONS: FallbackSection[] = [
  {
    sectionKey: "about-hero",
    sortOrder: 0,
    skipIfPresent: ["overview"],
    data: {
      eyebrow: t("About the Gram Panchayat"),
      title: t("People-led governance for a sustainable"),
      body: t(
        "Gram Panchayat Savardari works for transparent administration, essential services, village development, and citizen welfare while protecting the natural character and heritage of the village",
      ),
      primary: { label: t("Know Our Leaders"), href: "page:about" },
      secondary: { label: t("Emergency Contacts"), href: "page:contact" },
    },
  },
  {
    sectionKey: "about-history",
    sortOrder: 10,
    skipIfPresent: ["history"],
    data: {
      eyebrow: t("Village History"),
      heading: t("Rooted in agriculture, strengthened by the industry."),
      body: t(
        "Savadari has grown from a close-knit farming settlement into a progressive village connected with education, industry, and improved public services. The village continues to value its traditional culture, temples, water resources, and community gatherings while steadily investing in roads, sanitation, digital literacy, and transparent service delivery. With the participation of Gram Sabha members, local committees, self-help groups, farmers, youth, and senior citizens, the Panchayat works to balance development with the village's environmental and social heritage.",
      ),
      cards: [
        { title: t("Official working hours:"), body: t("Monday to Friday: 9:45 am to 6:15 pm\nWeekends and Sundays: Closed") },
        { title: t("Contact Information:"), body: t("Phone number: +919767694340\nEmail id: savardarigrampanchayat@gmail.com") },
      ],
      address: t(ADDRESS),
    },
  },
  {
    sectionKey: "about-structure",
    sortOrder: 20,
    skipIfPresent: ["members", "office"],
    data: {
      eyebrow: t("Panchayat Structure"),
      heading: t("Local Administration"),
      members: [
        { role: t("Sarpanch"), title: t("Head of the Gram Panchayat"), body: t("Leads elected governance, chairs meetings, and represents the village"), accent: "#ff9933" },
        { role: t("Deputy Sarpanch"), title: t("Administrative Support"), body: t("Supports the Sarpanch and coordinates implementation priorities") },
        { role: t("Members"), title: t("Ward Respresntatives"), body: t("Raise local issues, monitor works, and assist residents with services") },
        { role: t("Gram Sevak"), title: t("Secretary and records"), body: t("Leads elected governance, chairs meetings, and represents the village") },
      ],
      office: {
        eyebrow: t("Office Infomation"),
        heading: t("Visit the office"),
        addressLabel: t("Address"),
        address: t(ADDRESS),
        hoursLabel: t("Working Hours"),
        hours: t(HOURS),
        phoneLabel: t("Phone"),
        phone: "+919767694340",
        emailLabel: t("Email"),
        email: "savardarigrampanchayat@gmail.com",
      },
    },
  },
  {
    sectionKey: "about-roles",
    sortOrder: 30,
    data: {
      eyebrow: t("Roles & Responsibilitis"),
      heading: t("What Panchayat officials do"),
      items: [
        { title: t("Village Development"), body: t("Plan and monitor road, water supply, drainage, sanitation lighting, and public assets") },
        { title: t("Citizen Services"), body: t("Support certificates, tax records, complaints, birth and death records, and scheme applications") },
        { title: t("Financial Discipline"), body: t("Prepare budgets, maintain accounts, collect taxes, and place key decisions before the Gram Sabha") },
        { title: t("Public Welfare"), body: t("Coordinate health, education, women and child welfare, social justice, and emergency response.") },
        { title: t("Environment"), body: t("Protect trees, water bodies, cleanliness drives, waste management, and climate-ready local planning") },
        { title: t("Transperancy"), body: t("Publish notices, resolution, tenders, beneficiary lists, and development updates for residents") },
      ],
    },
  },
  {
    sectionKey: "about-emergency",
    sortOrder: 40,
    data: {
      eyebrow: t("Important Contact Numbers"),
      heading: t("Emergency and Public Support"),
      items: [
        { label: t("Total emergency services"), numbers: ["112"] },
        { label: t("Ambulance"), numbers: ["108"] },
        { label: t("Fire Service"), numbers: ["101"] },
        { label: t("Government health advice"), numbers: ["104"] },
        { label: t("Disaster Management Room"), numbers: ["1077"] },
        { label: t("MSEDCL — Electricity Complaint"), numbers: ["1912"] },
        { label: t("MSEDCL (Toll Free)"), numbers: ["1800-233-3435"] },
        { label: t("Forest Department — Hello Forest"), numbers: ["1926"] },
        { label: t("State Emergency Operations Centre"), numbers: ["+91 - 9321587143"] },
        { label: t("Women's Aid"), numbers: ["1091", "181"] },
      ],
    },
  },
  {
    sectionKey: "about-vision",
    sortOrder: 50,
    data: {
      visionLabel: t("VISION"),
      vision: t("A clean, connected, self-reliant village"),
      visionBody: t("To make Savardari a self-reliant, digitally empowered, and prosperous model village in Maharashtra by 2030, ensuring quality of life for every citizen."),
      missionLabel: t("MISSION"),
      mission: t(
        "To deliver transparent, efficient, and citizen-centric governance; ensure universal access to basic amenities; promote sustainable development; and empower all communities including women and marginalized groups.",
      ),
      valuesLabel: t("CORE VALUES"),
      values: [t("Transparency and accountability"), t("Cleanliness and public health"), t("Equal access to services"), t("Respect for culture and environment")],
    },
  },
  ...(leaders ? [{ ...leaders, sortOrder: 60 }] : []),
];
