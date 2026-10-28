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
        { label: { en: "Agriculture Area (ha)" }, value: "1,243" },
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
    sortOrder: 30,
    data: {
      heading: { en: "Village Indicators" },
      period: { en: "this month" },
      items: [
        { label: { en: "Population" }, value: "2,857", change: "+1.2%" },
        { label: { en: "Literacy Rate" }, value: "91.4%", change: "+2.3%" },
        { label: { en: "Health Coverage" }, value: "96%", change: "+1.5%" },
        { label: { en: "Water Supply" }, value: "100%", change: "+0.5%" },
        { label: { en: "Electricity Supply" }, value: "91.4%", change: "+0.8%" },
        { label: { en: "Scheme Beneficiaries" }, value: "1,245", change: "+3.6%" },
        { label: { en: "Gram Sabha Participation" }, value: "78%", change: "+5.4%" },
        { label: { en: "Grievance Redressal (resolved)" }, value: "92%", change: "+4.1%" },
        { label: { en: "Tree Plantation (total trees)" }, value: "18,560", change: "+8.7%" },
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
    sortOrder: 40,
    data: {
      heading: { en: "Ward Details" },
      wards: [
        {
          name: { en: "Ward 1" },
          items: [
            { label: { en: "Roads Completed" }, valueText: "8.2 km / 10 km" },
            { label: { en: "Water Pipeline" }, valueText: "2,450 / 3,000" },
            { label: { en: "Street Lights" }, valueText: "6.5 km / 8 km" },
            { label: { en: "Drainage" }, valueText: "98 / 120" },
            { label: { en: "Plantation" }, valueText: "1,250 / 1,500" },
            { label: { en: "Ongoing Projects" }, valueText: "12 / 15" },
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
];
