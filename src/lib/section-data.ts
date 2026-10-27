import type { FieldSpec, SectionEditorSpec } from "@/config/section-editors";

/**
 * Convert between the editor form values and the section JSON the backend validates.
 * Form values keep every field present (strings, "" for empty); the API payload must omit
 * empty values because the registry schemas are `.strict()` with optional keys.
 */
export type FormRecord = Record<string, unknown>;

function emptyField(f: FieldSpec): unknown {
  switch (f.type) {
    case "bilingual":
    case "bilingualLong":
      return { en: "", mr: "" };
    default:
      return "";
  }
}

export function emptyValues(spec: SectionEditorSpec): FormRecord {
  const v: FormRecord = {};
  for (const f of spec.fields) v[f.name] = emptyField(f);
  for (const g of spec.groups ?? []) v[g.name] = Object.fromEntries(g.fields.map((f) => [f.name, emptyField(f)]));
  if (spec.items) v[spec.items.name] = [];
  return v;
}

export function emptyItem(spec: SectionEditorSpec): FormRecord {
  return Object.fromEntries((spec.items?.fields ?? []).map((f) => [f.name, emptyField(f)]));
}

/** API data → form values (fill in every field so inputs are controlled). */
export function toFormValues(spec: SectionEditorSpec, data: Record<string, unknown> | null | undefined): FormRecord {
  const base = emptyValues(spec);
  if (!data) return base;
  const fill = (fields: FieldSpec[], src: Record<string, unknown>, dst: FormRecord) => {
    for (const f of fields) {
      const raw = src[f.name];
      if (f.type === "bilingual" || f.type === "bilingualLong") {
        const b = (raw ?? {}) as { en?: string; mr?: string };
        dst[f.name] = { en: b.en ?? "", mr: b.mr ?? "" };
      } else if (raw === undefined || raw === null) {
        dst[f.name] = "";
      } else {
        dst[f.name] = String(raw);
      }
    }
  };
  fill(spec.fields, data, base);
  for (const g of spec.groups ?? []) {
    const sub = (data[g.name] ?? {}) as Record<string, unknown>;
    const dst: FormRecord = {};
    fill(g.fields, sub, dst);
    base[g.name] = dst;
  }
  if (spec.items) {
    const rows = Array.isArray(data[spec.items.name]) ? (data[spec.items.name] as Record<string, unknown>[]) : [];
    base[spec.items.name] = rows.map((row) => {
      const dst: FormRecord = {};
      fill(spec.items!.fields, row, dst);
      return dst;
    });
  }
  return base;
}

function cleanField(f: FieldSpec, raw: unknown): unknown {
  if (f.type === "bilingual" || f.type === "bilingualLong") {
    const b = (raw ?? {}) as { en?: string; mr?: string };
    const out: { en?: string; mr?: string } = {};
    if (b.en?.trim()) out.en = b.en.trim();
    if (b.mr?.trim()) out.mr = b.mr.trim();
    return Object.keys(out).length ? out : undefined;
  }
  const s = typeof raw === "string" ? raw.trim() : raw;
  if (s === "" || s === undefined || s === null) return undefined;
  if (f.type === "number") return Number(s);
  if (f.type === "integer") return Math.trunc(Number(s));
  return s;
}

/** Form values → API data: drop empty values, parse numbers, keep nesting. */
export function toApiData(spec: SectionEditorSpec, values: FormRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of spec.fields) {
    const v = cleanField(f, values[f.name]);
    if (v !== undefined) out[f.name] = v;
  }
  for (const g of spec.groups ?? []) {
    const src = (values[g.name] ?? {}) as FormRecord;
    const sub: Record<string, unknown> = {};
    for (const f of g.fields) {
      const v = cleanField(f, src[f.name]);
      if (v !== undefined) sub[f.name] = v;
    }
    if (Object.keys(sub).length) out[g.name] = sub;
  }
  if (spec.items) {
    const rows = Array.isArray(values[spec.items.name]) ? (values[spec.items.name] as FormRecord[]) : [];
    out[spec.items.name] = rows.map((row) => {
      const sub: Record<string, unknown> = {};
      for (const f of spec.items!.fields) {
        const v = cleanField(f, row[f.name]);
        if (v !== undefined) sub[f.name] = v;
      }
      return sub;
    });
  }
  return out;
}

/** Client-side required check (the backend validates the rest). Returns dotted paths → message key. */
export function requiredErrors(spec: SectionEditorSpec, values: FormRecord): Record<string, "required"> {
  const errors: Record<string, "required"> = {};
  const check = (fields: FieldSpec[], src: FormRecord, prefix: string) => {
    for (const f of fields) {
      if (!f.required) continue;
      const v = cleanField(f, src[f.name]);
      if (v === undefined) errors[`${prefix}${f.name}`] = "required";
    }
  };
  check(spec.fields, values, "");
  if (spec.items) {
    const rows = Array.isArray(values[spec.items.name]) ? (values[spec.items.name] as FormRecord[]) : [];
    rows.forEach((row, i) => check(spec.items!.fields, row, `${spec.items!.name}.${i}.`));
  }
  return errors;
}
