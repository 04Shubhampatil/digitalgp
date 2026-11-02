"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  /** Hidden when false (capability missing). Defaults to visible. */
  show?: boolean;
  /** Active only on this exact path (e.g. a dashboard whose sub-pages are separate items). */
  exact?: boolean;
  /** Signs the user out instead of navigating. */
  action?: "logout";
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const signOut = () =>
    start(async () => {
      try {
        await logout();
      } finally {
        router.replace("/login");
        router.refresh();
      }
    });
  return (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-2.5 py-3">
      {groups.map((group, gi) => {
        const items = group.items.filter((i) => i.show !== false);
        if (items.length === 0) return null;
        return (
          <div key={gi} className="mb-1">
            {group.label && (
              <p className="px-3 py-1.5 text-[10px] uppercase leading-4 text-accent">{group.label}</p>
            )}
            <ul>
              {items.map((item) => {
                if (item.action === "logout") {
                  return (
                    <li key="logout">
                      <button
                        type="button"
                        onClick={signOut}
                        disabled={pending}
                        className="flex w-full items-center gap-2.5 rounded-[4px] border-l-[3px] border-transparent py-1.5 pr-3 pl-[15px] text-left font-brand-sub text-[11px] leading-4 text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream disabled:opacity-50"
                      >
                        <CircleHelp aria-hidden className="size-3" />
                        {item.label}
                      </button>
                    </li>
                  );
                }
                const active = pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[4px] border-l-[3px] py-1.5 pr-3 pl-[15px] font-brand-sub text-[11px] leading-4 transition-colors",
                        active
                          ? "border-accent bg-cream/15 font-semibold text-cream"
                          : "border-transparent text-cream/80 hover:bg-cream/10 hover:text-cream",
                      )}
                    >
                      <CircleHelp aria-hidden className="size-3" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
