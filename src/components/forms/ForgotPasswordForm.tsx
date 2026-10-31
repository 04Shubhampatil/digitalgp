"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { forgotPassword } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";

const schema = z.object({ email: z.email() });
type FormValues = z.infer<typeof schema>;

/** Figma 14 "Forgot Password" → POST /auth/forgot-password (always 200; message is generic by design). */
export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const res = await forgotPassword(values.email);
      setDone(res.message || t("forgotSent"));
    } catch (err) {
      if (isApiError(err, "RATE_LIMITED")) return setFormError(t("errorRateLimited", { seconds: err.retryAfterSeconds ?? 3600 }));
      if (isApiError(err, "NETWORK_ERROR")) return setFormError(t("errorNetwork"));
      setFormError(err instanceof Error ? err.message : t("errorNetwork"));
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="rounded-input bg-success-soft px-4 py-3 text-sm text-success">
          {done}
        </p>
        <Link href="/login" className="flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ChevronLeft className="size-3.5" aria-hidden /> {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Input label={t("email")} type="email" autoComplete="email" placeholder={t("emailPlaceholder")} error={errors.email?.message} {...register("email")} />
      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        {t("sendResetLink")}
      </Button>
      <Link href="/login" className="flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ChevronLeft className="size-3.5" aria-hidden /> {t("backToLogin")}
      </Link>
      <p className="rounded-[8px] bg-success-soft px-5 py-8 text-center text-[13px] text-primary">{t("forgotNote")}</p>
    </form>
  );
}
