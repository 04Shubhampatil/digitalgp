"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/lib/api/auth";

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await logout();
          } finally {
            router.replace("/login");
            router.refresh();
          }
        })
      }
      className="rounded p-1 text-cream/70 hover:bg-cream/10 hover:text-cream disabled:opacity-50"
    >
      <LogOut className="size-4" aria-hidden />
    </button>
  );
}
