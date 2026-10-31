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
import { Select } from "@/components/ui/Select";
import { login, logout, me } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";

const ROLES = ["SUPER_ADMIN", "TALUKA_ADMIN", "BLOCK_ADMIN", "GP_ADMIN", "DATA_ENTRY_OPERATOR"] as const;

const schema = z.object({
  role: z.enum(ROLES, { error: "Select your role" }),
  email: z.email(),
  password: z.string().min(1),
  rememberMe: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm({ redirectTo = "/admin/dashboard" }: { redirectTo?: string }) {
  const t = useTranslations("auth");
  const tRole = useTranslations("admin.role");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    watch,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: undefined as unknown as FormValues["role"], email: "", password: "", rememberMe: false },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const { role, ...credentials } = values;
      await login(credentials);
      // The chosen role must be one this account actually holds; otherwise sign out again.
      const current = await me();
      if (!current.assignments.some((a) => a.role === role && !a.revokedAt)) {
        await logout();
        return setFormError(t("roleMismatch"));
      }
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
      <Select
        label={t("loginAs")}
        placeholder={t("roleNone")}
        options={ROLES.map((r) => ({ value: r, label: tRole(r) }))}
        error={errors.role?.message}
        leading={
          watch("role") ? (
            <span aria-hidden className="flex size-6 items-center justify-center rounded-[4px] bg-success-soft text-xs font-semibold text-primary">
              {tRole(watch("role") as (typeof ROLES)[number]).charAt(0).toUpperCase()}
            </span>
          ) : undefined
        }
        {...register("role")}
      />
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
