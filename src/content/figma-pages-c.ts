/**
 * PLACEHOLDER CONTENT — Employment, Education, Environment and Gallery pages from the Figma file
 * (qBVt7yv0KG41onObVWfnP1). Same rules as figma-pages.ts: used only where the backend has no
 * published section for the key; delete a page's entry once real content is loaded. Pictures are
 * the Figma frames saved under public/images/figma/pages.
 */
import type { PageKey } from "@/config/pages";
import type { FallbackSection } from "./fallback";

const t = (en: string) => ({ en });
const P = "/images/figma/pages/";
const img = (src: string, w: number, h: number, extra: Record<string, unknown> = {}) => ({ src: P + src, w, h, ...extra });
const crops = (sortOrder: number, data: Record<string, unknown>): FallbackSection => ({ sectionKey: "image-crops", sortOrder, data });
const hero = (data: Record<string, unknown>): FallbackSection => ({ sectionKey: "page-hero", sortOrder: 0, data: { noTenantName: true, ...data } });

const STORY = (n: number) => img(`edu-story${n}.png`, 315, 439, { shadow: true });
const PHOTO = (title: string, kind: string, src: string, category = "") => ({ category, title: t(title), meta: t("March 25, 2024"), imageUrl: P + src, kind });

export const FIGMA_PAGE_SECTIONS_C: Partial<Record<PageKey, FallbackSection[]>> = {
  grievance: [
    hero({
      eyebrow: t("Grievance Redressal & Citizen Feedback"),
      title: t("Your Voice, Our Commitment to Better Savardari"),
      body: t("We are here to listen and act. Register your complaints, track status, share suggestions, and help us build a transparent and responsive Savardari"),
      actions: [
        { label: t("Register a Complaint"), href: "page:grievance" },
        { label: t("Track Complaint Status"), href: "page:grievance" },
      ],
      imageUrl: P + "gri-hero.png",
    }),
    {
      sectionKey: "callout",
      sortOrder: 5,
      data: {
        text: t("Your feedback and suggestions help us improve services and develop a better Savardari for everyone. Together, we can build a stronger and more prosperous Savardari"),
        highlight: t("stronger and more prosperous Savardari"),
      },
    },
    // Real form: category, name, phone, email, description. The design also shows type, subject,
    // location and an attachment; those fields are not in the backend contract yet.
    { sectionKey: "grievance-register", sortOrder: 10, data: { heading: t("Register Your Complaint") } },
    crops(20, { rows: [{ gap: 10, items: [1, 2, 3, 4, 5].map((n) => img("gri-c" + n + ".png", 256, 228, { shadow: true })) }] }),
    { sectionKey: "grievance-track", sortOrder: 30, data: { heading: t("Track Your Complaint"), howImage: P + "gri-how.png" } },
    crops(40, { rows: [{ items: [img("gri-report.png", 1378, 681)] }] }),
  ],

  employment: [
    hero({
      eyebrow: t("Employment & Skill Development"),
      title: t("Creating Opportunities, Empowering Lives in Savardari"),
      body: t("Explore job opportunities, skill development programs, local talent, and resources that help our community grow and prosper"),
      actions: [
        { label: t("View Opportunities"), href: "page:employment" },
        { label: t("Village Talent Directory"), href: "page:employment" },
      ],
      imageUrl: P + "emp-hero.png",
    }),
    crops(5, { maxWidth: 1318, rows: [{ items: [img("emp-banner.png", 1358, 282)] }] }),
    crops(10, { heading: t("Local Opportunities") }),
    {
      sectionKey: "stat-cards",
      sortOrder: 15,
      data: {
        items: [
          { value: "128", label: t("Active Job Openings"), caption: t("Updated this week") },
          { value: "42", label: t("Private Sector Jobs"), caption: t("Multiple locations") },
          { value: "16", label: t("Apprenticeship Program"), caption: t("For skill development") },
          { value: "21", label: t("Contract Opportunities"), caption: t("Apply for local tenders") },
        ],
      },
    },
    crops(16, { action: { label: t("View All Opportunities"), href: "page:employment" } }),
    {
      sectionKey: "tile-grid",
      sortOrder: 20,
      data: {
        heading: t("Village Talent Directory"),
        subheading: t("Find skilled professionals in our village for your needs"),
        items: [
          { label: t("Electricians"), caption: t("18 Available") },
          { label: t("Plumbers"), caption: t("12 Available") },
          { label: t("Carpenters"), caption: t("15 Available") },
          { label: t("Tailors"), caption: t("20 Available") },
          { label: t("Mechanics"), caption: t("10 Available") },
          { label: t("Masons"), caption: t("14 Available") },
          { label: t("Painters"), caption: t("11 Available") },
          { label: t("More Skills"), caption: t("Explore All") },
        ],
        action: { label: t("View Full Directory"), href: "page:employment" },
      },
    },
    crops(25, { maxWidth: 581, rows: [{ items: [img("emp-farmer.png", 581, 631)] }] }),
    crops(30, { heading: t("Training Programs & Digital Literacy"), rows: [{ items: [img("emp-training.png", 1440, 468)] }] }),
    crops(40, {
      heading: t("Success Stories of Savardari"),
      rows: [{ items: [img("emp-stories.png", 1440, 419)] }],
      action: { label: t("View All Success Stories"), href: "page:culture" },
    }),
  ],

  education: [
    hero({
      eyebrow: t("Education & Youth Corner"),
      title: t("Empowering Minds, Building Futures in Savardari"),
      body: t("We are committed to quality education, skill development, and holistic growth of our youth to build a brighter and stronger Savardari"),
      imageUrl: P + "edu-hero.png",
    }),
    crops(5, { rows: [{ items: [img("edu-banner.png", 1316, 280)] }] }),
    crops(10, { rows: [{ items: [img("edu-spotlight.png", 1319, 374, { bordered: true })] }] }),
    {
      sectionKey: "media-cards",
      sortOrder: 20,
      data: {
        heading: t("Youth Speak"),
        tabs: [
          { key: "all", label: t("All") },
          { key: "blogs", label: t("Blogs") },
          { key: "videos", label: t("Videos") },
          { key: "youtube", label: t("YouTube") },
          { key: "reels", label: t("Reels") },
          { key: "ideas", label: t("Creative Ideas") },
        ],
        items: [1, 2, 3, 4].map(() => ({ category: "blogs", title: t("Power of Education In Rural India"), meta: t("By Rutuja Wankhade · March 25, 2024"), imageUrl: P + "edu-blog.png", kind: "none" })),
        action: { label: t("View All Contribution"), href: "page:education" },
      },
    },
    {
      sectionKey: "link-cards",
      sortOrder: 30,
      data: {
        heading: t("Schemes & Opportunities for Youth"),
        items: [
          { title: t("Scholarship Schemes"), body: t("Central & State Government scholarships for students"), cta: t("Explore Now"), href: "page:schemes" },
          { title: t("Skill Development"), body: t("Courses & training programs for youth"), cta: t("Explore Now"), href: "page:employment" },
          { title: t("Competitive Exams"), body: t("Resources & guidance for various exams"), cta: t("Explore Now"), href: "page:education" },
          { title: t("Internships"), body: t("Find internships & placement opportunities"), cta: t("Explore Now"), href: "page:employment" },
          { title: t("Youth Clubs"), body: t("Join youth clubs & build leadership skills"), cta: t("Explore Now"), href: "page:education" },
        ],
      },
    },
    crops(40, {
      heading: t("Success Stories from Savardari"),
      rows: [{ items: [1, 2, 3, 4].map(STORY) }],
      action: { label: t("View All Success Stories"), href: "page:culture" },
    }),
  ],

  environment: [
    hero({
      eyebrow: t("Environment & Sustainability"),
      title: t("Building a Greener Savardari for a Sustainable Tomorrow"),
      body: t("We are committed to protecting our environment and building a sustainable future through community participation, innovation, and responsibility"),
      actions: [{ label: t("Adopt a Tree Now"), href: "page:environment" }],
      imageUrl: P + "env-hero.png",
    }),
    crops(10, {
      rows: [
        { items: [img("env-a.png", 1322, 396)] },
        { items: [img("env-b.png", 1323, 326)] },
        { items: [img("env-c.png", 1392, 1239)] },
      ],
    }),
  ],

  gallery: [
    hero({
      eyebrow: t("Gallery & Media"),
      title: t("Capturing the Journey of Savardari"),
      body: t("Explore the vibrant life, cultural heritage, and development milestones of our village through images, videos, and media stories"),
      actions: [
        { label: t("Watch Documentary"), href: "page:gallery" },
        { label: t("View Photo Gallery"), href: "page:gallery" },
      ],
      imageUrl: P + "gal-hero.png",
    }),
    {
      sectionKey: "media-cards",
      sortOrder: 10,
      data: {
        heading: t("Photo Gallery"),
        tabs: [
          { key: "all", label: t("All") },
          { key: "festivals", label: t("Festivals") },
          { key: "events", label: t("Events") },
          { key: "development", label: t("Development Works") },
          { key: "community", label: t("Community") },
          { key: "infrastructure", label: t("Infrastructure") },
          { key: "environment", label: t("Environment") },
        ],
        items: [1, 2, 3, 4].map((n) => PHOTO("Holi Celebration", "photo", `gal-p${n}.png`, "festivals")),
      },
    },
    {
      sectionKey: "media-cards",
      sortOrder: 20,
      data: {
        heading: t("Video Gallery"),
        tabs: [{ key: "all", label: t("All") }],
        items: [1, 2, 3, 4].map((n) => ({ title: t("Village Development Journey"), meta: t("March 25, 2024"), imageUrl: P + `gal-v${n}.png`, kind: "none" })),
      },
    },
    crops(30, {
      heading: t("Press Coverage & Media Reports"),
      rows: [{ gap: 23, items: [1, 2, 3, 4, 5].map((n) => img(`gal-m${n}.png`, 245, 263, { shadow: true })) }],
    }),
    {
      sectionKey: "before-after",
      sortOrder: 40,
      data: {
        heading: t("Then & Now — Transformation Journey"),
        items: [{ label: t(""), beforeUrl: P + "gal-before.png", afterUrl: P + "gal-after.png", height: 354 }],
      },
    },
    {
      sectionKey: "video-feature",
      sortOrder: 50,
      data: {
        heading: t("Mini Documentary"),
        title: t("Savardari: A Journey of Transformation & Progress"),
        body: t("A short documentary showcasing the efforts, achievements, and the bright future of our village."),
        duration: t("Duration: 02:00"),
        published: t("Published: April 10, 2024"),
        imageUrl: P + "gal-doc.png",
        action: { label: t("Watch Documentary"), href: "page:gallery" },
      },
    },
  ],
};
