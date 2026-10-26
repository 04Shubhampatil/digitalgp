"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** Shown when the backend is unreachable or fails while rendering a public page. */
export default function TenantError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-ink">{t("errorGeneric")}</h1>
      {error.digest && <p className="text-xs text-muted">ref: {error.digest}</p>}
      <Button onClick={reset}>{t("retry")}</Button>
    </main>
  );
}
