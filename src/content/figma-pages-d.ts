/**
 * PLACEHOLDER CONTENT — Announcements & Circulars and Citizen Services & Online Forms pages from the
 * Figma file (qBVt7yv0KG41onObVWfnP1). Same rules as figma-pages.ts: only used where the backend has no
 * published section for the key. Published announcements replace the feed rows automatically.
 */
import type { PageKey } from "@/config/pages";
import type { FallbackSection } from "./fallback";

const t = (en: string) => ({ en });
/** Bilingual text with an explicit Marathi translation. */
const b = (en: string, mr: string) => ({ en, mr });
const P = "/images/figma/pages/";
const hero = (data: Record<string, unknown>): FallbackSection => ({ sectionKey: "page-hero", sortOrder: 0, data: { noTenantName: true, ...data } });

export const FIGMA_PAGE_SECTIONS_D: Partial<Record<PageKey, FallbackSection[]>> = {
  announcements: [
    hero({
      eyebrow: t("Announcements & Circulars"),
      title: t("Stay Informed. Stay Connected."),
      titleAccent: t("Stay Savardari."),
      body: t("Find the latest announcements, circulars, notices and important updates from Gram Panchayat Savardari"),
      imageUrl: P + "ann-hero.png",
    }),
    {
      sectionKey: "announce-categories",
      sortOrder: 5,
      data: {
        viewAll: t("View All"),
        items: [t("Community"), t("Welfare Schemes"), t("Transfer"), t("Bills"), t("Jobs"), t("Events")].map((label) => ({ label })),
      },
    },
    {
      sectionKey: "announce-feed",
      sortOrder: 10,
      data: {
        heading: t("Latest Announcements"),
        calendarTitle: t("Interactive Calendar"),
        viewAll: { label: t("View All"), href: "page:announcements" },
        viewAllLong: t("View All Announcements"),
        items: [
          { title: t("Gram Sabha Meeting Notice - July 2026"), body: t("All villagers are informed that the Gram Sabha meeting will be held on 15th July 2026."), date: t("July 5, 2025") },
          { title: t("Health Camp at Primary Health Centre"), body: t("Free health check-up camp on 22nd July 2026. All are requested to attend."), date: t("July 4, 2025") },
          { title: t("Property Tax Payment - Last Date Reminder"), body: t("Last date for payment of property tax is 31st May 2026. Avoid late fees."), date: t("May 15, 2026") },
          { title: t("Government Circular - Plastic Free Village Campaign"), body: t("Details regarding the Plastic Free Village campaign and guidelines."), date: t("May 13, 2026") },
          { title: t("Village Committee Meeting - April 2025"), body: t("Committee meeting held on 07th May 2026 at Panchayat Office."), date: t("May 1, 2026") },
        ],
        events: [
          { date: "2026-07-15", title: t("Gram Sabha Meeting"), time: "10:00 AM - 12:00 PM", color: "#135130" },
          { date: "2026-07-22", title: t("Health Camp"), time: "09:00 AM - 02:00 PM", color: "#f5871f" },
          { date: "2026-07-25", title: t("Village Cleanliness Drive"), time: "07:00 AM - 10:00 AM", color: "#1a62e0" },
          { date: "2026-07-31", title: t("Tax Payment Last Date"), time: "05:00 PM", color: "#6a1b9a" },
        ],
      },
    },
    {
      sectionKey: "deadlines-downloads",
      sortOrder: 20,
      data: {
        deadlinesTitle: t("Important Deadlines"),
        downloadsTitle: t("Downloads"),
        viewAll: { label: t("View All"), href: "page:announcements" },
        deadlines: [
          { date: t("July 31, 2026"), title: t("Property Tax Payment"), caption: t("Last Date") },
          { date: t("Jun 15, 2026"), title: t("Gram Panchayat"), caption: t("Sessions") },
          { date: t("Jun 15, 2026"), title: t("Free Health Camp") },
          { date: t("Jun 15, 2026"), title: t("Women’s Awareness"), caption: t("Program") },
        ],
        files: [
          { name: t("Gram Sabha Meeting Format"), type: "PDF", size: "125 KB" },
          { name: t("Property Tax Application Form"), type: "PDF", size: "98 KB" },
          { name: t("Birth Certificate Application Form"), type: "PDF", size: "153 KB" },
          { name: t("Government Circular - Plastic Ban"), type: "PDF", size: "208 KB" },
          { name: t("Financial Year Budget 2024-25"), type: "PDF", size: "1.2 MB" },
        ],
      },
    },
    {
      sectionKey: "service-strip",
      sortOrder: 30,
      data: {
        heading: t("Access Services & Schemes"),
        items: [
          { label: t("Agriculture"), caption: t("12+ Services"), href: "page:services" },
          { label: t("Employment"), caption: t("8+ Services"), href: "page:employment" },
          { label: t("Education"), caption: t("15+ Services"), href: "page:education" },
          { label: t("Women"), caption: t("10+ Services"), href: "page:schemes" },
          { label: t("Announcements"), caption: t("5+ Update"), href: "page:announcements" },
          { label: t("Events & Drives"), caption: t("7+ Programs"), href: "page:gallery" },
        ],
      },
    },
  ],

  services: [
    hero({
      eyebrow: t("Citizen Services & Online Forms"),
      title: t("Easy Access. Better Services."),
      titleAccent: t("Stronger Savardari."),
      body: t("Access essential services and online facilities from the comfort of your home"),
      imageUrl: P + "svc-hero.png",
    }),
    {
      sectionKey: "rts-grid",
      sortOrder: 5,
      data: {
        heading: t("Right to Service (RTS) – Apply Online"),
        subheading: t("Apply for essential certificates and services through the RTS portal"),
        items: [
          ["Birth Certificate", "Apply for birth certificate"],
          ["Death Certificate", "Apply for death certificate"],
          ["Domicile Certificate", "Apply for domicile certificate"],
          ["Income Certificate", "Apply for income certificate"],
          ["Caste Certificate", "Apply for caste certificate"],
          ["Non-Creamy Layer", "Apply for NCL certificate"],
          ["Residence Certificate", "Apply for residence certificate"],
          ["Legal Heir Certificate", "Apply for legal heir certificate"],
          ["Senior Citizen Certificate", "Apply for senior citizen certificate"],
          ["Other Certificates", "View all available services"],
        ].map(([label, caption]) => ({ label: t(label!), caption: t(caption!), href: "page:grievance" })),
        action: { label: t("Visit RTS Portal"), href: "page:grievance" },
      },
    },
    {
      sectionKey: "action-cards",
      sortOrder: 10,
      data: {
        items: [
          { title: t("Grievance Redressal"), body: t("Register your complaint or grievance online."), bullets: [t("Lodge a Complaint"), t("Track Complaint Status"), t("View Resolutions")], action: t("File a Grievance"), href: "page:grievance" },
          { title: t("Feedback & Suggestions"), body: t("We value your feedback. Help us improve our services."), bullets: [t("Share Your Feedback"), t("Suggest Improvements"), t("Rate Our Services")], action: t("Provide Feedback"), href: "page:contact" },
          { title: t("Online Tax Payment"), body: t("Pay your taxes and fees securely online."), bullets: [t("Property Tax"), t("Water Tax"), t("Other Local Taxes")], action: t("Pay Online Now"), href: "page:finance" },
          { title: t("Service Status"), body: t("Check the status of your applications or requests."), bullets: [t("Application Tracking"), t("Status Updates"), t("Download Documents")], action: t("Check Status"), href: "page:grievance" },
        ],
      },
    },
    {
      sectionKey: "qr-codes",
      sortOrder: 20,
      data: {
        items: [
          { title: b("RTS Portal", "RTS पोर्टल"), description: b("Apply for Certificates", "दाखल्यांसाठी अर्ज करा"), serviceIcon: "file", linkUrl: "https://rts.maharashtra.gov.in" },
          { title: b("Grievance Portal", "तक्रार पोर्टल"), description: b("Lodge Complaints", "तक्रार नोंदवा"), serviceIcon: "info", linkUrl: "page:grievance" },
          { title: b("Tax Payment", "कर भरणा"), description: b("Pay Taxes Online", "कर ऑनलाइन भरा"), serviceIcon: "rupee", linkUrl: "page:finance" },
          { title: b("Feedback Form", "अभिप्राय अर्ज"), description: b("Share Feedback", "अभिप्राय द्या"), serviceIcon: "mail", linkUrl: "page:contact" },
          { title: b("Village Website", "गावाचे संकेतस्थळ"), description: b("Visit Our Website", "आमच्या संकेतस्थळाला भेट द्या"), serviceIcon: "globe", linkUrl: "page:home" },
          { title: b("Help & Support", "मदत आणि सहाय्य"), description: b("Get Assistance", "मदत मिळवा"), serviceIcon: "phone", linkUrl: "page:contact" },
        ],
      },
    },
    {
      sectionKey: "top-stats",
      sortOrder: 30,
      data: {
        items: [
          { icon: "file", title: b("Certificates Issued This Month", "या महिन्यात दिलेले दाखले"), value: "500+", background: "#E8F1EA", visible: true },
          { icon: "info", title: b("Grievances Resolved This Month", "या महिन्यात निराकरण झालेल्या तक्रारी"), value: "250+", background: "#E8F1EA", visible: true },
          { icon: "rupee", title: b("Tax Collection This Month", "या महिन्यातील कर संकलन"), value: "₹12.5L+", background: "#E8F1EA", visible: true },
          { icon: "shield", title: b("Citizen Satisfaction Rate", "नागरिक समाधान दर"), value: "98%", background: "#E8F1EA", visible: true },
        ],
      },
    },
    {
      sectionKey: "help-card",
      sortOrder: 40,
      data: {
        heading: t("Need Help?"),
        body: t("Our support team is here to assist you with any queries or issues."),
        phone: "+91 12345 67890",
        phoneHours: t("Mon to Sat, 10:00 AM – 6:00 PM"),
        email: "support@savardari.gov.in",
        emailNote: t("We typically reply in 24 hours."),
        queriesTitle: t("Common Queries"),
        queries: [t("How do I apply for a certificate?"), t("How can I track my application status?"), t("How do I pay taxes online?"), t("I'm facing login issues. What to do?")],
      },
    },
  ],
};
