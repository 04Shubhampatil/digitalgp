/**
 * PLACEHOLDER CONTENT — taken from the Figma home design (file qBVt7yv0KG41onObVWfnP1, "1. Home page").
 *
 * Used only where the backend has no published section for that key (see ./fallback.ts).
 * Real published content always wins. When the client's data is loaded, delete this file
 * and the FALLBACK_SECTIONS entry; nothing else depends on it.
 *
 * Values marked "placeholder" below are not visible in the Figma text layers and were filled
 * in to keep the design complete — confirm them with the client before going live.
 *
 * Shapes match src/config/sections.ts exactly. Strings are English only; Marathi falls back to
 * English through pickText().
 */
import type { FallbackSection } from "./fallback";

export const FIGMA_HOME_SECTIONS: FallbackSection[] = [
  {
    sectionKey: "hero",
    sortOrder: 0,
    data: {
      title: { en: "Building a Sustainable, Transparent & Digital Village." },
      subtitle: {
        en: "Access verified village information, public services, development updates, government schemes and grievance support through the official Gram Panchayat portal.",
      },
      actions: [
        { label: { en: "Explore Village" }, href: "page:about" },
        { label: { en: "Explore Services" }, href: "page:services" },
        { label: { en: "Register Complaint" }, href: "page:grievance" },
      ],
    },
  },
  {
    sectionKey: "quick-stats",
    sortOrder: 10,
    data: {
      items: [
        { label: { en: "Population" }, value: "2,857" },
        { label: { en: "Households" }, value: "2,857" },
        { label: { en: "Hectares Agriculture Area" }, value: "1,243" },
        // Figma shows "1,243" for Literacy Rate (a copy of the previous tile); 91.4% matches the KPI tile.
        { label: { en: "Literacy Rate" }, value: "91.4%" },
        { label: { en: "Govt. Schemes Implemented" }, value: "9" },
        { label: { en: "Schools" }, value: "5" },
        { label: { en: "Water Resources" }, value: "100%" },
        { label: { en: "Ongoing Projects" }, value: "12" },
      ],
    },
  },
  {
    sectionKey: "about-cards",
    sortOrder: 20,
    skipIfPresent: ["welcome"],
    data: {
      heading: { en: "About" },
      subheading: {
        en: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune This village is a progressive village that combines natural wealth with industrial development",
      },
      cards: [
        {
          tone: "orange",
          title: { en: "Vision & Governance" },
          body: {
            en: "Gram Panchayat Savardari is working by prioritizing the values of nature conservation, industrial development, cleanliness, education and social inclusion. Gram Panchayat Savardari is known for embracing modern development while preserving the traditional lifestyle, maintaining a balance between agriculture and industry, and setting an example of sustainable development",
          },
        },
        {
          tone: "navy",
          title: { en: "Industrial Growth" },
          body: {
            en: "Industrially, Savardari has become an important center for employment generation as it is located in close proximity to the growing industrial area of Khed taluka. The nearby industrial estates, small and medium industries and service sector are providing employment opportunities to the youth of the village at the local level. Due to this, the economic development of the village is rapid and it is moving towards modernity",
          },
        },
        {
          tone: "green",
          title: { en: "Nature & Agriculture" },
          body: {
            en: "Due to the mountainous terrain, green agriculture, fertile land and local water resources, the geographical form of Savardari is very rich and environmentally friendly. Most of the citizens of the village depend on agriculture and related businesses and the traditional agricultural culture is preserved here even today",
          },
        },
      ],
      address: { en: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501" },
      readMore: { label: { en: "Read More" }, href: "page:about" },
    },
  },
  {
    sectionKey: "achievements",
    sortOrder: 28,
    data: {
      heading: { en: "Top Five Achievements of the Ward" },
      wards: [{ en: "Ward 1" }, { en: "Ward 2" }, { en: "Ward 3" }, { en: "Ward 4" }],
      items: [
        { title: { en: "100% Household Top Water Connections" }, body: { en: "Achieved complete tap water supply coverage in the village" }, completed: { en: "Completed: 28 Jun 2026" } },
        { title: { en: "18,560 Trees Planted in 2026" }, body: { en: "Large scale plantation drive across all wards." }, completed: { en: "Completed: 25 Jun 2026" } },
        { title: { en: "100% LED Street Lights in All Wards" }, body: { en: "Completed LED street light installation project." }, completed: { en: "Completed: 20 Jun 2026" } },
        { title: { en: "High Gram Sabha Participation (78%)" }, body: { en: "Encouraged maximum citizen participation in governance." }, completed: { en: "Completed: 18 Jun 2026" } },
        { title: { en: "92% Grievances Resolved" }, body: { en: "Improved grievance redressal system and citizen satisfaction." }, completed: { en: "Completed: 15 Jun 2026" } },
      ],
    },
  },
  {
    sectionKey: "whats-new",
    sortOrder: 29,
    data: {
      heading: { en: "What’s New This Week?" },
      viewAll: { label: { en: "View All" }, href: "page:announcements" },
      items: [
        { title: { en: "New Water Pipeline Project Completed in Ward 2" }, date: { en: "08 July, 2026" }, status: "completed", imageUrl: "/images/figma/pages/news-1.png" },
        { title: { en: "450 Trees Planted in Village Plantation Drive" }, date: { en: "06 July, 2026" }, status: "completed", imageUrl: "/images/figma/pages/news-2.png" },
        { title: { en: "Gram Sabha Meeting Held with Record Participation" }, date: { en: "05 July, 2026" }, status: "event", imageUrl: "/images/figma/pages/news-3.png" },
        { title: { en: "Solar Street Lights Installtion Started in Ward 3" }, date: { en: "04 July, 2026" }, status: "ongoing", imageUrl: "/images/figma/pages/news-4.png" },
        { title: { en: "Health Check-up Camp Organized for Villagers" }, date: { en: "03 July, 2026" }, status: "event", imageUrl: "/images/figma/pages/news-5.png" },
      ],
    },
  },
  {
    sectionKey: "weather",
    sortOrder: 24,
    data: {
      title: { en: "Today’s Weather" },
      location: { en: "Savardari, Maharashtra" },
      temperature: "31",
      condition: { en: "Partly Cloudy — Monsoon" },
      feelsLike: "36° C",
      humidity: "82%",
      wind: "18 km/hr NW",
      visibility: "8 km",
      sunrise: "6:12 AM",
      sunset: "7:24 PM",
      date: "6 Jul 2026",
    },
  },
  {
    sectionKey: "sarpanch-message",
    sortOrder: 25,
    data: {
      heading: { en: "Message from the Sarpanch" },
      message: {
        en: "Dear fellow citizens, we are committed to making Savardari a model village of Maharashtra, Your cooperation in our development journey is our greatest strength. Together, we build a clean, prosperous , and digitally empowered Savardari.",
      },
      name: { en: "Smt. Sabitabai Gaikwad" },
      designation: { en: "Sarpanch, Gram Panchayat Savardari" },
    },
  },
  {
    sectionKey: "welcome-video",
    sortOrder: 34,
    data: {
      heading: { en: "Welcome to" },
      watchLabel: { en: "Watch Village Story" },
    },
  },
  {
    sectionKey: "monthly-metrics",
    sortOrder: 22,
    data: {
      period: { en: "this month" },
      items: [
        { label: { en: "Population" }, value: "2,857", change: "1.2%" },
        { label: { en: "Literacy Rate" }, value: "91.4%", change: "2.3%" },
        { label: { en: "Health Coverage" }, value: "96%", change: "1.5%" },
        { label: { en: "Water Supply" }, value: "100%", change: "0.5%" },
        { label: { en: "Electricity Supply" }, value: "91.4%", change: "0.8%" },
        { label: { en: "Scheme Beneficiaries" }, value: "1,245", change: "3.6%" },
        { label: { en: "Gram Sabha Participation" }, value: "78%", change: "5.4%", caption: { en: "Attendance" } },
        { label: { en: "Grievance Redressal" }, value: "92%", change: "4.1%", caption: { en: "Resolved" } },
        { label: { en: "Tree Plantation" }, value: "18,560", change: "8.7%", caption: { en: "Total Trees" } },
      ],
    },
  },
  {
    sectionKey: "village-progress",
    sortOrder: 35,
    data: {
      heading: { en: "Village Development Progress" },
      subheading: { en: "Live indicators tracking Savardari's development journey" },
      items: [
        { label: { en: "Tap Water (Jal Jeevan Mission)" }, valueText: "100%" },
        { label: { en: "Sanitation Coverage (ODF++)" }, valueText: "82%" },
        { label: { en: "Solar Street Lights" }, valueText: "48%" },
        { label: { en: "PM Awas Housing Completed" }, valueText: "65%" },
        { label: { en: "All-Weather Road Connectivity" }, valueText: "82%" },
        { label: { en: "Digital Literacy Enrolment" }, valueText: "60%" },
      ],
    },
  },
  {
    sectionKey: "ward-details",
    sortOrder: 23,
    data: {
      heading: { en: "Ward Details" },
      viewAll: { label: { en: "View Ward Details" }, href: "page:culture" },
      wards: [
        {
          name: { en: "Ward 1", mr: "प्रभाग १" },
          items: [
            { label: { en: "Roads Completed" }, valueText: "12.5 km/15 km", percent: 98 },
            { label: { en: "Water Pipeline" }, valueText: "8.2 km / 10 km", percent: 84 },
            { label: { en: "Street Lights" }, valueText: "98 / 120", percent: 77 },
            { label: { en: "Drainage" }, valueText: "6.5 km / 8 km", percent: 81 },
            { label: { en: "Plantation" }, valueText: "2,450 / 3000", percent: 72 },
            { label: { en: "Ongoing Projects" }, valueText: "5", percent: 33 },
          ],
        },
        {
          name: { en: "Ward 2", mr: "प्रभाग २" },
          items: [
            { label: { en: "Roads Completed" }, valueText: "11.0 km / 14 km", percent: 79 },
            { label: { en: "Water Pipeline" }, valueText: "7.5 km / 9 km", percent: 83 },
            { label: { en: "Street Lights" }, valueText: "88 / 110", percent: 80 },
            { label: { en: "Drainage" }, valueText: "5.2 km / 7 km", percent: 74 },
            { label: { en: "Plantation" }, valueText: "2,100 / 2,800", percent: 75 },
            { label: { en: "Ongoing Projects" }, valueText: "3", percent: 20 },
          ],
        },
        {
          name: { en: "Ward 3", mr: "प्रभाग ३" },
          items: [
            { label: { en: "Roads Completed" }, valueText: "9.8 km / 12 km", percent: 82 },
            { label: { en: "Water Pipeline" }, valueText: "6.9 km / 8 km", percent: 86 },
            { label: { en: "Street Lights" }, valueText: "76 / 90", percent: 84 },
            { label: { en: "Drainage" }, valueText: "4.8 km / 6 km", percent: 80 },
            { label: { en: "Plantation" }, valueText: "1,900 / 2,400", percent: 79 },
            { label: { en: "Ongoing Projects" }, valueText: "4", percent: 27 },
          ],
        },
        {
          name: { en: "Ward 4", mr: "प्रभाग ४" },
          items: [
            { label: { en: "Roads Completed" }, valueText: "13.2 km / 16 km", percent: 83 },
            { label: { en: "Water Pipeline" }, valueText: "9.1 km / 11 km", percent: 83 },
            { label: { en: "Street Lights" }, valueText: "104 / 130", percent: 80 },
            { label: { en: "Drainage" }, valueText: "7.0 km / 9 km", percent: 78 },
            { label: { en: "Plantation" }, valueText: "2,600 / 3,200", percent: 81 },
            { label: { en: "Ongoing Projects" }, valueText: "6", percent: 40 },
          ],
        },
      ],
    },
  },
  {
    sectionKey: "leaders",
    sortOrder: 45,
    data: {
      heading: { en: "Our" },
      headingAccent: { en: "Leaders" },
      subheading: { en: "Chief Minister's Prosperous Panchayat Raj Mission" },
      items: [
        { name: { en: "Hon. Shri. Devendra Fadnavis" }, designation: { en: "Chief Minister" }, organization: { en: "State of Maharashtra" }, photoUrl: "/images/figma/leaders/cm.png" },
        { name: { en: "Hon. MR. Eknath Shinde" }, designation: { en: "Deputy Chief Minister" }, organization: { en: "State of Maharashtra" }, photoUrl: "/images/figma/leaders/dcm1.png" },
        { name: { en: "Hon. Shri. Sunetra Pawar" }, designation: { en: "Deputy Chief Minister" }, organization: { en: "State of Maharashtra" }, photoUrl: "/images/figma/leaders/dcm2.png" },
        { name: { en: "Hon. Mr. Jayakumar Gore" }, designation: { en: "Minister, Rural Development and Panchayat Raj Department" }, organization: { en: "State of Maharashtra" }, photoUrl: "/images/figma/leaders/minister.png" },
        { name: { en: "Hon. Mr. Yogesh Kadam" }, designation: { en: "Minister of State, Rural Development and Panchayat Raj Department" }, organization: { en: "State of Maharashtra" }, photoUrl: "/images/figma/leaders/mos.png" },
        { name: { en: "Dr. Chandrakant Pulkundwar" }, designation: { en: "Principal Secretary, Rural Development and Panchayat Raj Department" }, organization: { en: "State of Maharashtra" }, photoUrl: "/images/figma/leaders/secretary.png" },
        { name: { en: "Smt Sheetal Teli-Ugale" }, designation: { en: "Divisional Commissioner (Pune)" }, organization: { en: "State of Maharashtra" }, photoUrl: "/images/figma/leaders/commissioner.png" },
      ],
    },
  },
  {
    sectionKey: "notices",
    sortOrder: 50,
    data: {
      heading: { en: "Notice & Announcement" },
      subheading: { en: "Chief Minister's Prosperous Panchayat Raj Mission" },
      viewAll: { href: "page:announcements" },
      tabs: [
        {
          key: "announcements",
          label: { en: "Announcements" },
          items: [
            { day: "10", monthYear: "Jul 2025", title: { en: "Gram Sabha Meeting — 15 August 2025 at GP Office" }, isNew: true },
            { day: "05", monthYear: "Jul 2025", title: { en: "PM Awas Yojana — Final Beneficiary List 2025-26 Published" }, isNew: true },
            { day: "01", monthYear: "Jul 2025", title: { en: "ODF++ Status Achievement — Official Order Received" } },
            { day: "28", monthYear: "Jun 2025", title: { en: "Water Pipeline Project — Commencement Notice to Residents" } },
            { day: "20", monthYear: "Jun 2025", title: { en: "Property Tax Drive 2025-26 — 10% Discount for Early Payment" } },
          ],
        },
        { key: "govt-resolutions", label: { en: "Govt. Resolutions" }, items: [] },
        { key: "circulars", label: { en: "Circulars" }, items: [] },
        { key: "tenders", label: { en: "Tenders" }, items: [] },
      ],
    },
  },
];
