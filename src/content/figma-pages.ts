/**
 * PLACEHOLDER CONTENT — inner public pages taken from the Figma file (qBVt7yv0KG41onObVWfnP1).
 * Same rules as figma-home.ts: used only where the backend has no published section for a key;
 * delete a page's entry (or this file) once the Gram Panchayat's real content is loaded.
 */
import type { PageKey } from "@/config/pages";
import type { FallbackSection } from "./fallback";
import { FIGMA_HOME_SECTIONS } from "./figma-home";

const t = (en: string) => ({ en });
const stats = FIGMA_HOME_SECTIONS.find((s) => s.sectionKey === "quick-stats")!;
const statsStrip = (sortOrder: number): FallbackSection => ({ ...stats, sortOrder });

const PROJECT = (stage: string, name: string, ward: string): Record<string, unknown> => ({
  stage,
  name: t(name),
  location: t(ward),
  year: "2025",
  budget: "₹42 Lakhs",
  outcome: t("3.5 km Cement Road"),
  families: "425",
});

export const FIGMA_PAGE_SECTIONS: Partial<Record<PageKey, FallbackSection[]>> = {
  projects: [
    {
      sectionKey: "page-hero",
      sortOrder: 0,
      data: {
        eyebrow: t("Key Projects & Initiatives"),
        title: t("Building Progress Through Meaningful Initiatives"),
        noTenantName: true,
        body: t("Discover the projects and initiatives shaping a stronger, greener, and more developed Savardari"),
        actions: [
          { label: t("Explore Village"), href: "page:about" },
          { label: t("Explore Services"), href: "page:services" },
          { label: t("Register Complaint"), href: "page:grievance" },
        ],
        imageUrl: "/images/figma/hero-projects.png",
      },
    },
    statsStrip(5),
    {
      sectionKey: "project-showcase",
      sortOrder: 10,
      data: {
        eyebrow: t("Key Projects"),
        tabs: [
          { key: "COMPLETED", label: t("Completed Projects") },
          { key: "ONGOING", label: t("Ongoing Projects") },
          { key: "UPCOMING", label: t("Upcoming Projects") },
        ],
        // Figma shows three identical sample cards; the other tabs reuse them until real projects exist.
        items: [
          PROJECT("COMPLETED", "Internal Road Construction", "Ward 2"),
          PROJECT("COMPLETED", "Internal Road Construction", "Ward 2"),
          PROJECT("COMPLETED", "Internal Road Construction", "Ward 2"),
        ],
        viewAll: { label: t("View All Projects"), href: "page:projects" },
      },
    },
    {
      sectionKey: "before-after",
      sortOrder: 20,
      data: {
        eyebrow: t("Before & After Gallery"),
        items: [{ label: t("Road Development") }, { label: t("Lake Restoration") }, { label: t("Street Lighting") }, { label: t("School Renovation") }],
        viewAll: { label: t("View All Transformation"), href: "page:gallery" },
      },
    },
    {
      sectionKey: "progress-tracker",
      sortOrder: 30,
      data: {
        title: t("Village Resolution Tracker"),
        subtitle: t("Top 10 Village Ce Commitments"),
        items: [
          { label: t("Clean Village"), percent: 92 },
          { label: t("Water Conservation"), percent: 74 },
          { label: t("Digital Literacy"), percent: 81 },
          { label: t("Green Energy"), percent: 65 },
          { label: t("Women Empowerment"), percent: 89 },
          { label: t("Solid Waste Management"), percent: 94 },
          { label: t("Plastic Free Village"), percent: 72 },
          { label: t("Rainwater Harvesting"), percent: 58 },
          { label: t("Tree Plantation"), percent: 96 },
          { label: t("Smart Governance"), percent: 93 },
        ],
      },
    },
    {
      sectionKey: "impact-grid",
      sortOrder: 31,
      data: {
        title: t("Impact Dashboard"),
        subtitle: t("Key Development Indicators"),
        items: [
          { label: t("Toilets Constructed"), value: "100%" },
          { label: t("Electricity Coverage"), value: "100%" },
          { label: t("Drinking Water"), value: "97%" },
          { label: t("Houses under PMAY"), value: "92%" },
          { label: t("Roads Constructed"), value: "22 km" },
          { label: t("LED Street Lights"), value: "100%" },
          { label: t("Internet Coverage"), value: "91%" },
          { label: t("School Entollment"), value: "98%" },
          { label: t("Trees Planted"), value: "18,500" },
          { label: t("Women SHG"), value: "37", unit: "Groups" },
          { label: t("Health Camps"), value: "58" },
          { label: t("Waste Collection"), value: "96%" },
        ],
      },
    },
    {
      sectionKey: "dev-timeline",
      sortOrder: 40,
      data: {
        title: t("Development Timeline"),
        steps: [
          { year: "2021", label: t("Road Phase 1"), status: t("Completed") },
          { year: "2022", label: t("Lake Development"), status: t("Completed") },
          { year: "2023", label: t("Digital Panchayat"), status: t("Completed") },
          { year: "2024", label: t("Smart Lighting"), status: t("Completed") },
          { year: "2025", label: t("Village Beautification"), status: t("In Progress"), done: false },
        ],
        action: { label: t("View Timeline"), href: "page:projects" },
      },
    },
    {
      sectionKey: "financial-overview",
      sortOrder: 41,
      data: {
        title: t("Financial Overview"),
        budgetLabel: t("Budget Allocation"),
        sourcesLabel: t("Funding Sources"),
        allocation: [
          { label: t("Roads"), percent: 40 },
          { label: t("Water"), percent: 22 },
          { label: t("Education"), percent: 13 },
          { label: t("Health"), percent: 11 },
          { label: t("Agriculture"), percent: 8 },
          { label: t("Others"), percent: 6 },
        ],
        sources: [
          { label: t("State"), amount: "₹3.10 Cr", value: 3.1 },
          { label: t("Central"), amount: "₹3.85 Cr", value: 3.85 },
          { label: t("CSR"), amount: "₹0.95Cr", value: 0.95 },
          { label: t("Own Revenue"), amount: "₹0.82Cr", value: 0.82 },
        ],
        action: { label: t("View Financial Details"), href: "page:finance" },
      },
    },
    {
      sectionKey: "stories-figma",
      sortOrder: 50,
      data: {
        title: t("Success Stories"),
        viewAll: { label: t("View All Stories"), href: "page:projects" },
        items: [
          { quote: t("The new road has reduced travel time from 20 minutes to just 7 minutes, it has truly changed our lives."), name: t("Sunil Pawar"), role: t("Resident Ward 2") },
          { quote: t("Drinking water facility has improved a lot. Now we can get clean water right at our village."), name: t("Lata Jadhav"), role: t("Resident Ward 3") },
          { quote: t("The solar street lights have made our village safter and brighter at night."), name: t("Ramesh Shinde"), role: t("Resident Ward 4") },
        ],
      },
    },
    {
      sectionKey: "cta-banner",
      sortOrder: 60,
      data: {
        title: t("Have a Development Suggestion?"),
        body: t("Submit your idea to help build a better Savardari"),
        primary: { label: t("Submit Suggestion"), href: "page:grievance" },
        secondary: { label: t("Contact Panchayat"), href: "page:contact" },
      },
    },
  ],
};
