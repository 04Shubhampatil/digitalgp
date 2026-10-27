"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
  rememberMe: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm({ redirectTo = "/admin/dashboard" }: { redirectTo?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await login(values);
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const issue of err.issues) {
          if (issue.path === "email" || issue.path === "password") setError(issue.path, { message: issue.message });
        }
        return;
      }
      if (isApiError(err, "UNAUTHENTICATED")) return setFormError(t("errorInvalid"));
      if (isApiError(err, "FORBIDDEN")) return setFormError(t("errorSuspended"));
      if (isApiError(err, "RATE_LIMITED")) return setFormError(t("errorRateLimited", { seconds: err.retryAfterSeconds ?? 60 }));
      if (isApiError(err, "NETWORK_ERROR")) return setFormError(t("errorNetwork"));
      setFormError(err instanceof Error ? err.message : t("errorInvalid"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Input
        label={t("email")}
        type="email"
        autoComplete="email"
        placeholder={t("emailPlaceholder")}
        leading={<AtSign className="size-4" aria-hidden />}
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label={t("password")}
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder={t("passwordPlaceholder")}
        leading={<Lock className="size-4" aria-hidden />}
        trailing={
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-sm font-semibold text-primary"
            aria-pressed={showPassword}
          >
            {showPassword ? t("hide") : t("show")}
          </button>
        }
        error={errors.password?.message}
        {...register("password")}
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-ink-strong">
          <input type="checkbox" className="size-[18px] rounded-[4px] border-line accent-primary" {...register("rememberMe")} />
          {t("rememberMe")}
        </label>
        <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
          {t("forgotPassword")}
        </Link>
      </div>

      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        {isSubmitting ? t("signingIn") : t("signIn")}
      </Button>

      <p className="text-center text-xs text-muted">{t("secureNote")}</p>
    </form>
  );
}
