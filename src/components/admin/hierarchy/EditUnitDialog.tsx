"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AdminUnitDto } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { hierarchy } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

/** Rename / re-code a unit → PATCH /hierarchy/units/:id (`hierarchy:manage`). */
export function EditUnitDialog({ unit }: { unit: AdminUnitDto }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({ slug: unit.slug, nameEn: unit.nameEn, nameMr: unit.nameMr, code: unit.code ?? "" });
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((s) => ({ ...s, [k]: e.target.value }));

  const save = () =>
    start(async () => {
      setError(null);
      try {
        await hierarchy.update(unit.id, {
          slug: values.slug.trim(),
          nameEn: values.nameEn.trim(),
          nameMr: values.nameMr.trim(),
          code: values.code.trim() || null,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(
          isApiError(err, "VALIDATION_ERROR")
            ? err.issues.map((i) => `${i.path}: ${i.message}`).join(" · ")
            : err instanceof Error
              ? err.message
              : tc("errorGeneric"),
        );
      }
    });

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {tc("edit")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("hierarchy.editUnit")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button loading={pending} onClick={save}>
              {tc("save")}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("hierarchy.nameEn")} value={values.nameEn} onChange={set("nameEn")} />
          <Input label={t("hierarchy.nameMr")} lang="mr" value={values.nameMr} onChange={set("nameMr")} />
          <Input label={t("hierarchy.unitCode")} value={values.code} onChange={set("code")} />
          <Input label={t("hierarchy.slug")} hint={t("hierarchy.slugHint")} value={values.slug} onChange={set("slug")} />
          {error && (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
