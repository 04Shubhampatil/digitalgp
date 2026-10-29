import type { PageKey } from "@/config/pages";
import type { FieldSpec, GroupSpec, ItemsSpec, SectionEditorSpec } from "@/config/section-editors";

/**
 * Editor specs for every page except Home and About: one spec per section registered in
 * src/config/sections-pages.ts. Field names, nesting, required fields and limits mirror those zod
 * schemas exactly (the backend validates every draft; these only describe the inputs).
 */

// ---------------------------------------------------------------- field helpers
const bi = (name: string, labelKey: string, x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "bilingual", labelKey, max: 200, ...x });
const bl = (name: string, labelKey: string, x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "bilingualLong", labelKey, max: 20_000, ...x });
const txt = (name: string, labelKey: string, max = 200, x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "text", labelKey, max, ...x });
const int = (name: string, labelKey: string, x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "integer", labelKey, ...x });
const num = (name: string, labelKey: string, x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "number", labelKey, ...x });
const link = (name: string, labelKey = "link", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "href", labelKey, ...x });
const mail = (name: string, labelKey = "email", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "email", labelKey, ...x });
const tel = (name: string, labelKey = "phone", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "phone", labelKey, ...x });
const icon = (name = "icon", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "text", labelKey: "iconName", max: 40, placeholder: "users", ...x });
const img = (name: string, labelKey = "image", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "image", labelKey, ...x });
const file = (name: string, labelKey = "file", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "file", labelKey, ...x });
const imgs = (name: string, labelKey: string, max: number, x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "imageList", labelKey, max, ...x });
const on = (name: string, labelKey: string, x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "boolean", labelKey, ...x });
const sel = (name: string, labelKey: string, options: readonly string[], x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "select", labelKey, options, ...x });
const colour = (name: string, labelKey = "colour", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "colour", labelKey, ...x });
const date = (name: string, labelKey = "date", x: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "date", labelKey, ...x });
const list = (name: string, labelKey: string, max: number, fields: FieldSpec[], x: Partial<ItemsSpec> = {}): ItemsSpec => ({ name, labelKey, min: 0, max, fields, ...x });
const bullets = (name: string, labelKey: string, max: number): FieldSpec => ({ name, type: "bilingualList", labelKey, max });
const group = (name: string, labelKey: string, fields: FieldSpec[], x: Partial<GroupSpec> = {}): GroupSpec => ({ name, labelKey, fields, ...x });
const section = (key: string, labelKey: string, x: Partial<SectionEditorSpec>): SectionEditorSpec => ({ key, labelKey, fields: [], ...x });

// ---------------------------------------------------------------- shared sections
/** Figma "Banner": layout, content, CTA buttons, image, text position, overlay, appearance. */
const banner = section("banner", "banner", {
  descriptionKey: "bannerDesc",
  fields: [
    sel("layout", "bannerLayout", ["full-background", "image-right", "image-left", "framed-image"], { required: true, segmented: true, wide: true }),
    bi("heading", "bannerHeading"),
    bi("supportingText", "supportingText"),
    bl("description", "description", { max: 2000 }),
    img("imageId", "bannerImage"),
  ],
  groups: [
    group("textPosition", "textPosition", [sel("horizontal", "horizontalPosition", ["left", "center", "right"], { required: true, segmented: true }), sel("vertical", "verticalAlignment", ["top", "middle", "bottom"], { required: true, segmented: true, default: "middle" })], { optional: true }),
    group(
      "overlay",
      "overlay",
      [
        on("enabled", "overlayEnabled"),
        colour("colour", "overlayColour", { required: true, default: "#102E1D" }),
        int("intensity", "overlayIntensity", { required: true, default: 40 }),
        sel("gradient", "gradientDirection", ["left-right", "right-left", "top-bottom", "none"], { required: true }),
      ],
      { optional: true },
    ),
    group(
      "appearance",
      "bannerAppearance",
      [
        int("height", "bannerHeight", { required: true, default: 520 }),
        sel("contentWidth", "contentWidth", ["small", "medium", "large"], { required: true, default: "medium" }),
        int("cornerRadius", "cornerRadius", { required: true, default: 12 }),
        colour("textColour", "textColour", { required: true, default: "#FFFFFF" }),
      ],
      { optional: true },
    ),
  ],
  items: list("ctas", "cta", 2, [bi("label", "buttonLabel", { required: true }), sel("linkType", "linkType", ["page", "external"], { required: true }), link("href", "link", { required: true }), on("openInNewTab", "openInNewTab")]),
});

