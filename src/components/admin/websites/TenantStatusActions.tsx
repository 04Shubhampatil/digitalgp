"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TenantStatus } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { tenants } from "@/lib/api/admin";

/** Publish / unpublish / suspend a website via POST /tenants/:id/status. */
export function TenantStatusActions({ tenantId, status, canPublish }: { tenantId: string; status: TenantStatus; canPublish: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!canPublish) return null;

  const change = (next: TenantStatus) =>
    start(async () => {
      setError(null);
      try {
        await tenants.setStatus(tenantId, next);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "PUBLISHED" && (
        <Button loading={pending} onClick={() => change("PUBLISHED")}>
          {t("websites.publish")}
        </Button>
      )}
      {status === "PUBLISHED" && (
        <Button variant="secondary" loading={pending} onClick={() => change("DRAFT")}>
          {t("websites.unpublish")}
        </Button>
      )}
      {status !== "SUSPENDED" && (
        <Button variant="danger" loading={pending} onClick={() => change("SUSPENDED")}>
          {t("websites.suspend")}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
