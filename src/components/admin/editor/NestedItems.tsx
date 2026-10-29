"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFieldArray, type Control } from "react-hook-form";
import type { ItemsSpec } from "@/config/section-editors";
import { emptyRow, type FormRecord } from "@/lib/section-data";
import { cn } from "@/lib/cn";
import { FieldInput } from "./FieldInput";

/** Rows of a nested list (e.g. the indicators of one ward) laid out as a small table. */
function ChildRows({ control, tenantId, parent, base, errors, canEdit }: { control: Control<FormRecord>; tenantId: string; parent: ItemsSpec; base: string; errors: Record<string, string>; canEdit: boolean }) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const child = parent.children!;
  const rows = useFieldArray({ control, name: `${base}.${child.name}` as never });
  const columns = `2rem ${child.fields.map((f) => (f.type === "bilingual" ? "minmax(12rem,1.6fr)" : "minmax(7rem,1fr)")).join(" ")} 6.5rem`;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[40rem]">
        <div role="row" className="grid items-center gap-3 rounded-input bg-surface-soft px-3 py-2 text-[11px] font-semibold tracking-wide text-muted uppercase" style={{ gridTemplateColumns: columns }}>
          <span>{t("order")}</span>
          {child.fields.map((f) => (
            <span key={f.name}>{t(`fields.${f.labelKey}`)}</span>
          ))}
          <span className="text-right">{tc("actions")}</span>
        </div>
        {errors[`${base}.${child.name}`] && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {errors[`${base}.${child.name}`]}
          </p>
        )}
        <ol>
          {rows.fields.map((row, j) => (
            <li key={row.id} role="row" className="grid items-start gap-3 border-b border-line px-3 py-3 last:border-b-0" style={{ gridTemplateColumns: columns }}>
              <span className="pt-2.5 text-sm font-semibold text-muted">{j + 1}</span>
              {child.fields.map((f) => (
                <FieldInput key={f.name} compact spec={f} path={`${base}.${child.name}.${j}.${f.name}`} control={control} tenantId={tenantId} error={errors[`${base}.${child.name}.${j}.${f.name}`]} />
              ))}
              <div className="flex items-center justify-end gap-1 pt-1.5">
                <button type="button" aria-label={t("moveUp")} disabled={j === 0} onClick={() => rows.move(j, j - 1)} className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-40">
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button type="button" aria-label={t("moveDown")} disabled={j === rows.fields.length - 1} onClick={() => rows.move(j, j + 1)} className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-40">
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button type="button" aria-label={tc("delete")} onClick={() => rows.remove(j)} className="rounded p-1 text-danger hover:bg-danger-soft">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ol>
        {canEdit && (
          <button
            type="button"
            disabled={rows.fields.length >= child.max}
            onClick={() => rows.append(emptyRow({ ...child, children: undefined }) as never)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-input border border-dashed border-primary/40 py-2 text-sm font-semibold text-primary hover:bg-success-soft disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden /> {t("addNew", { name: t.has(`itemOne.${child.labelKey}`) ? t(`itemOne.${child.labelKey}`) : t(`fields.${child.labelKey}`) })}
          </button>
        )}
      </div>
    </div>
  );
}

/** The parts of a react-hook-form field array this component uses. */
export interface RowOps {
  fields: { id: string }[];
  move: (from: number, to: number) => void;
  remove: (index: number) => void;
}

/** A list whose rows each hold a nested list (ward-details: wards → indicators). One card per row. */
export function NestedItems({ control, tenantId, spec, path, errors, canEdit, rows }: { control: Control<FormRecord>; tenantId: string; spec: ItemsSpec; path: string; errors: Record<string, string>; canEdit: boolean; rows: RowOps }) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  return (
    <div className="grid gap-4">
      {errors[path] && (
        <p role="alert" className="text-xs text-danger">
          {errors[path]}
        </p>
      )}
      {rows.fields.map((row, i) => (
        <div key={row.id} className={cn("rounded-input border border-line bg-canvas p-4")}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                {t(`fields.${spec.labelKey}`)} {i + 1}
              </p>
              <div className="grid gap-3">
                {spec.fields.map((f) => (
                  <FieldInput key={f.name} spec={f} path={`${path}.${i}.${f.name}`} control={control} tenantId={tenantId} error={errors[`${path}.${i}.${f.name}`]} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => rows.move(i, i - 1)} className="rounded p-1 text-muted hover:bg-surface disabled:opacity-40">
                <ArrowUp className="size-4" aria-hidden />
              </button>
              <button type="button" aria-label={t("moveDown")} disabled={i === rows.fields.length - 1} onClick={() => rows.move(i, i + 1)} className="rounded p-1 text-muted hover:bg-surface disabled:opacity-40">
                <ArrowDown className="size-4" aria-hidden />
              </button>
              <button type="button" aria-label={tc("delete")} onClick={() => rows.remove(i)} className="rounded p-1 text-danger hover:bg-danger-soft">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <ChildRows control={control} tenantId={tenantId} parent={spec} base={`${path}.${i}`} errors={errors} canEdit={canEdit} />
        </div>
      ))}
    </div>
  );
}
