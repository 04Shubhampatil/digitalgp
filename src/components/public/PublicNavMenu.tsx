"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

export interface PublicNavLink {
  href: string;
  label: string;
}
export interface PublicNavGroupView {
  /** null = render the single link directly */
  label: string | null;
  links: PublicNavLink[];
}

/** Desktop: inline links + hover/focus dropdowns. Mobile: toggle button + stacked list. */
export function PublicNavMenu({ groups, menuLabel }: { groups: PublicNavGroupView[]; menuLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
        {groups.map((g, i) =>
          g.label === null ? (
            g.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "rounded px-3 py-2 text-sm font-medium hover:bg-surface-soft",
                  isActive(l.href) ? "text-primary" : "text-ink",
                )}
              >
                {l.label}
              </Link>
            ))
          ) : (
            <details key={i} className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded px-3 py-2 text-sm font-medium text-ink hover:bg-surface-soft [&::-webkit-details-marker]:hidden">
                {g.label}
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="absolute left-0 z-20 mt-1 min-w-52 rounded-card border border-line bg-surface p-1 shadow-lg">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn(
                        "block rounded px-3 py-2 text-sm hover:bg-surface-soft",
                        isActive(l.href) ? "font-semibold text-primary" : "text-ink",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ),
        )}
      </nav>

      <button
        type="button"
        className="rounded p-2 text-ink hover:bg-surface-soft lg:hidden"
        aria-expanded={open}
        aria-controls="public-mobile-nav"
        aria-label={menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>

      {open && (
        <nav
          id="public-mobile-nav"
          aria-label="Primary"
          className="absolute inset-x-0 top-full border-b border-line bg-surface p-4 shadow-lg lg:hidden"
        >
          {groups.map((g, i) => (
            <div key={i} className="mb-3">
              {g.label && <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{g.label}</p>}
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={cn("block rounded px-2 py-2 text-sm", isActive(l.href) ? "font-semibold text-primary" : "text-ink")}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </>
  );
}
