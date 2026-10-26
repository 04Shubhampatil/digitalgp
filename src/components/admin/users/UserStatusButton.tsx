"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UserStatus } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { users } from "@/lib/api/admin";

export function UserStatusButton({ userId, status, disabled }: { userId: string; status: UserStatus; disabled?: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next: UserStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  return (
    <div className="flex items-center gap-3">
      <Button
        variant={next === "SUSPENDED" ? "danger" : "primary"}
        disabled={disabled}
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              await users.update(userId, { status: next });
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : tc("errorGeneric"));
            }
          })
        }
      >
        {next === "SUSPENDED" ? t("users.suspend") : t("users.activate")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
