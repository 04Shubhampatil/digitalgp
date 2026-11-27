"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { AdminUnitDto, AdminUnitLevel, AssignmentDto } from "@/types/api";
import { Select } from "@/components/ui/Select";
import { LEVEL_ORDER, hierarchy } from "@/lib/api/admin";

export interface UnitPickerProps {
  /** The caller's active assignments — their units are the roots the user may navigate from. */
  assignments: AssignmentDto[];
  /** Deepest level the picker offers (e.g. GRAM_PANCHAYAT for website creation). */
  targetLevel: AdminUnitLevel;
  /** Fires with the current selection: a unit at `targetLevel`, or (when `allowIntermediate`) any chosen unit; null while nothing valid is chosen. */
  onChange: (unit: AdminUnitDto | null) => void;
  allowIntermediate?: boolean;
  error?: string;
  disabled?: boolean;
}

function rootAsUnit(a: AssignmentDto): AdminUnitDto {
  return {
    id: a.unitId,
    level: a.unitLevel,
    nameEn: a.unitNameEn,
    nameMr: a.unitNameMr,
    slug: "",
    code: null,
    parentId: null,
    path: "",
    tenantId: a.tenantId,
  };
}

/**
 * Cascading State → District → Taluka → Block → Gram Panchayat picker over GET /hierarchy/units.
 * Roots come from the user's assignments (their scope), so a taluka admin starts at their taluka.
 */
export function UnitPicker({ assignments, targetLevel, onChange, allowIntermediate = false, error, disabled }: UnitPickerProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const roots = useMemo(() => {
    const seen = new Map<string, AdminUnitDto>();
    for (const a of assignments) if (!a.revokedAt && !seen.has(a.unitId)) seen.set(a.unitId, rootAsUnit(a));
    return [...seen.values()];
  }, [assignments]);

  const [root, setRoot] = useState<AdminUnitDto | null>(roots.length === 1 ? (roots[0] ?? null) : null);
  const [path, setPath] = useState<AdminUnitDto[]>([]);
  // Children of the deepest selection, keyed by "<parentId>:<level>" so stale loads are ignored.
  const [loaded, setLoaded] = useState<{ key: string; items: AdminUnitDto[]; error: string | null } | null>(null);

  const current = path[path.length - 1] ?? root;
  const nextLevel: AdminUnitLevel | null =
    current && LEVEL_ORDER.indexOf(current.level) < LEVEL_ORDER.indexOf(targetLevel)
      ? (LEVEL_ORDER[LEVEL_ORDER.indexOf(current.level) + 1] ?? null)
      : null;
  const loadKey = current && nextLevel ? `${current.id}:${nextLevel}` : null;

  useEffect(() => {
    if (!loadKey || !current || !nextLevel) return;
    let cancelled = false;
    // A level may be skipped in the hierarchy (e.g. Gram Panchayats directly under a taluka, no block), so load the
    // unit's real children and keep those no deeper than the target level.
    const maxDepth = LEVEL_ORDER.indexOf(targetLevel);
    hierarchy
      .list({ parentId: current.id, limit: 100 })
      .then((page) => {
        const items = page.data.filter((c) => LEVEL_ORDER.indexOf(c.level) <= maxDepth);
        if (!cancelled) setLoaded({ key: loadKey, items, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoaded({ key: loadKey, items: [], error: err instanceof Error ? err.message : "Failed to load" });
      });
    return () => {
      cancelled = true;
    };
  }, [loadKey, current, nextLevel, targetLevel]);

  const children = loaded?.key === loadKey ? loaded.items : [];
  const loading = !!loadKey && loaded?.key !== loadKey;
  const loadError = loaded?.key === loadKey ? loaded.error : null;
  // Label the select by the children's own level when they share one (a skipped level shows the real one).
  const childLevel: AdminUnitLevel | null = children.length > 0 && children.every((c) => c.level === children[0]!.level) ? children[0]!.level : nextLevel;

  useEffect(() => {
    if (current && (current.level === targetLevel || allowIntermediate)) onChange(current);
    else onChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass inline handlers; re-running on identity change would loop
  }, [current, targetLevel, allowIntermediate]);

  const levelLabel = (l: AdminUnitLevel) => t(`level.${l}`);
  // Units show in the admin's language (the Marathi name on the Marathi admin, when there is one).
  const unitName = (u: { nameEn: string; nameMr?: string | null }) => (locale === "mr" && u.nameMr ? u.nameMr : u.nameEn);
  const chosen = [...(root ? [root] : []), ...path];
  // Nothing further down to choose and the current unit is already a valid choice: no empty "No units here" dropdown.
  const nothingBelow = allowIntermediate && !loading && !loadError && children.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {roots.length > 1 && !root && (
        <Select
          label={t("picker.scope")}
          value=""
          placeholder={t("picker.choose")}
          disabled={disabled}
          onChange={(e) => setRoot(roots.find((r) => r.id === e.target.value) ?? null)}
          options={roots.map((r) => ({ value: r.id, label: `${levelLabel(r.level)} · ${unitName(r)}` }))}
        />
      )}

      {chosen.length > 0 && (
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {chosen.map((u, i) => (
            <li key={u.id} className="inline-flex items-center gap-1 rounded-pill bg-success-soft py-1 pr-1 pl-3 text-success">
              <span className="text-[10px] uppercase opacity-70">{levelLabel(u.level)}</span>
              <span className="font-semibold">{unitName(u)}</span>
              {!disabled && (i > 0 || roots.length > 1) && (
                <button
                  type="button"
                  aria-label={t("picker.remove", { name: unitName(u) })}
                  onClick={() => {
                    if (i === 0) {
                      setRoot(null);
                      setPath([]);
                    } else setPath((p) => p.slice(0, i - 1));
                  }}
                  className="rounded-full p-0.5 hover:bg-success/10"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {nextLevel && current && !nothingBelow && (
        <Select
          label={levelLabel(childLevel ?? nextLevel)}
          value=""
          placeholder={loading ? t("picker.loading") : children.length === 0 && !loading ? t("picker.none") : t("picker.choose")}
          disabled={disabled || loading}
          error={loadError ?? (childLevel === targetLevel ? error : undefined)}
          onChange={(e) => {
            const unit = children.find((c) => c.id === e.target.value);
            if (unit) setPath((p) => [...p, unit]);
          }}
          options={children.map((c) => ({ value: c.id, label: unitName(c) }))}
        />
      )}
      {!nextLevel && error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
