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
  schemes: [
    hero({
      eyebrow: t("Government Schemes & Beneficiary Information"),
      title: t("Empowering Lives. Building a Better"),
      titleAccent: t("Savardari."),
      body: t("Explore government schemes and their benefits. Check eligibility, apply online and track your application status"),
      imageUrl: P + "sch-hero.png",
    }),
    {
      sectionKey: "scheme-levels",
      sortOrder: 5,
      data: {
        items: [
          { level: "CENTRAL", label: t("Central Government Schemes"), count: 48 },
          { level: "STATE", label: t("State Government Schemes"), count: 36 },
          { level: "DISTRICT", label: t("District Level Schemes"), count: 22 },
        ],
      },
    },
    {
      sectionKey: "scheme-showcase",
      sortOrder: 10,
      data: {
        heading: t("Featured Schemes"),
        benefitsLabel: t("Benefits"),
        items: [
          { name: t("Pradhan Mantri Awas Yojna"), category: t("Housing"), level: t("Central"), description: t("Provides pucca houses to homeless families"), benefitValue: t("₹1.20 Lakh"), benefitCaption: t("Financial Assistance") },
          { name: t("MGNREGA"), category: t("Employment"), level: t("Central"), description: t("Provides 100 days of wage employment in a financial year"), benefitValue: t("₹221/Day"), benefitCaption: t("Wage rate") },
          { name: t("PM Kisan Samman Nidhi"), category: t("Agriculture"), level: t("Central"), description: t("Financial Support to small and marginal farmers"), benefitValue: t("₹6000/Year"), benefitCaption: t("Direct Bank Transfer") },
          { name: t("Mukhyamantri Uddhav Balasaheb Thackeray Awas Yona"), category: t("Housing"), level: t("State"), description: t("Provides houses to eligible beneficiaries in Maharashtra"), benefitValue: t("₹1.50 Lakh"), benefitCaption: t("Financial Assistance") },
          { name: t("Social Justice Schloarship"), category: t("Education"), level: t("State"), description: t("Schlarships for students from backward classes"), benefitValue: t("Up to ₹75,000"), benefitCaption: t("Scholarship Amount") },
        ],
        viewAll: { label: t("View All Schemes"), href: "page:schemes" },
      },
    },
    crops(20, { rows: [{ items: [img("sch-sheet.png", 1622, 970)] }] }),
    crops(30, { rows: [{ items: [img("sch-stories.png", 1866, 843)] }] }),
  ],

  contact: [
    hero({
      eyebrow: t("Contact & Collaboration"),
      title: t("Let’s Build a Stronger Savardari Together"),
      body: t("We welcome your feedback, suggestions, and collaboration to make our village better, stronger, and more sustainable"),
      actions: [
        { label: t("Become a Volunteer"), href: "page:contact" },
        { label: t("Send Feedback"), href: "page:contact" },
      ],
      imageUrl: P + "con-hero.png",
    }),
    {
      sectionKey: "callout",
      sortOrder: 5,
      data: {
        text: t("We believe in people’s participation, strong partnerships, and transparent communication for inclusive and sustainable village development"),
      },
    },
    {
      sectionKey: "contact-cards",
      sortOrder: 10,
      data: {
        heading: t("Contact Information"),
        phone: "+919767694340",
        email: "savardarigrampanchayat@gmail.com",
        address: t("Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501"),
        hours: t("Monday to Friday: 9:45 am to 6:15 pm\nWeekends and Sundays: Closed"),
        labels: { inquiries: t("General Inquires"), hours: t("Office Hours"), address: t("Office Address"), follow: t("Follow Us") },
      },
    },
    {
      sectionKey: "contact-feedback",
      sortOrder: 20,
      data: {
        mapHeading: t("Our Office Location"),
        formHeading: t("Send Us Your Feedback"),
        mapImage: P + "con-map.png",
        email: "savardarigrampanchayat@gmail.com",
        submit: t("Submit Feedback"),
        fields: [
          { name: "name", label: t("Your Name"), placeholder: t("Enter your full name") },
          { name: "email", label: t("Email Address"), placeholder: t("Enter your Email"), type: "email" },
          { name: "mobile", label: t("Mobile Number"), placeholder: t("Enter your mobile number"), type: "tel" },
          { name: "subject", label: t("Subject"), placeholder: t("Enter Subject") },
          { name: "message", label: t("Your Message/Feedback"), placeholder: t("Write your message here..."), type: "textarea", span: 4 },
        ],
      },
    },
    crops(30, {
      heading: t("Our Partners & Collaborators"),
      rows: [{ gap: 20, items: [1, 2, 3].map((n) => img("con-p" + n + ".png", 467, 339, { shadow: true })) }],
    }),
    {
      sectionKey: "volunteer-form",
      sortOrder: 40,
      data: {
        heading: t("Become a Volunteer"),
        subheading: t("Join hand with us and contribute towards the development of Savardari"),
        images: [1, 2, 3, 4].map((n) => P + "con-v" + n + ".png"),
        formHeading: t("Volunteer Registration Form"),
        email: "savardarigrampanchayat@gmail.com",
        submit: t("Register Now"),
        fields: [
          { name: "name", label: t("Full Name"), placeholder: t("Enter your full name") },
          { name: "email", label: t("Email Address"), placeholder: t("Enter your email"), type: "email" },
          { name: "mobile", label: t("Mobile Number"), placeholder: t("Enter your mobile number"), type: "tel" },
          { name: "category", label: t("Category"), placeholder: t("Select Category"), type: "select", options: ["Youth Volunteers", "NGOs", "Social Organizations", "Citizen Volunteers"] },
          { name: "address", label: t("Address"), placeholder: t("Enter your full address"), span: 2 },
          { name: "interest", label: t("Area of Interest"), placeholder: t("e.g. Education, Environment, Health..."), span: 2 },
        ],
      },
    },
  ],

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
