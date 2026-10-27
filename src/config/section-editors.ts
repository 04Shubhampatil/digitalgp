import type { PageKey } from "@/config/pages";

/**
 * Frontend editor specs for the backend section registry (src/config/sections.ts).
 * The backend owns the zod schemas and validates every draft; these specs only describe
 * which inputs to render. Field names and nesting mirror the schema exactly so the form
 * value can be sent as `data` unchanged (after stripping empty values).
 *
 * Adding a backend section = add its spec here (and a public renderer in components/public/sections).
 */
export type FieldType =
  | "bilingual" // { en?, mr? } single line
  | "bilingualLong" // { en?, mr? } multi-line
  | "text"
  | "number"
  | "integer"
  | "href"
  | "phone"
  | "email"
  | "image"; // Media id (IMAGE kind) — shows preview + upload

export interface FieldSpec {
  name: string;
  type: FieldType;
  /** i18n key under `editor.fields.*` */
  labelKey: string;
  required?: boolean;
  /** For `bilingual`/`text`: max characters (backend `text(n)`). */
  max?: number;
  placeholder?: string;
}

export interface ItemsSpec {
  name: string; // e.g. "items"
  labelKey: string;
  min: number;
  max: number;
  fields: FieldSpec[];
}

export interface GroupSpec {
  /** Nested object field, e.g. hero.cta */
  name: string;
  labelKey: string;
  fields: FieldSpec[];
}

export interface SectionEditorSpec {
  key: string;
  labelKey: string;
  descriptionKey?: string;
  fields: FieldSpec[];
  groups?: GroupSpec[];
  items?: ItemsSpec;
}

const bilingual = (name: string, labelKey: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "bilingual", labelKey, max: 200, ...extra });
const bilingualLong = (name: string, labelKey: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({ name, type: "bilingualLong", labelKey, max: 20_000, ...extra });

const home: SectionEditorSpec[] = [
  {
    key: "hero",
    labelKey: "hero",
    descriptionKey: "heroDesc",
    fields: [bilingual("title", "title", { required: true }), bilingual("subtitle", "subtitle"), { name: "backgroundImageId", type: "image", labelKey: "backgroundImage" }],
    groups: [{ name: "cta", labelKey: "cta", fields: [bilingual("label", "ctaLabel"), { name: "href", type: "href", labelKey: "link" }] }],
  },
  {
    key: "quick-stats",
    labelKey: "quickStats",
    descriptionKey: "quickStatsDesc",
    fields: [],
    items: {
      name: "items",
      labelKey: "stat",
      min: 1,
      max: 8,
      fields: [bilingual("label", "label", { required: true }), { name: "value", type: "text", labelKey: "value", max: 40, required: true }, { name: "icon", type: "text", labelKey: "icon", max: 40 }],
    },
  },
  {
    key: "welcome",
    labelKey: "welcome",
    descriptionKey: "welcomeDesc",
    fields: [bilingual("heading", "heading", { required: true }), bilingualLong("body", "body", { required: true }), { name: "imageId", type: "image", labelKey: "image" }],
  },
  {
    key: "leaders",
    labelKey: "leaders",
    descriptionKey: "leadersDesc",
    fields: [bilingual("heading", "heading")],
    items: {
      name: "items",
      labelKey: "leader",
      min: 1,
      max: 20,
      fields: [bilingual("name", "name", { required: true }), bilingual("designation", "designation", { required: true }), { name: "photoId", type: "image", labelKey: "photo" }, { name: "phone", type: "phone", labelKey: "phone" }],
    },
  },
  {
    key: "quick-links",
    labelKey: "quickLinks",
    descriptionKey: "quickLinksDesc",
    fields: [],
    items: {
      name: "items",
      labelKey: "link",
      min: 1,
      max: 12,
      fields: [bilingual("label", "label", { required: true }), { name: "href", type: "href", labelKey: "link", required: true }, { name: "icon", type: "text", labelKey: "icon", max: 40 }],
    },
  },
];

const about: SectionEditorSpec[] = [
  {
    key: "overview",
    labelKey: "overview",
    fields: [bilingual("heading", "heading", { required: true }), bilingualLong("body", "body", { required: true }), { name: "imageId", type: "image", labelKey: "image" }],
  },
  { key: "history", labelKey: "history", fields: [bilingual("heading", "heading"), bilingualLong("body", "body", { required: true })] },
  {
    key: "geography",
    labelKey: "geography",
    fields: [
      { name: "areaSqKm", type: "number", labelKey: "areaSqKm" },
      { name: "population", type: "integer", labelKey: "population" },
      { name: "households", type: "integer", labelKey: "households" },
      { name: "wards", type: "integer", labelKey: "wards" },
      { name: "pinCode", type: "text", labelKey: "pinCode", max: 6 },
      bilingual("nearestCity", "nearestCity"),
      bilingualLong("description", "description"),
    ],
  },
  {
    key: "members",
    labelKey: "members",
    fields: [bilingual("heading", "heading")],
    items: {
      name: "items",
      labelKey: "member",
      min: 1,
      max: 50,
      fields: [
        bilingual("name", "name", { required: true }),
        bilingual("designation", "designation", { required: true }),
        { name: "wardNo", type: "text", labelKey: "wardNo", max: 20 },
        { name: "phone", type: "phone", labelKey: "phone" },
        { name: "photoId", type: "image", labelKey: "photo" },
      ],
    },
  },
  {
    key: "office",
    labelKey: "office",
    fields: [
      bilingualLong("address", "address", { required: true }),
      bilingual("hours", "hours"),
      { name: "phone", type: "phone", labelKey: "phone" },
      { name: "email", type: "email", labelKey: "email" },
      { name: "mapUrl", type: "href", labelKey: "mapUrl" },
    ],
  },
];

export const SECTION_EDITORS: Partial<Record<PageKey, readonly SectionEditorSpec[]>> = { home, about };

export function editorSpec(pageKey: string, sectionKey: string): SectionEditorSpec | undefined {
  return (SECTION_EDITORS[pageKey as PageKey] ?? []).find((s) => s.key === sectionKey);
}
