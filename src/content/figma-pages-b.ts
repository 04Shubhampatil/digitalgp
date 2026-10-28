/**
 * PLACEHOLDER CONTENT — Infrastructure, Finance and Our Village pages from the Figma file
 * (qBVt7yv0KG41onObVWfnP1). Same rules as figma-pages.ts. These pages are mostly illustrations in
 * the design (maps, dashboards, galleries), so they use `image-crops` frames with the Figma pictures
 * until real content and data replace them.
 */
import type { PageKey } from "@/config/pages";
import type { FallbackSection } from "./fallback";

const t = (en: string) => ({ en });
const P = "/images/figma/pages/";
type Crop = { w: number; h: number; l: number; t: number };
const item = (src: string, w: number, h: number, crop?: Crop, extra: Record<string, unknown> = {}) => ({ src: P + src, w, h, crop, ...extra });
const crops = (sortOrder: number, data: Record<string, unknown>): FallbackSection => ({ sectionKey: "image-crops", sortOrder, data });

const FAC = (label: string, value: string) => ({ label: t(label), value: t(value) });

export const FIGMA_PAGE_SECTIONS_B: Partial<Record<PageKey, FallbackSection[]>> = {
  infrastructure: [
    {
      sectionKey: "page-hero",
      sortOrder: 0,
      data: {
        eyebrow: t("Village Infrastructure & Public Facilities"),
        title: t("Stronger Infrastructure, Better Living —"),
        titleAccent: t("Building a Better Savardari"),
        body: t("Explore the infrastructure and public facilites available in our village that ensure a better quality of life and sustainable development for all"),
        imageUrl: P + "infra-hero.png",
      },
    },
    {
      sectionKey: "facility-grid",
      sortOrder: 5,
      data: {
        heading: t("Public Facilities Overview"),
        items: [
          FAC("Drinking Water Supply", "100% Coverage"),
          FAC("Sanitation Facilities", "98% Coverage"),
          FAC("Road & Streets", "45.6 km"),
          FAC("Street Lighting", "100% LED"),
          FAC("Schools", "2 Schools"),
          FAC("Anganwadi Centres", "2 Centres"),
          FAC("Primary Health Centre", "1 PHC"),
          FAC("Public Library", "1 Library"),
          FAC("Playground", "1 Playground"),
          FAC("SHG Centres", "5 Centres"),
          FAC("Bus Stop & Transport Facilities", "3 Bus Stops"),
          FAC("Health Camps", "12 Camps (FY 24-25)"),
          FAC("Vaccination Programmes", "100% Coverage"),
          FAC("Community Halls", "2 Halls"),
          FAC("Other Public Facilities", "8+ Services"),
        ],
      },
    },
    crops(10, {
      heading: t("Village Infrastructure Map"),
      subheading: t("Explore our village map to locate public facilities and infrastructure."),
      rows: [{ items: [item("infra-map.png", 1317, 578, { w: 104.12, h: 122.72, l: -2.03, t: -19.18 })] }],
    }),
    crops(20, {
      heading: t("Smart Village Dashboard"),
      subheading: t("Live updates and status of essential infrastructure and public services."),
      rows: [
        { items: [item("infra-dashboard.png", 1320, 326, { w: 106.9, h: 144.67, l: -3.3, t: -32.09 })] },
        { items: [item("infra-updates.png", 1320, 570, { w: 105.8, h: 113.37, l: -2.9, t: -6.51 })] },
      ],
    }),
  ],

  finance: [
    {
      sectionKey: "page-hero",
      sortOrder: 0,
      data: {
        eyebrow: t("Financial Information & Budget Transperancy"),
        title: t("Transparent Today, Stronger Tomorrow —"),
        titleAccent: t("Savardari’s Commitment to Accountability"),
        body: t("We are committed to complete transparency in financial management and the responsible use of public funds for the development of our village"),
        imageUrl: P + "fin-hero.png",
      },
    },
    crops(5, { maxWidth: 805, rows: [{ items: [item("fin-summary.png", 805, 133, { w: 104.56, h: 268.42, l: -2.39, t: -79.93 }, { shadow: true })] }] }),
    crops(10, {
      heading: t("Sources of Income"),
      rows: [
        {
          framed: true,
          gap: 10,
          items: [
            item("fin-income.png", 509, 391, { w: 304.12, h: 182.83, l: -12.52, t: -36.27 }),
            item("fin-income.png", 475, 364, { w: 275.18, h: 158.17, l: -99.4, t: -30.92 }),
            item("fin-income.png", 297, 384, { w: 440.84, h: 157.46, l: -323.1, t: -31.49 }),
          ],
        },
      ],
    }),
    crops(20, {
      heading: t("Where Your Money Goes"),
      subheading: t("See how public funds are utilized for the development and welfare of savardari"),
      rows: [{ items: [item("fin-money.png", 1321, 488, { w: 103.46, h: 129.67, l: -1.74, t: -20.6 }, { bordered: true })] }],
    }),
    crops(30, {
      heading: t("Interactive Budget Visualizer"),
      subheading: t("Explore our budget data through interactive charts and graphs"),
      rows: [{ items: [item("fin-visualizer.png", 1319, 505, { w: 103.42, h: 128.6, l: -1.61, t: -21.84 }, { bordered: true })] }],
    }),
    crops(40, {
      heading: t("Plans, Reports & Documents"),
      subheading: t("Access important plans, reports, and documents"),
      rows: [{ items: [item("fin-docs.png", 1320, 201, { w: 102.29, h: 312.67, l: -0.9, t: -121.46 }, { bordered: true })] }],
    }),
  ],

  culture: [
    {
      sectionKey: "page-hero",
      sortOrder: 0,
      data: {
        eyebrow: t("Our Village — Identity & Culture"),
        title: t("Proud of Or Heritage. Inspired by Our Culture — This is"),
        body: t("Discover the rich history, vibrant culture, and warm hospitality that makes Savardari a unique and wonderful place to live and visit"),
        actions: [
          { label: t("Explore History"), href: "page:about" },
          { label: t("View Homestay Options"), href: "page:contact" },
        ],
        imageUrl: P + "vil-hero.png",
      },
    },
    crops(10, {
      heading: t("Our Village History and Heritage"),
      rows: [
        {
          items: [
            item("vil-history.png", 450, 286, { w: 305.74, h: 231.12, l: -5.07, t: -57.18 }),
            item("vil-history.png", 861, 286, { w: 159.75, h: 231.12, l: -57.28, t: -57.18 }),
          ],
        },
      ],
    }),
    crops(20, {
      heading: t("Culture Tradition & Our Way of Life"),
      rows: [
        {
          items: [-10.54, -117.92, -224.39, -331.68].map((l) => item("vil-culture.png", 314, 459, { w: 443.37, h: 155.99, l, t: -37.6 }, { shadow: true })),
        },
        { items: [item("vil-people.png", 1320, 210, { w: 104.08, h: 309.43, l: -2.4, t: -9.87 })] },
      ],
    }),
    crops(30, {
      heading: t("Distinguished Personality of Savardari"),
      rows: [
        { items: [-11.91, -118.81, -229.99, -342.87].map((l) => item("vil-people.png", 315, 306, { w: 459.91, h: 224.91, l, t: -104.78 }, { shadow: true })) },
        {
          items: [
            item("vil-stories.png", 441, 371, { w: 324.95, h: 202.68, l: -17.45, t: 0 }, { shadow: true }),
            item("vil-stories.png", 402, 371, { w: 356.38, h: 202.68, l: -132.66, t: 0 }, { shadow: true }),
            item("vil-stories.png", 403, 371, { w: 355.65, h: 202.68, l: -237.62, t: 0 }, { shadow: true }),
          ],
        },
      ],
    }),
    crops(40, {
      heading: t("Success Stories from Our People"),
      rows: [
        {
          items: [
            item("vil-stories.png", 315, 283, { w: 463.1, h: 270.24, l: -24.6, t: -152.98 }, { bordered: true }),
            item("vil-stories.png", 315, 283, { w: 467.42, h: 272.76, l: -132.82, t: -154.24 }, { bordered: true }),
            item("vil-stories.png", 315, 283, { w: 470.27, h: 274.42, l: -235.99, t: -155.07 }, { bordered: true }),
            item("vil-stories.png", 315, 283, { w: 463.1, h: 270.24, l: -337.34, t: -152.98 }, { bordered: true }),
          ],
        },
      ],
      action: { label: t("View All Success Stories"), href: "page:culture" },
    }),
  ],
};
