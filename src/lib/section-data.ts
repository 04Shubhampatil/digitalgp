import type { FieldSpec, GroupSpec, ItemsSpec, SectionEditorSpec } from "@/config/section-editors";

/**
 * Convert between the editor form values and the section JSON the backend validates.
 * Form values keep every field present (strings, "" for empty, booleans, arrays); the API payload must
 * omit empty values because the registry schemas are `.strict()` with optional keys.
 */
export type FormRecord = Record<string, unknown>;

type Bilingual = { en?: string; mr?: string };

// ----------------------------------------------------------------------------- defaults

function emptyField(f: FieldSpec): unknown {
  switch (f.type) {
    case "bilingual":
    case "bilingualLong":
      return { en: "", mr: "" };
    case "boolean":
      return typeof f.default === "boolean" ? f.default : false;
    case "select":
      return f.default !== undefined ? String(f.default) : f.required ? (f.options?.[0] ?? "") : "";
    case "bilingualList":
    case "imageList":
    case "multiSelect":
      return [];
    default:
      return f.default !== undefined ? String(f.default) : "";
  }
}

function emptyFields(fields: FieldSpec[]): FormRecord {
  return Object.fromEntries(fields.map((f) => [f.name, emptyField(f)]));
}

/** One blank row for an items list, including a starter row for its nested list. */
export function emptyRow(items: ItemsSpec): FormRecord {
  const row: FormRecord = emptyFields(items.fields);
  if (items.children) row[items.children.name] = [emptyRow({ ...items.children, children: undefined })];
  return row;
}

function emptyGroup(g: GroupSpec): FormRecord {
  const v = emptyFields(g.fields);
  for (const l of g.lists ?? []) v[l.name] = [];
  return v;
}

/** Every top-level list of a section: the primary `items` first, then `lists`. */
export function topLists(spec: SectionEditorSpec): ItemsSpec[] {
  return [...(spec.items ? [spec.items] : []), ...(spec.lists ?? [])];
}

export function emptyValues(spec: SectionEditorSpec): FormRecord {
  const v = emptyFields(spec.fields);
  for (const g of spec.groups ?? []) v[g.name] = emptyGroup(g);
  for (const l of topLists(spec)) v[l.name] = [];
  return v;
}

export function emptyItem(spec: SectionEditorSpec): FormRecord {
  return spec.items ? emptyRow(spec.items) : {};
}

// ----------------------------------------------------------------------------- API → form

/** ISO instant → value of a `datetime-local` input (local time). */
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fillFields(fields: FieldSpec[], src: Record<string, unknown>, dst: FormRecord) {
  for (const f of fields) {
    const raw = src[f.name];
    switch (f.type) {
      case "bilingual":
      case "bilingualLong": {
        const b = (raw ?? {}) as Bilingual;
        dst[f.name] = { en: b.en ?? "", mr: b.mr ?? "" };
        break;
      }
      case "boolean":
        dst[f.name] = typeof raw === "boolean" ? raw : emptyField(f);
        break;
      case "bilingualList":
        dst[f.name] = (Array.isArray(raw) ? (raw as Bilingual[]) : []).map((b) => ({ en: b?.en ?? "", mr: b?.mr ?? "" }));
        break;
      case "imageList":
      case "multiSelect":
        dst[f.name] = Array.isArray(raw) ? raw.map(String) : [];
        break;
      case "datetime":
        dst[f.name] = typeof raw === "string" ? isoToLocal(raw) : "";
        break;
      default:
        dst[f.name] = raw === undefined || raw === null ? emptyField(f) : String(raw);
    }
  }
}

function fillRow(items: ItemsSpec, src: Record<string, unknown>): FormRecord {
  const dst: FormRecord = {};
  fillFields(items.fields, src, dst);
  if (items.children) dst[items.children.name] = fillList(items.children, src[items.children.name]);
  return dst;
}

function fillList(items: ItemsSpec, raw: unknown): FormRecord[] {
  const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return rows.map((r) => fillRow(items, r));
}

/** API data → form values (fill in every field so inputs are controlled). */
export function toFormValues(spec: SectionEditorSpec, data: Record<string, unknown> | null | undefined): FormRecord {
  const base = emptyValues(spec);
  if (!data) return base;
  fillFields(spec.fields, data, base);
  for (const g of spec.groups ?? []) {
    const sub = (data[g.name] ?? {}) as Record<string, unknown>;
    const dst: FormRecord = {};
    fillFields(g.fields, sub, dst);
    for (const l of g.lists ?? []) dst[l.name] = fillList(l, sub[l.name]);
    base[g.name] = dst;
  }
  for (const l of topLists(spec)) base[l.name] = fillList(l, data[l.name]);
  return base;
}

