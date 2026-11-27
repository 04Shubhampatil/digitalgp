"use client";

import { useTranslations } from "next-intl";
import type { ModuleKey } from "@/types/api";
import { MODULE_KEYS } from "@/config/modules";

export interface ModuleGrant {
  moduleKey: ModuleKey;
  canWrite: boolean;
}

/** Module checklist for a Data Entry Operator (same controls as the Create User form). */
export function ModuleGrants({ value, onChange, error }: { value: ModuleGrant[]; onChange: (v: ModuleGrant[]) => void; error?: string }) {
  const t = useTranslations("admin");
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("websiteSetup.modulesLabel")}</legend>
      <ul className="grid gap-2 sm:grid-cols-2">
        {MODULE_KEYS.map((key) => {
          const entry = value.find((m) => m.moduleKey === key);
          return (
            <li key={key} className="flex items-center justify-between rounded-input border border-line px-3 py-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={!!entry}
                  onChange={(e) => onChange(e.target.checked ? [...value, { moduleKey: key, canWrite: true }] : value.filter((m) => m.moduleKey !== key))}
                />
                <span className="font-medium text-ink">{t(`moduleNames.${key}`)}</span>
              </label>
              {entry && (
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={entry.canWrite}
                    onChange={(e) => onChange(value.map((m) => (m.moduleKey === key ? { ...m, canWrite: e.target.checked } : m)))}
                  />
                  {t("users.canWrite")}
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
