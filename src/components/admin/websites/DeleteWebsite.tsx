"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TenantDto } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { tenants } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

/**
 * "Delete website" (Super Admin): removes an unpublished website and all its content → DELETE /tenants/:id. A live
 * website has to be unpublished first, and the admin types the website's address to confirm.
 */
export function DeleteWebsite({ tenant, name }: { tenant: Pick<TenantDto, "id" | "slug" | "status">; name: string }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const live = tenant.status === "PUBLISHED";

  const close = () => {
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const remove = () =>
    start(async () => {
      setError(null);
      try {
        await tenants.remove(tenant.id, typed.trim());
        router.replace("/admin/websites");
        router.refresh();
      } catch (err) {
        setError(isApiError(err) ? err.message : err instanceof Error ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <Card>
      <CardHeader title={t("websites.deleteTitle")} description={t("websites.deleteHint")} />
      <div className="px-5 pb-5">
        <Button variant="danger" onClick={() => setOpen(true)}>
          {t("websites.deleteWebsite")}
        </Button>
      </div>
      <Dialog
        open={open}
        onClose={close}
        title={t("websites.deleteWebsite")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} disabled={live || typed.trim() !== tenant.slug} onClick={remove}>
              {t("websites.deleteWebsite")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{t("websites.deleteConfirm", { name })}</p>
        {live ? (
          <p role="alert" className="mt-3 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
            {t("websites.deleteUnpublishFirst")}
          </p>
        ) : (
          <div className="mt-4">
            <Input label={t("websites.deleteTypeSlug", { slug: tenant.slug })} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </Dialog>
    </Card>
  );
}
