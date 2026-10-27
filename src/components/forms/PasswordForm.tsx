"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changePassword, resetPassword } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";

/** Mirrors passwordSchema in src/lib/validation.ts. */
const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Password must contain letters and numbers");

const schema = z
  .object({ currentPassword: z.string(), newPassword: password, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords do not match", path: ["confirm"] });
type FormValues = z.infer<typeof schema>;

export type PasswordFormMode = { kind: "reset"; token: string } | { kind: "change" };

/**
 * Figma 15 "Reset Password" (token from the emailed link → POST /auth/reset-password) and the
 * profile "change password" (POST /auth/change-password, needs the current password).
 */
export function PasswordForm({ mode }: { mode: PasswordFormMode }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirm: "" } });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      if (mode.kind === "reset") {
        await resetPassword(mode.token, values.newPassword);
        setDone(true);
        setTimeout(() => router.replace("/login"), 1500);
      } else {
        if (!values.currentPassword) return setError("currentPassword", { message: t("required") });
        await changePassword(values.currentPassword, values.newPassword);
        setDone(true);
      }
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError(i.path === "password" ? "newPassword" : (i.path as keyof FormValues), { message: i.message });
        return;
      }
      if (isApiError(err, "BAD_REQUEST")) return setFormError(mode.kind === "reset" ? t("resetInvalid") : err.message);
      if (isApiError(err, "UNAUTHENTICATED")) return setFormError(t("currentWrong"));
      if (isApiError(err, "NETWORK_ERROR")) return setFormError(t("errorNetwork"));
      setFormError(err instanceof Error ? err.message : t("errorNetwork"));
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="rounded-input bg-success-soft px-4 py-3 text-sm text-success">
          {mode.kind === "reset" ? t("resetDone") : t("changeDone")}
        </p>
        {mode.kind === "reset" && (
          <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
            {t("backToLogin")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {mode.kind === "change" && (
        <Input label={t("currentPassword")} type="password" autoComplete="current-password" leading={<Lock className="size-4" aria-hidden />} error={errors.currentPassword?.message} {...register("currentPassword")} />
      )}
      <Input label={t("newPassword")} type="password" autoComplete="new-password" hint={t("passwordPolicy")} leading={<Lock className="size-4" aria-hidden />} error={errors.newPassword?.message} {...register("newPassword")} />
      <Input label={t("confirmPassword")} type="password" autoComplete="new-password" leading={<Lock className="size-4" aria-hidden />} error={errors.confirm?.message} {...register("confirm")} />
      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        {mode.kind === "reset" ? t("setPassword") : t("changePassword")}
      </Button>
    </form>
  );
}
