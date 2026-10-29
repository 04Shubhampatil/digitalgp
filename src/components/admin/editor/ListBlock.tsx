"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useFieldArray, type Control } from "react-hook-form";
import type { FieldSpec, ItemsSpec } from "@/config/section-editors";
import { emptyRow, type FormRecord } from "@/lib/section-data";
import { FieldInput } from "./FieldInput";
import { NestedItems } from "./NestedItems";

/** Column width per field type in the table layout. */
export function columnsFor(fields: FieldSpec[]): string {
  const widths = fields.map((f) => {
    if (f.type === "image" || f.type === "file") return "minmax(10rem,11rem)";
    if (f.type === "bilingual" || f.type === "bilingualLong" || f.type === "bilingualList") return "minmax(10rem,1.6fr)";
    if (f.type === "boolean") return "4.5rem";
    if (f.type === "colour") return "minmax(8rem,9rem)";
    if (f.type === "select" || f.type === "date" || f.type === "time" || f.type === "datetime" || f.type === "month") return "minmax(7.5rem,9rem)";
    if (f.type === "imageList" || f.type === "multiSelect") return "minmax(12rem,1.4fr)";
    return "minmax(5.5rem,1fr)";
  });
  return `2rem ${widths.join(" ")} 6.5rem`;
}

/** One list of a section as a table (order, one column per field, row actions); cards when rows nest a list. */
export function ListBlock({
  control,
  tenantId,
  spec,
  path,
  errors,
  canEdit,
  onAppend,
}: {
  control: Control<FormRecord>;
  tenantId: string;
  spec: ItemsSpec;
  /** Dotted form path of the array (e.g. `items`, `overviewCard.fields`). */
  path: string;
  errors: Record<string, string>;
  canEdit: boolean;
  /** Hands the parent an "append a blank row" function (used by the section header button). */
  onAppend?: (append: () => void) => void;
}) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const rows = useFieldArray({ control, name: path as never });
  const append = () => rows.append(emptyRow(spec) as never);

  useEffect(() => {
    onAppend?.(() => rows.append(emptyRow(spec) as never));
  }, [onAppend, rows, spec]);

  const one = t.has(`itemOne.${spec.labelKey}`) ? t(`itemOne.${spec.labelKey}`) : t(`fields.${spec.labelKey}`);
  const full = rows.fields.length >= spec.max;

  if (spec.children) {
    return (
      <div className="grid gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          {t(`fields.${spec.labelKey}`)} ({rows.fields.length}/{spec.max})
        </p>
        <NestedItems control={control} tenantId={tenantId} spec={spec} path={path} errors={errors} canEdit={canEdit} rows={rows} />
        {canEdit && (
          <button type="button" disabled={full} onClick={append} className="flex w-full items-center justify-center gap-2 rounded-input border border-dashed border-primary/40 py-3 text-sm font-semibold text-primary hover:bg-success-soft disabled:opacity-40">
            <Plus className="size-4" aria-hidden /> {t("addNew", { name: one })}
          </button>
        )}
      </div>
    );
  }

  const columns = columnsFor(spec.fields);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem]">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          {t(`fields.${spec.labelKey}`)} ({rows.fields.length}/{spec.max})
        </p>
        {errors[path] && (
          <p role="alert" className="mb-2 text-xs text-danger">
            {errors[path]}
          </p>
        )}
        <div role="row" className="grid items-center gap-3 rounded-input bg-surface-soft px-3 py-2 text-[11px] font-semibold tracking-wide text-muted uppercase" style={{ gridTemplateColumns: columns }}>
          <span>{t("order")}</span>
          {spec.fields.map((f) => (
            <span key={f.name}>{t(`fields.${f.labelKey}`)}</span>
          ))}
          <span className="text-right">{tc("actions")}</span>
        </div>
        <ol>
          {rows.fields.map((row, i) => (
            <li key={row.id} role="row" className="grid items-start gap-3 border-b border-line px-3 py-3 last:border-b-0" style={{ gridTemplateColumns: columns }}>
              <span className="pt-2.5 text-sm font-semibold text-muted">{i + 1}</span>
              {spec.fields.map((f) => (
                <FieldInput key={f.name} compact spec={f} path={`${path}.${i}.${f.name}`} control={control} tenantId={tenantId} error={errors[`${path}.${i}.${f.name}`]} />
              ))}
              <div className="flex items-center justify-end gap-1 pt-1.5">
                <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => rows.move(i, i - 1)} className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-40">
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" aria-label={t("moveDown")} disabled={i === rows.fields.length - 1} onClick={() => rows.move(i, i + 1)} className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-40">
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button type="button" aria-label={tc("delete")} onClick={() => rows.remove(i)} className="rounded p-1 text-danger hover:bg-danger-soft">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
        {canEdit && (
          <button type="button" disabled={full} onClick={append} className="mt-3 flex w-full items-center justify-center gap-2 rounded-input border border-dashed border-primary/40 py-3 text-sm font-semibold text-primary hover:bg-success-soft disabled:opacity-40">
            <Plus className="size-4" aria-hidden /> {t("addNew", { name: one })}
          </button>
        )}
      </div>
    </div>
  );
}
