"use client";

import { useTranslations } from "next-intl";
import type { UseFormRegisterReturn } from "react-hook-form";
import type { AccountValues } from "@/components/admin/websites/accountForm";
import { Input } from "@/components/ui/Input";

type Errors = Partial<Record<keyof AccountValues, { message?: string } | undefined>> | undefined;

/**
 * Name, email, optional phone and password choice (typed, or generate a temporary one) for one account.
 * `reg` binds a field to the parent react-hook-form; `generate` is that form's current value of the toggle.
 */
export function AccountFields({ reg, generate, errors }: { reg: (field: keyof AccountValues) => UseFormRegisterReturn; generate: boolean; errors?: Errors }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label={t("websiteSetup.accountName")} autoComplete="off" error={errors?.name?.message} {...reg("name")} />
      <Input label={t("users.email")} type="email" autoComplete="off" error={errors?.email?.message} {...reg("email")} />
      <Input label={`${t("users.phone")} (${tc("optional")})`} type="tel" autoComplete="off" error={errors?.phone?.message} {...reg("phone")} />
      <div className="flex flex-col justify-end gap-1">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" className="size-4 accent-primary" {...reg("generate")} />
          {t("websiteSetup.generatePassword")}
        </label>
        {generate && <p className="text-xs text-muted">{t("websiteSetup.generateHint")}</p>}
      </div>
      {!generate && (
        <div className="sm:col-span-2">
          <Input
            label={t("websiteSetup.typedPassword")}
            type="password"
            autoComplete="new-password"
            hint={t("websiteSetup.typedPasswordHint")}
            error={errors?.password?.message}
            {...reg("password")}
          />
        </div>
      )}
    </div>
  );
}