// ----------------------------------------------------------------------------- form → API

function cleanField(f: FieldSpec, raw: unknown): unknown {
  switch (f.type) {
    case "bilingual":
    case "bilingualLong": {
      const b = (raw ?? {}) as Bilingual;
      const out: Bilingual = {};
      if (b.en?.trim()) out.en = b.en.trim();
      if (b.mr?.trim()) out.mr = b.mr.trim();
      return Object.keys(out).length ? out : undefined;
    }
    case "boolean":
      return raw === true;
    case "bilingualList": {
      const list = Array.isArray(raw) ? (raw as Bilingual[]) : [];
      return list.map((b) => cleanField({ ...f, type: "bilingual" }, b)).filter((b) => b !== undefined);
    }
    case "imageList":
    case "multiSelect":
      return (Array.isArray(raw) ? raw : []).map((v) => String(v).trim()).filter(Boolean);
    case "datetime": {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) return undefined;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? s : d.toISOString();
    }
    default: {
      const s = typeof raw === "string" ? raw.trim() : raw;
      if (s === "" || s === undefined || s === null) return undefined;
      if (f.type === "number") return Number(s);
      if (f.type === "integer") return Math.trunc(Number(s));
      return s;
    }
  }
}

function cleanFields(fields: FieldSpec[], row: FormRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = cleanField(f, row[f.name]);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

function cleanRow(items: ItemsSpec, row: FormRecord): Record<string, unknown> {
  const sub = cleanFields(items.fields, row);
  if (items.children) sub[items.children.name] = cleanList(items.children, row[items.children.name]);
  return sub;
}

function cleanList(items: ItemsSpec, raw: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(raw) ? (raw as FormRecord[]) : [];
  return rows.map((r) => cleanRow(items, r));
}

/** True when an optional object differs from its untouched defaults (anything typed, switched or chosen). */
function isMeaningful(g: GroupSpec, sub: Record<string, unknown>): boolean {
  for (const f of g.fields) {
    if (JSON.stringify(sub[f.name]) !== JSON.stringify(cleanField(f, emptyField(f)))) return true;
  }
  return (g.lists ?? []).some((l) => Array.isArray(sub[l.name]) && (sub[l.name] as unknown[]).length > 0);
}

/** Form values → API data: drop empty values, parse numbers, keep nesting. */
export function toApiData(spec: SectionEditorSpec, values: FormRecord): Record<string, unknown> {
  const out = cleanFields(spec.fields, values);
  for (const g of spec.groups ?? []) {
    const src = (values[g.name] ?? {}) as FormRecord;
    const sub = cleanFields(g.fields, src);
    for (const l of g.lists ?? []) sub[l.name] = cleanList(l, src[l.name]);
    if (g.optional ? isMeaningful(g, sub) : Object.keys(sub).length) out[g.name] = sub;
  }
  for (const l of topLists(spec)) out[l.name] = cleanList(l, values[l.name]);
  return out;
}

// ----------------------------------------------------------------------------- validation

/** Client-side required check (the backend validates the rest). Returns dotted paths → message key. */
export function requiredErrors(spec: SectionEditorSpec, values: FormRecord): Record<string, "required"> {
  const errors: Record<string, "required"> = {};
  const check = (fields: FieldSpec[], src: FormRecord, prefix: string) => {
    for (const f of fields) {
      if (!f.required) continue;
      const v = cleanField(f, src[f.name]);
      if (v === undefined || (Array.isArray(v) && v.length === 0)) errors[`${prefix}${f.name}`] = "required";
    }
  };
  const walk = (items: ItemsSpec, list: FormRecord[], prefix: string) =>
    list.forEach((row, i) => {
      const at = `${prefix}${items.name}.${i}.`;
      check(items.fields, row, at);
      if (items.children) walk(items.children, Array.isArray(row[items.children.name]) ? (row[items.children.name] as FormRecord[]) : [], at);
    });
  check(spec.fields, values, "");
  for (const g of spec.groups ?? []) {
    const src = (values[g.name] ?? {}) as FormRecord;
    const sub = cleanFields(g.fields, src);
    for (const l of g.lists ?? []) sub[l.name] = cleanList(l, src[l.name]);
    if (g.optional && !isMeaningful(g, sub)) continue;
    check(g.fields, src, `${g.name}.`);
    for (const l of g.lists ?? []) walk(l, Array.isArray(src[l.name]) ? (src[l.name] as FormRecord[]) : [], `${g.name}.`);
  }
  for (const l of topLists(spec)) walk(l, Array.isArray(values[l.name]) ? (values[l.name] as FormRecord[]) : [], "");
  return errors;
}
