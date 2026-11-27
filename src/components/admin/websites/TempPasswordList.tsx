"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export interface TempPasswordEntry {
  /** Who the password belongs to (name, role). */
  label: string;
  email: string;
  /** null when the creator typed the password themselves. */
  password: string | null;
}

/** Temporary passwords shown once after creation, each with a copy button (same look as the Create User dialog). */
export function TempPasswordList({ entries }: { entries: TempPasswordEntry[] }) {
  const t = useTranslations("admin.websiteSetup");
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <ul className="grid gap-4">
      {entries.map((e) => (
        <li key={e.email} className="rounded-card border border-line p-3">
          <p className="text-sm font-semibold text-ink">{e.label}</p>
          <p className="text-xs break-all text-muted">{e.email}</p>
          {e.password ? (
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-input border border-line bg-surface-table px-3 py-2 font-mono text-sm break-all">{e.password}</code>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(e.password ?? "");
                  setCopied(e.email);
                }}
              >
                <Copy className="size-4" aria-hidden /> {copied === e.email ? t("copied") : t("copy")}
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">{t("passwordSetByYou")}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