const topStats = section("top-stats", "topStats", {
  items: list("items", "topStat", 8, [icon(), bi("title", "title", { required: true }), txt("value", "value", 40, { required: true }), bi("unit", "unit"), bi("description", "description"), colour("background", "backgroundColour"), on("visible", "visible", { default: true })]),
});

const supportCards = (key: string, labelKey: string) =>
  section(key, labelKey, {
    items: list("items", "supportCard", 12, [icon(), bi("title", "title", { required: true }), bi("description", "description"), txt("contactOrAction", "contactOrAction", 300), on("visible", "visible", { default: true })]),
  });

const successStories = section("success-stories", "successStories", {
  items: list("items", "story", 30, [img("imageId"), bi("title", "title", { required: true }), bi("description", "description"), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink"), int("order", "displayOrder", { required: true, default: 0 })]),
});

const trainingPrograms = section("training-programs", "trainingPrograms", {
  items: list("items", "program", 50, [
    img("thumbnailImageId", "thumbnail"),
    bi("title", "title", { required: true }),
    bi("shortDescription", "shortDescription"),
    bi("ctaText", "buttonText"),
    link("ctaLink", "buttonLink"),
    int("order", "displayOrder", { required: true, default: 0 }),
    sel("status", "status", ["active", "inactive"], { required: true }),
    on("featured", "featured"),
  ]),
});

const iconCardList = (key: string, labelKey: string, itemKey: string, max: number) =>
  section(key, labelKey, { items: list("items", itemKey, max, [icon(), bi("title", "title", { required: true }), link("link"), on("active", "active", { default: true })]) });

const supportCardBlock = (name: string, labelKey: string) =>
  group(name, labelKey, [on("enabled", "enabled", { default: true }), icon(), bi("title", "title", { required: true }), bi("description", "description"), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink")], { optional: true });

// ---------------------------------------------------------------- Village Infrastructure
const infrastructure: SectionEditorSpec[] = [
  banner,
  topStats,
  section("infra-map", "infraMap", {
    fields: [
      int("zoom", "zoom", { required: true, default: 13 }),
      sel("mapType", "mapType", ["satellite", "roadmap"], { required: true }),
      on("showZoomControls", "showZoomControls", { default: true }),
      on("showLegend", "showLegend", { default: true }),
      on("enableWardClick", "enableWardClick", { default: true }),
      on("showWardBoundary", "showWardBoundary", { default: true }),
      on("fullscreenControl", "fullscreenControl", { default: true }),
      int("height", "mapHeight", { required: true, default: 500 }),
      img("mapImageId", "mapImage"),
    ],
    items: list("markers", "marker", 100, [bi("title", "title", { required: true }), num("lat", "latitude", { required: true }), num("lng", "longitude", { required: true }), icon(), txt("ward", "wardNo", 40)]),
  }),
  section("map-filters", "mapFilters", { items: list("items", "filter", 20, [icon(), bi("name", "name", { required: true }), colour("colour", "colour", { required: true }), on("visible", "visible", { default: true })]) }),
  section("status-cards", "statusCards", {
    items: list("items", "statusCard", 12, [
      icon(),
      bi("title", "title", { required: true }),
      bi("smallLabel", "smallLabel"),
      txt("primaryValue", "primaryValue", 60, { required: true }),
      bi("statusText", "statusText"),
      bi("bottomLabel", "bottomLabel"),
      txt("bottomValue", "bottomValue", 60),
      bi("buttonText", "buttonText"),
      link("buttonLink", "buttonLink"),
      sel("theme", "theme", ["blue", "orange", "green"], { required: true }),
    ]),
  }),
  ...["latest-announcements", "upcoming-events"].map((key) =>
    section(key, key === "latest-announcements" ? "latestAnnouncements" : "upcomingEvents", {
      fields: [on("enabled", "enabled", { default: true }), bi("heading", "heading", { required: true }), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink")],
      items: list("items", "entry", 10, [icon(), bi("title", "title", { required: true }), txt("date", "dateText", 60, { required: true })]),
    }),
  ),
];

// ---------------------------------------------------------------- Finance & Budget
const finance: SectionEditorSpec[] = [
  banner,
  topStats,
  section("income-sources", "incomeSources", {
    fields: [on("enabled", "enabled", { default: true }), bi("heading", "heading", { required: true }), bi("subtitle", "subtitle")],
    groups: [supportCardBlock("supportCard", "supportCardBlock")],
    items: list("categories", "category", 20, [bi("name", "name", { required: true }), txt("amount", "amount", 15, { required: true, placeholder: "12500.00" }), num("percentage", "percentage", { required: true })]),
  }),
  section("expenditure", "expenditure", {
    fields: [bi("heading", "heading", { required: true }), bi("subtitle", "subtitle"), colour("backgroundColour", "backgroundColour", { required: true, default: "#FFFFFF" })],
    groups: [supportCardBlock("sideCard", "sideCardBlock")],
    items: list("categories", "category", 20, [bi("name", "name", { required: true }), txt("amount", "amount", 15, { required: true, placeholder: "12500.00" }), num("percentage", "percentage", { required: true }), colour("colour", "colour", { required: true })]),
  }),
  section("budget-visualizer", "budgetVisualizer", {
    fields: [on("enabled", "enabled", { default: true }), bi("heading", "heading", { required: true }), bi("subtitle", "subtitle"), colour("backgroundColour", "backgroundColour", { required: true, default: "#FFFFFF" })],
    groups: [
      group("overviewCard", "overviewCard", [bi("title", "title", { required: true })], {
        lists: [list("fields", "overviewField", 10, [bi("label", "label", { required: true }), sel("valueType", "valueType", ["dynamic", "auto"], { required: true }), txt("prefixSuffix", "prefixSuffix", 20), colour("colour", "colour", { required: true })])],
      }),
      group("downloadReport", "downloadReport", [on("enabled", "enabled", { default: true }), bi("buttonText", "buttonText", { required: true }), file("fileId", "reportFile"), icon("icon", { required: true, default: "download" })]),
    ],
    items: list("tabs", "tab", 10, [bi("name", "name", { required: true }), on("enabled", "enabled", { default: true })]),
    lists: [list("barChart", "barValue", 24, [bi("label", "label", { required: true }), txt("value", "value", 15, { required: true, placeholder: "72" }), colour("colour", "colour", { required: true })])],
  }),
  section("documents", "documents", {
    fields: [bi("heading", "heading", { required: true }), bi("subtitle", "subtitle"), bi("description", "description"), colour("backgroundColour", "backgroundColour", { required: true, default: "#FFFFFF" })],
    items: list("items", "document", 50, [bi("title", "title", { required: true }), file("fileId", "pdfFile", { required: true }), bi("buttonText", "buttonText")]),
  }),
];

// ---------------------------------------------------------------- Citizen Services & Form
const services: SectionEditorSpec[] = [
  banner,
  section("service-links", "serviceLinks", { items: list("items", "serviceLink", 30, [icon(), bi("title", "title", { required: true }), bi("description", "description"), link("href", "link", { required: true }), on("visible", "visible", { default: true })]) }),
  section("service-categories", "serviceCategories", {
    items: list("items", "serviceCategory", 12, [icon(), bi("title", "title", { required: true }), bi("description", "description"), bullets("features", "features", 4), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink"), colour("accentColour", "accentColour", { required: true })]),
  }),
  section("qr-codes", "qrCodes", {
    items: list("items", "qrCode", 12, [bi("title", "title", { required: true }), bi("description", "description"), icon("serviceIcon", { labelKey: "serviceIcon", required: true }), bi("buttonText", "buttonText"), link("linkUrl", "linkUrl", { required: true })]),
  }),
  { ...topStats },
  section("help", "help", {
    fields: [bi("heading", "heading", { required: true }), bi("subtitle", "subtitle"), img("imageId", "illustration")],
    items: list("contact", "contactEntry", 10, [tel("phone"), mail("email"), txt("hours", "hours", 120)]),
    lists: [list("faqs", "faq", 30, [bi("question", "question", { required: true }), bl("answer", "answer", { required: true })])],
  }),
];

// ---------------------------------------------------------------- Grievance & Feedback
const grievance: SectionEditorSpec[] = [
  banner,
  section("complaint-form", "complaintForm", {
    fields: [
      bi("heading", "formHeading", { required: true }),
      bi("description", "description"),
      bi("successMessage", "successMessage", { required: true }),
      bi("submitButtonText", "submitButtonText", { required: true }),
      mail("recipientEmail", "recipientEmail", { required: true }),
      on("captchaEnabled", "captchaEnabled", { default: true }),
      on("allowFileUpload", "allowFileUpload"),
      int("maxFileSizeMb", "maxFileSizeMb", { required: true, default: 5 }),
      { name: "allowedFileTypes", type: "multiSelect", labelKey: "allowedFileTypes", options: ["pdf", "jpg", "jpeg", "png", "webp"], max: 5 },
    ],
  }),
  supportCards("support-cards", "supportCards"),
  section("track-complaint", "trackComplaint", {
    fields: [
      bi("heading", "heading", { required: true }),
      bi("description", "description"),
      bi("searchLabel", "searchLabel", { required: true }),
      bi("placeholder", "placeholder"),
      bi("buttonText", "buttonText", { required: true }),
      bi("noResultMessage", "noResultMessage", { required: true }),
      bi("errorMessage", "errorMessage", { required: true }),
    ],
  }),
  section("escalation-matrix", "escalationMatrix", {
    items: list("steps", "step", 10, [bi("title", "title", { required: true }), bi("description", "description")]),
    lists: [list("statusSummary", "statusItem", 10, [bi("label", "label", { required: true }), colour("colour", "colour", { required: true })])],
  }),
  section("monthly-report", "monthlyReport", {
    descriptionKey: "monthlyReportDesc",
    fields: [bi("heading", "heading", { required: true })],
    groups: [
      group("cardLabels", "cardLabels", [bi("total", "totalComplaints", { required: true }), bi("resolved", "resolvedComplaints", { required: true }), bi("pending", "pendingComplaints", { required: true }), bi("resolutionRate", "resolutionRate", { required: true })]),
    ],
    items: list("categoryColours", "categoryColour", 12, [txt("category", "category", 60, { required: true }), colour("colour", "colour", { required: true })]),
  }),
];

// ---------------------------------------------------------------- Our Village — Culture
const culture: SectionEditorSpec[] = [
  banner,
  section("village-intro", "villageIntro", { fields: [img("iconId", "sectionIcon"), bi("title", "title", { required: true }), bi("description", "description"), bi("buttonLabel", "buttonLabel"), link("buttonLink", "buttonLink")] }),
  section("heritage-cards", "heritageCards", { items: list("items", "heritageCard", 20, [bi("title", "title", { required: true }), bi("description", "description"), img("imageId")]) }),
  section("culture-cards", "cultureCards", { fields: [on("enabled", "enabled", { default: true })], items: list("items", "cultureCard", 12, [bi("title", "title", { required: true }), bi("description", "description"), img("imageId")]) }),
  section("homestay", "homestay", {
    fields: [bi("heading", "heading", { required: true }), bi("description", "description"), bi("buttonLabel", "buttonLabel"), link("buttonLink", "buttonLink"), img("imageId")],
    items: list("features", "feature", 8, [icon(), bi("title", "title", { required: true })]),
  }),
  trainingPrograms,
  section("leader-cards", "leaderCards", { items: list("items", "leader", 20, [img("photoId", "photo"), bi("name", "name", { required: true }), bi("designation", "designation"), bi("description", "description")]) }),
  section("fpo-gallery-voice", "fpoGalleryVoice", {
    fields: [on("enabled", "enabled", { default: true })],
    groups: [
      group("fpo", "fpo", [img("iconId", "sectionIcon"), bi("title", "title", { required: true }), bi("description", "description"), bullets("points", "points", 10)]),
      group("gallery", "virtualGallery", [bi("title", "title", { required: true }), bi("description", "description"), imgs("imageIds", "galleryImages", 30)]),
      group("voice", "voiceOfVillage", [bi("title", "title", { required: true }), bi("description", "description"), file("videoId", "videoFile"), txt("videoUrl", "videoUrl", 2000, { placeholder: "https://www.youtube.com/watch?v=…" })]),
    ],
  }),
  successStories,
];

// ---------------------------------------------------------------- Employment & Skills
const employment: SectionEditorSpec[] = [
  banner,
  supportCards("support-cards", "supportCards"),
  supportCards("local-opportunities", "localOpportunities"),
  section("skill-directory", "skillDirectory", {
    items: list("items", "skill", 30, [icon(), bi("skillName", "skillName", { required: true }), int("availableCount", "availableCount"), on("countIsApproximate", "countIsApproximate", { default: true }), link("link"), on("active", "active", { default: true })]),
  }),
  iconCardList("assistance-items", "assistanceItems", "assistanceItem", 30),
  trainingPrograms,
  section("job-portals", "jobPortals", {
    items: list("items", "portal", 30, [img("logoId", "logo"), bi("name", "name", { required: true }), bi("description", "description"), link("websiteUrl", "websiteUrl", { required: true, placeholder: "https://" }), int("order", "displayOrder", { required: true, default: 0 }), on("active", "active", { default: true })]),
  }),
  successStories,
];

// ---------------------------------------------------------------- Education & Youth
const education: SectionEditorSpec[] = [
  banner,
  supportCards("support-cards", "supportCards"),
  section("student-spotlight", "studentSpotlight", {
    descriptionKey: "studentSpotlightDesc",
    fields: [img("photoId", "studentPhoto"), bi("name", "studentName", { required: true }), bi("classAndSchool", "classAndSchool"), bl("achievements", "achievements"), bi("quote", "quote"), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink")],
    groups: [group("guardianConsent", "guardianConsent", [on("confirmed", "guardianConfirmed"), txt("confirmedBy", "confirmedBy", 120, { required: true }), { name: "confirmedAt", type: "datetime", labelKey: "confirmedAt", required: true }], { optional: true })],
    items: list("achievementCards", "achievementCard", 6, [icon(), bi("title", "title", { required: true }), txt("value", "value", 40, { required: true })]),
  }),
  section("youth-speak-tabs", "youthSpeakTabs", { items: list("items", "tab", 10, [txt("tabKey", "tabKey", 40, { required: true }), bi("name", "name", { required: true }), on("active", "active", { default: true })]) }),
  section("youth-posts", "youthPosts", {
    items: list("items", "post", 300, [txt("tabKey", "tabKey", 40, { required: true }), sel("type", "postType", ["blog", "youtube", "reel", "idea"], { required: true }), bi("title", "title", { required: true }), img("coverImageId", "coverImage"), link("url", "postUrl")]),
  }),
  section("scheme-cards", "schemeCards", { items: list("items", "schemeCard", 30, [icon(), bi("title", "title", { required: true }), bi("description", "description"), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink"), on("active", "active", { default: true })]) }),
  successStories,
];

// ---------------------------------------------------------------- Environment & Sustainability
const environment: SectionEditorSpec[] = [
  banner,
  topStats,
  section("green-scoreboard", "greenScoreboard", { items: list("items", "scoreItem", 12, [icon(), bi("title", "title", { required: true }), txt("value", "value", 40, { required: true }), bi("description", "description"), on("visible", "visible", { default: true })]) }),
  section("tree-adoption", "treeAdoption", {
    fields: [on("enabled", "enabled", { default: true }), bi("title", "title", { required: true }), bi("description", "description"), bullets("bullets", "bulletPoints", 8), img("illustrationId", "illustration"), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink")],
    items: list("stats", "stat", 6, [icon(), bi("title", "title", { required: true }), txt("value", "value", 40, { required: true }), bi("subText", "subText")]),
  }),
  section("sustainability-initiatives", "sustainabilityInitiatives", { items: list("items", "initiative", 30, [img("imageId"), bi("title", "title", { required: true }), bi("description", "description"), on("active", "active", { default: true })]) }),
  section("market-prices", "marketPrices", {
    descriptionKey: "marketPricesDesc",
    fields: [bi("title", "title", { required: true }), { name: "lastUpdatedAt", type: "datetime", labelKey: "lastUpdatedAt", required: true }, bi("marketName", "marketName"), txt("currency", "currency", 10, { required: true, default: "INR" }), bi("note", "note"), bi("buttonText", "buttonText"), link("buttonLink", "buttonLink")],
    items: list("rows", "priceRow", 50, [bi("commodity", "commodity", { required: true }), txt("unit", "unit", 20, { required: true }), num("minPrice", "minPrice", { required: true }), num("maxPrice", "maxPrice", { required: true }), num("modalPrice", "modalPrice", { required: true })]),
  }),
  section("weather-update", "weatherUpdate", {
    descriptionKey: "weatherUpdateDesc",
    fields: [bi("title", "title", { required: true }), bi("location", "location")],
    groups: [group("current", "currentWeather", [txt("temperature", "temperature", 20, { required: true }), txt("humidity", "humidity", 20, { required: true }), txt("wind", "wind", 40, { required: true }), txt("feelsLike", "feelsLike", 20, { required: true }), bi("condition", "condition", { required: true })])],
    items: list("forecast", "forecastDay", 10, [date("date", "date", { required: true }), icon(), txt("maxTemp", "maxTemp", 20, { required: true }), txt("minTemp", "minTemp", 20, { required: true })]),
  }),
];

// ---------------------------------------------------------------- Announcements & Circulars
const announcements: SectionEditorSpec[] = [
  banner,
  topStats,
  section("announcement-categories", "announcementCategories", { items: list("items", "categoryTile", 12, [bi("label", "label", { required: true }), icon()]) }),
  section("calendar", "calendar", {
    fields: [bi("title", "title", { required: true }), sel("defaultMonthView", "defaultMonthView", ["current", "custom"], { required: true }), { name: "defaultMonth", type: "month", labelKey: "defaultMonth" }, int("eventsToShow", "eventsToShow", { required: true, default: 5 }), on("visible", "visible", { default: true })],
    items: list("events", "event", 100, [date("date", "date", { required: true }), bi("title", "title", { required: true }), colour("colour", "colour", { required: true, default: "#135130" }), { name: "startTime", type: "time", labelKey: "startTime" }, { name: "endTime", type: "time", labelKey: "endTime" }]),
  }),
  section("deadline-cards", "deadlineCards", { items: list("items", "deadline", 20, [icon(), txt("date", "dateText", 60, { required: true }), bi("title", "title", { required: true }), bi("subtitle", "subtitle")]) }),
  section("download-forms", "downloadForms", { items: list("items", "form", 50, [icon(), bi("name", "name", { required: true }), bi("description", "description"), file("fileId", "pdfFile", { required: true })]) }),
  supportCards("support-cards", "supportCards"),
];

// ---------------------------------------------------------------- Gallery & Media
const gallery: SectionEditorSpec[] = [
  banner,
  section("photo-gallery", "photoGallery", {
    items: list("categories", "galleryCategory", 20, [txt("key", "categoryKey", 40, { required: true }), bi("name", "name", { required: true }), int("order", "displayOrder", { required: true, default: 0 })]),
    lists: [list("photos", "photo", 500, [img("imageId", "image", { required: true }), bi("title", "title"), txt("categoryKey", "categoryKey", 40, { required: true }), date("date"), int("order", "displayOrder", { required: true, default: 0 })])],
  }),
  section("video-gallery", "videoGallery", {
    items: list("items", "video", 100, [img("thumbnailId", "thumbnail"), bi("title", "title", { required: true }), link("videoUrl", "videoUrl", { required: true, placeholder: "https://www.youtube.com/watch?v=…" }), date("date"), txt("duration", "duration", 20, { placeholder: "02:34" }), int("order", "displayOrder", { required: true, default: 0 })]),
  }),
  section("press-coverage", "pressCoverage", {
    items: list("items", "pressItem", 50, [img("logoId", "logo"), txt("mediaName", "mediaName", 120, { required: true }), bi("title", "title", { required: true }), date("date", "date", { required: true }), link("url", "articleUrl", { required: true, placeholder: "https://" }), int("order", "displayOrder", { required: true, default: 0 })]),
  }),
  section("then-and-now", "thenAndNow", {
    fields: [bi("heading", "heading", { required: true }), on("autoPlay", "autoPlay", { default: true }), int("transitionMs", "transitionMs", { required: true, default: 3000 })],
    items: list("comparisons", "comparison", 20, [img("beforeImageId", "beforeImage", { required: true }), img("afterImageId", "afterImage", { required: true }), bi("heading", "heading", { required: true }), int("order", "displayOrder", { required: true, default: 0 })]),
  }),
  section("mini-documentary", "miniDocumentary", {
    fields: [
      bi("heading", "heading", { required: true }),
      bi("title", "title", { required: true }),
      bi("description", "description"),
      sel("source", "videoSource", ["upload", "link"], { required: true, segmented: true }),
      file("videoId", "videoFile"),
      link("videoUrl", "videoUrl", { placeholder: "https://www.youtube.com/watch?v=…" }),
      date("publishedDate", "publishedDate", { required: true }),
      on("autoThumbnail", "autoThumbnail", { default: true }),
    ],
    groups: [group("playback", "playback", [on("autoplay", "autoplay"), on("controls", "controls", { default: true }), on("muted", "muted"), on("loop", "loop")])],
  }),
];

// ---------------------------------------------------------------- Contact & Collaboration
const contact: SectionEditorSpec[] = [
  banner,
  section("contact-cards", "contactCards", {
    items: list("items", "contactCard", 12, [img("iconId", "sectionIcon"), bi("title", "title", { required: true }), bi("details", "details")], {
      children: list("socialLinks", "socialLink", 6, [txt("label", "label", 40, { required: true }), link("url", "url", { required: true, placeholder: "https://" })]),
    }),
  }),
  section("office-location", "officeLocation", { fields: [bi("title", "title", { required: true }), bi("address", "address"), txt("mapEmbedUrl", "mapEmbedUrl", 2000, { placeholder: "https://www.google.com/maps/embed?…" })] }),
  section("feedback-form", "feedbackForm", {
    fields: [
      on("enabled", "enabled", { default: true }),
      bi("heading", "formHeading", { required: true }),
      bi("description", "description"),
      mail("recipientEmail", "recipientEmail", { required: true }),
      mail("notificationEmail", "notificationEmail"),
      bi("successMessage", "successMessage", { required: true }),
      bi("autoReply", "autoReply"),
      bi("submitButtonText", "submitButtonText", { required: true }),
      on("showOnWebsite", "showOnWebsite", { default: true }),
    ],
  }),
  section("partners", "partners", {
    items: list("items", "partner", 50, [img("logoId", "logo"), bi("title", "title", { required: true }), bi("description", "description"), imgs("partnerLogoIds", "partnerLogos", 30)]),
  }),
  section("volunteer-categories", "volunteerCategories", { items: list("items", "volunteerCategory", 30, [bi("title", "title", { required: true }), int("order", "displayOrder", { required: true, default: 0 })]) }),
  section("volunteer-registration", "volunteerRegistration", {
    fields: [
      on("enabled", "enabled", { default: true }),
      bi("heading", "heading", { required: true }),
      bi("description", "description"),
      date("deadline", "deadline"),
      mail("recipientEmail", "recipientEmail", { required: true }),
      bi("successMessage", "successMessage", { required: true }),
      bi("submitButtonText", "submitButtonText", { required: true }),
      on("showOnWebsite", "showOnWebsite", { default: true }),
    ],
  }),
];

export const PAGE_EDITORS: Partial<Record<PageKey, readonly SectionEditorSpec[]>> = {
  infrastructure,
  finance,
  services,
  grievance,
  culture,
  employment,
  education,
  environment,
  announcements,
  gallery,
  contact,
};
