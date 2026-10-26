"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { TenantDto } from "@/types/api";
import { Select } from "@/components/ui/Select";
import { tenants } from "@/lib/api/admin";

/** Dropdown over the websites in the caller's scope (GET /tenants, first 100). */
export function TenantSelect({
  value,
  onChange,
  label,
  error,
  disabled,
}: {
  value: string;
  onChange: (tenantId: string, tenant: TenantDto | null) => void;
  label: string;
  error?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("admin");
  const [items, setItems] = useState<TenantDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    tenants
      .list({ limit: 100 })
      .then((p) => !cancelled && setItems(p.data))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select
      label={label}
      value={value}
      disabled={disabled || loading}
      error={error}
      placeholder={loading ? t("picker.loading") : t("picker.choose")}
      onChange={(e) => onChange(e.target.value, items.find((i) => i.id === e.target.value) ?? null)}
      options={items.map((i) => ({ value: i.id, label: `${i.nameEn} (/${i.slug})` }))}
    />
  );
}
