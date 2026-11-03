"use client";

import { Menu, X } from "lucide-react";
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
      {/* Figma navbar (375:13489): each item is a 135px slot, 14px semibold #414141, no chevrons. */}
      <nav aria-label="Primary" className="hidden items-start lg:flex">
        {groups.map((g, i) =>
          g.label === null ? (
            g.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "flex w-[135px] justify-center border-b-2 py-2.5 text-center text-[14px] leading-5 font-semibold tracking-[0.1px] hover:border-primary-alt/40",
                  isActive(l.href) ? "border-primary-alt text-primary-alt" : "border-transparent text-[#414141]",
                )}
              >
                {l.label}
              </Link>
            ))
          ) : (
            <details key={i} className="group relative">
              <summary
                className={cn(
                  "flex w-[135px] cursor-pointer list-none justify-center border-b-2 py-2.5 text-center text-[14px] leading-5 font-semibold tracking-[0.1px] hover:border-primary-alt/40 [&::-webkit-details-marker]:hidden",
                  g.links.some((l) => isActive(l.href)) ? "border-primary-alt text-primary-alt" : "border-transparent text-[#414141]",
                )}
              >
                {g.label}
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
