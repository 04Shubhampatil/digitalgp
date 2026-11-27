"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminUnitDto } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useLocale } from "next-intl";
import type { UiLocale } from "@/i18n/config";
import { localName } from "@/i18n/text";
import { hierarchy } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

/**
 * Delete an empty taluka / Gram Panchayat → DELETE /hierarchy/units/:id (`hierarchy:manage`). The server refuses while
 * the unit still has units inside it, a website, users or content, and says which; that message is shown here.
 */
export function DeleteUnitButton({ unit }: { unit: AdminUnitDto }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale() as UiLocale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const name = localName(unit.nameEn, unit.nameMr, locale, unit.slug);

  const remove = () =>
    start(async () => {
      setError(null);
      try {
        await hierarchy.remove(unit.id);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(isApiError(err, "CONFLICT") || isApiError(err, "BAD_REQUEST") ? err.message : err instanceof Error ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        {tc("delete")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("hierarchy.deleteUnit")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              {tc("delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{t("hierarchy.deleteConfirm", { name })}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </Dialog>
    </>
  );
}
